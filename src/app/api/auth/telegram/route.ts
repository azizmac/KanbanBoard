import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyTelegramAuth } from "@/lib/telegram-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(new URL(req.url).searchParams.entries());

  if (!verifyTelegramAuth(params)) {
    redirect("/login?error=telegram");
  }

  const telegramId = params.id;
  const tgUsername = params.username?.toLowerCase();
  const name =
    [params.first_name, params.last_name].filter(Boolean).join(" ").trim() ||
    tgUsername ||
    "Пользователь";

  // 1) Already linked → sign in.
  const linked = await prisma.user.findUnique({ where: { telegramId } });
  if (linked) {
    if (!linked.active) redirect("/login?error=disabled");
    await createSession(linked.id);
    redirect("/board");
  }

  // 2) Pre-added by an admin (matching @username, not yet linked) → link & sign in.
  if (tgUsername) {
    const byUsername = await prisma.user.findFirst({
      where: { username: { equals: tgUsername, mode: "insensitive" }, telegramId: null, active: true },
    });
    if (byUsername) {
      await prisma.user.update({ where: { id: byUsername.id }, data: { telegramId } });
      await createSession(byUsername.id);
      redirect("/board");
    }
  }

  // 3) Owner bootstrap: first login of ADMIN_TELEGRAM_USERNAME on an empty DB.
  const ownerHandle = process.env.ADMIN_TELEGRAM_USERNAME?.toLowerCase();
  if (ownerHandle && tgUsername && tgUsername === ownerHandle) {
    const owner = await prisma.user.create({
      data: { telegramId, username: tgUsername, name, role: "ADMIN" },
    });
    await createSession(owner.id);
    redirect("/board");
  }

  // Otherwise: not a known team member.
  redirect("/login?error=notlinked");
}
