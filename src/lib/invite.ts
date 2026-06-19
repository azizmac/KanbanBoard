import { createHmac } from "node:crypto";

// Signed, stateless team-invite tokens. An admin generates a link
// `https://<app>/join/<token>`; opening it lets the next Telegram login
// self-provision with the embedded role. No DB row needed.

type InviteRole = "MEMBER" | "MANAGER";

function secret() {
  return process.env.SESSION_SECRET || "insecure-dev-secret";
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url").slice(0, 32);
}

export function makeInviteToken(role: InviteRole = "MEMBER", ttlDays = 7): string {
  const exp = Date.now() + ttlDays * 86_400_000;
  const payload = Buffer.from(`${role}|${exp}`).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyInviteToken(token: string): { role: InviteRole } | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig || sign(payload) !== sig) return null;
  try {
    const [role, expStr] = Buffer.from(payload, "base64url").toString("utf8").split("|");
    const exp = Number(expStr);
    if (!exp || Date.now() > exp) return null;
    if (role !== "MEMBER" && role !== "MANAGER") return null;
    return { role };
  } catch {
    return null;
  }
}
