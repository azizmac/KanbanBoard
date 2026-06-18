import { createHash, createHmac } from "node:crypto";

/**
 * Verify the payload from the Telegram Login Widget.
 * https://core.telegram.org/widgets/login#checking-authorization
 */
export function verifyTelegramAuth(data: Record<string, string>): boolean {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;

  const { hash, ...rest } = data;
  if (!hash) return false;

  const checkString = Object.keys(rest)
    .filter((k) => rest[k] !== undefined && rest[k] !== "")
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join("\n");

  const secretKey = createHash("sha256").update(token).digest();
  const hmac = createHmac("sha256", secretKey).update(checkString).digest("hex");
  if (hmac !== hash) return false;

  // Reject stale logins (older than 1 day).
  const authDate = Number(rest.auth_date ?? 0);
  if (!authDate || Date.now() / 1000 - authDate > 86_400) return false;

  return true;
}
