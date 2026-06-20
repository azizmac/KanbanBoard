import { prisma } from "./prisma";
import { saveFile } from "./storage";

// Pulls a user's Telegram profile photo through the relay (reachable from RU)
// and stores it in MinIO, served from our own domain at /api/avatar/<id>.
// Direct t.me CDN URLs often don't load from RU, hence the download.

const API = (process.env.TELEGRAM_API_ROOT || "https://api.telegram.org").replace(/\/$/, "");
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function tg<T>(method: string, params: Record<string, string | number>): Promise<T | null> {
  if (!TOKEN) return null;
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  try {
    const res = await fetch(`${API}/bot${TOKEN}/${method}?${qs}`);
    const json = (await res.json()) as { ok: boolean; result?: T };
    return json.ok ? (json.result ?? null) : null;
  } catch {
    return null;
  }
}

/**
 * Fetch the user's current Telegram avatar and store it. Returns true if updated.
 * Best-effort: only works for users the bot can see (i.e. who've used the bot).
 */
export async function syncAvatar(userId: string): Promise<boolean> {
  if (!TOKEN) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { telegramId: true, avatarUrl: true } });
  if (!user?.telegramId) return false;

  // Drop a stale external (t.me) URL → falls back to initials instead of a
  // possibly-broken image when no photo is reachable.
  const clearStale = async () => {
    if (user.avatarUrl && !user.avatarUrl.startsWith("/api/avatar")) {
      await prisma.user.update({ where: { id: userId }, data: { avatarUrl: null } });
    }
  };

  try {
    const photos = await tg<{ total_count: number; photos: { file_id: string; width: number }[][] }>(
      "getUserProfilePhotos",
      { user_id: user.telegramId, limit: 1 },
    );
    if (!photos) return false; // transient API hiccup — leave as-is
    const sizes = photos.photos?.[0];
    if (photos.total_count === 0 || !sizes?.length) {
      await clearStale();
      return false;
    }

    const pick = sizes[sizes.length - 1]; // largest available size
    const file = await tg<{ file_path: string }>("getFile", { file_id: pick.file_id });
    if (!file?.file_path) return false;

    const res = await fetch(`${API}/file/bot${TOKEN}/${file.file_path}`);
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());

    await saveFile(`avatars/${userId}.jpg`, buf, "image/jpeg");
    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: `/api/avatar/${userId}?v=${Date.now()}` },
    });
    return true;
  } catch {
    return false;
  }
}
