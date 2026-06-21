import { cookies } from "next/headers";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Poll target for the bot deep-link sign-in. Mints the session only once the bot
// has flipped the nonce to "ready" (binding it to the Telegram-resolved user).
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { nonce?: unknown };
  const nonce = typeof body.nonce === "string" ? body.nonce : "";
  if (!nonce) return Response.json({ status: "expired" });

  const row = await prisma.loginNonce.findUnique({ where: { nonce } });
  if (!row || row.expiresAt < new Date()) return Response.json({ status: "expired" });

  if (row.status === "denied") {
    return Response.json({
      status: "denied",
      message:
        row.error === "disabled"
          ? "Ваш аккаунт отключён. Обратитесь к администратору."
          : "Вас ещё нет в команде — попросите ссылку-приглашение у администратора.",
    });
  }

  if (row.status === "ready" && row.userId) {
    // single use: consume before minting the session
    await prisma.loginNonce.update({ where: { nonce }, data: { status: "used" } });
    await createSession(row.userId);
    const store = await cookies();
    store.delete("kanban_invite");
    return Response.json({ status: "ok" });
  }

  return Response.json({ status: "pending" });
}
