import { createHmac } from "node:crypto";

// Signed, stateless deep-link tokens to connect a Telegram chat to an app user
// via `https://t.me/<bot>?start=<token>`. The token must be base64url-only (no
// separators) because Telegram's start param allows only A-Za-z0-9_- (max 64).
// Layout: 24-char sig + payload.

const SIG_LEN = 24;

function secret() {
  return process.env.SESSION_SECRET || "insecure-dev-secret";
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url").slice(0, SIG_LEN);
}

export function makeLinkToken(userId: string): string {
  const payload = Buffer.from(userId).toString("base64url");
  return sign(payload) + payload;
}

export function verifyLinkToken(token: string): string | null {
  const t = token.trim();
  if (t.length <= SIG_LEN) return null;
  const sig = t.slice(0, SIG_LEN);
  const payload = t.slice(SIG_LEN);
  if (sign(payload) !== sig) return null;
  try {
    return Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }
}
