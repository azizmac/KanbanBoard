import webpush from "web-push";
import { prisma } from "./prisma";

// Web Push (PWA). The VAPID keypair is generated once and kept in the DB
// (PushConfig singleton), so this needs zero env configuration.

let cached: { publicKey: string; privateKey: string } | null = null;

async function getVapidKeys() {
  if (cached) return cached;
  const existing = await prisma.pushConfig.findUnique({ where: { id: "default" } });
  const cfg =
    existing ??
    (await (async () => {
      const keys = webpush.generateVAPIDKeys();
      // upsert guards against a race where two requests generate at once.
      return prisma.pushConfig.upsert({
        where: { id: "default" },
        create: { id: "default", publicKey: keys.publicKey, privateKey: keys.privateKey },
        update: {},
      });
    })());
  cached = { publicKey: cfg.publicKey, privateKey: cfg.privateKey };
  return cached;
}

export async function getVapidPublicKey(): Promise<string> {
  return (await getVapidKeys()).publicKey;
}

// VAPID subject must be a mailto: or https URL.
const SUBJECT = (process.env.NEXT_PUBLIC_APP_URL || "https://kanban.freshdv.ru").replace(/\/$/, "");

type BrowserSub = { endpoint: string; keys: { p256dh: string; auth: string } };

export async function saveSubscription(userId: string, sub: BrowserSub) {
  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  });
}

export async function deleteSubscription(endpoint: string) {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}

export type PushPayload = { title: string; body: string; url?: string };

/** Send a push to every device the user has registered. Best-effort; prunes
 *  expired subscriptions (404/410). Never throws. */
export async function sendPush(userId: string, payload: PushPayload): Promise<void> {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;
  const keys = await getVapidKeys();
  webpush.setVapidDetails(SUBJECT, keys.publicKey, keys.privateKey);
  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        );
      } catch (e: unknown) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        } else {
          console.error("[push] send failed:", code ?? "", e instanceof Error ? e.message : e);
        }
      }
    }),
  );
}
