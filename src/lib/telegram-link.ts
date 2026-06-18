import { createHmac } from "node:crypto";

// Signed, stateless deep-link tokens used to connect a Telegram chat to an
// app user via `https://t.me/<bot>?start=<token>`. No DB row needed.

function secret() {
  return process.env.SESSION_SECRET || "insecure-dev-secret";
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url").slice(0, 24);
}

export function makeLinkToken(userId: string): string {
  const payload = Buffer.from(userId).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyLinkToken(token: string): string | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  if (sign(payload) !== sig) return null;
  try {
    return Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }
}
