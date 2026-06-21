import { verifyInviteToken } from "./invite";
import { prisma } from "./prisma";

// Resolve a Telegram identity to an app user, creating/linking accounts the same
// way for both sign-in paths: the official login widget (/api/auth/telegram) and
// the bot deep-link flow (RU-friendly). Keep this the single source of truth so
// the two paths never drift. No cookies / sessions here — callers handle those.

export type TgIdentity = {
  telegramId: string;
  username?: string | null;
  name: string;
};

export type ResolveResult =
  | { ok: true; userId: string }
  | { ok: false; error: "disabled" | "notlinked" };

export async function resolveTelegramLogin(
  idy: TgIdentity,
  inviteToken?: string | null,
): Promise<ResolveResult> {
  const telegramId = idy.telegramId;
  const tgUsername = idy.username?.toLowerCase() || undefined;
  const name = idy.name?.trim() || tgUsername || "Пользователь";

  // 1) Already linked → sign in.
  const linked = await prisma.user.findUnique({ where: { telegramId } });
  if (linked) {
    if (!linked.active) return { ok: false, error: "disabled" };
    return { ok: true, userId: linked.id };
  }

  // 2) Pre-added by an admin (matching @username, not yet linked) → link & sign in.
  if (tgUsername) {
    const byUsername = await prisma.user.findFirst({
      where: { username: { equals: tgUsername, mode: "insensitive" }, telegramId: null, active: true },
    });
    if (byUsername) {
      await prisma.user.update({ where: { id: byUsername.id }, data: { telegramId } });
      return { ok: true, userId: byUsername.id };
    }
  }

  // 3) Owner bootstrap: first login of ADMIN_TELEGRAM_USERNAME on an empty DB.
  const ownerHandle = process.env.ADMIN_TELEGRAM_USERNAME?.toLowerCase();
  if (ownerHandle && tgUsername && tgUsername === ownerHandle) {
    const owner = await prisma.user.create({
      data: { telegramId, username: tgUsername, name, role: "ADMIN" },
    });
    return { ok: true, userId: owner.id };
  }

  // 4) Self-provision: a valid invite link, or globally-open signup.
  const invite = inviteToken ? verifyInviteToken(inviteToken) : null;
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
        // t.me CDN URL which may not load here.
      },
    });
    // invite into a specific access group (best-effort)
    if (invite?.groupId) {
      await prisma.group
        .update({ where: { id: invite.groupId }, data: { members: { connect: { id: user.id } } } })
        .catch(() => {});
    }
    return { ok: true, userId: user.id };
  }

  // Otherwise: not a known team member.
  return { ok: false, error: "notlinked" };
}
