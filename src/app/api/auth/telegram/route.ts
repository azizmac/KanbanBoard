import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createSession } from "@/lib/auth";
import { verifyInviteToken } from "@/lib/invite";
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
    redirect("/home");
  }

  // 2) Pre-added by an admin (matching @username, not yet linked) → link & sign in.
  if (tgUsername) {
    const byUsername = await prisma.user.findFirst({
      where: { username: { equals: tgUsername, mode: "insensitive" }, telegramId: null, active: true },
    });
    if (byUsername) {
      await prisma.user.update({ where: { id: byUsername.id }, data: { telegramId } });
      await createSession(byUsername.id);
      redirect("/home");
    }
  }

  // 3) Owner bootstrap: first login of ADMIN_TELEGRAM_USERNAME on an empty DB.
  const ownerHandle = process.env.ADMIN_TELEGRAM_USERNAME?.toLowerCase();
  if (ownerHandle && tgUsername && tgUsername === ownerHandle) {
    const owner = await prisma.user.create({
      data: { telegramId, username: tgUsername, name, role: "ADMIN" },
    });
    await createSession(owner.id);
    redirect("/home");
  }

  // 4) Self-provision: a valid invite link, or globally-open signup.
  const store = await cookies();
  const inviteTok = store.get("kanban_invite")?.value;
  const invite = inviteTok ? verifyInviteToken(inviteTok) : null;
  // Open signup is ON by default: anyone can log in and gets a basic MEMBER
  // account (sees only their own boards + ones they're added to). Set
  // OPEN_SIGNUP=false to require an invite link instead.
  const openSignup = process.env.OPEN_SIGNUP !== "false";
  if (invite || openSignup) {
    // keep @username only if it's not already taken
    let username: string | null = null;
    if (tgUsername) {
      const taken = await prisma.user.findFirst({
        where: { username: { equals: tgUsername, mode: "insensitive" } },
      });
      username = taken ? null : tgUsername;
    }
    const user = await prisma.user.create({
      data: {
        telegramId,
        username,
        name,
        role: invite?.role ?? "MEMBER",
        // avatar is pulled into MinIO by the bot (reliable from RU), not the
        // t.me CDN URL from the widget which may not load here.
      },
    });
    // invite into a specific access group (best-effort)
    if (invite?.groupId) {
      await prisma.group
        .update({ where: { id: invite.groupId }, data: { members: { connect: { id: user.id } } } })
        .catch(() => {});
    }
    if (inviteTok) store.delete("kanban_invite");
    await createSession(user.id);
    redirect("/home");
  }

  // Otherwise: not a known team member.
  redirect("/login?error=notlinked");
}
