import { createHmac } from "node:crypto";

// Signed code linking a Telegram group chat to a board. Used two ways:
//   1) deep link  https://t.me/<bot>?startgroup=<code>  (one-tap: adds the bot
//      to a group and sends /start <code> there)
//   2) manual     /link <code>  in the group
// The code is base64url-only (no separators) so it's valid as a startgroup param
// (Telegram allows only A-Za-z0-9_- there). Layout: 24-char sig + payload.

const SIG_LEN = 24;

function secret() {
  return process.env.SESSION_SECRET || "insecure-dev-secret";
}
function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url").slice(0, SIG_LEN);
}

export function makeBoardLinkCode(boardId: string): string {
  const payload = Buffer.from(boardId).toString("base64url");
  return sign(payload) + payload;
}

export function verifyBoardLinkCode(code: string): string | null {
  const c = code.trim();
  if (c.length <= SIG_LEN) return null;
  const sig = c.slice(0, SIG_LEN);
  const payload = c.slice(SIG_LEN);
  if (sign(payload) !== sig) return null;
  try {
    return Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }
}
