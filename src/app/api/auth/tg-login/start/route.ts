import { cookies } from "next/headers";
import { createLoginNonce } from "@/lib/tg-login";

export const runtime = "nodejs";

// Begin a bot deep-link sign-in. Returns the t.me link the browser should open
// and the nonce it should poll. Carries the invite cookie (if any) onto the
// nonce so role/group survive the round-trip through Telegram.
export async function POST() {
  const username = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "");
  if (!username) {
    return Response.json({ error: "bot-unconfigured" }, { status: 500 });
  }
  const store = await cookies();
  const inviteTok = store.get("kanban_invite")?.value ?? null;
  const nonce = await createLoginNonce(inviteTok);
  return Response.json({ nonce, url: `https://t.me/${username}?start=login_${nonce}` });
}
