import { randomBytes } from "node:crypto";
import { prisma } from "./prisma";

// Bot deep-link sign-in: the browser mints a one-time nonce, opens
// t.me/<bot>?start=login_<nonce>, then polls until the bot resolves the user.
// 5-minute TTL, single use.

const TTL_MS = 5 * 60 * 1000;

export async function createLoginNonce(inviteToken: string | null) {
  // opportunistic GC so the table doesn't grow without a cron
  await prisma.loginNonce.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {});
  const nonce = randomBytes(16).toString("hex"); // 32 hex chars, A-Za-z0-9 only
  await prisma.loginNonce.create({
    data: { nonce, inviteToken, expiresAt: new Date(Date.now() + TTL_MS) },
  });
  return nonce;
}
