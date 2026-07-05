import { createHash, randomBytes } from "node:crypto";

// Plaintext tokens are prefixed so they're recognisable (and greppable if leaked).
export const TOKEN_PREFIX = "gsk_";

export function hashToken(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}

/** A fresh personal webhook token: plaintext (shown to the user ONCE) + its hash
 *  (the only thing persisted). */
export function newWebhookToken(): { plain: string; hash: string } {
  const plain = TOKEN_PREFIX + randomBytes(24).toString("hex");
  return { plain, hash: hashToken(plain) };
}

/** A per-user token (vs. the global system secret) starts with the prefix. */
export function isPersonalToken(value: string): boolean {
  return value.startsWith(TOKEN_PREFIX);
}
