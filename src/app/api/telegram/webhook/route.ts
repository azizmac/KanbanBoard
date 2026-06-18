import { webhookCallback } from "grammy";
import { createBot } from "@/lib/bot";

export const runtime = "nodejs";
// Telegram needs a fast reply; never cache.
export const dynamic = "force-dynamic";

const bot = createBot();
const handler = bot
  ? webhookCallback(bot, "std/http", {
      secretToken: process.env.TELEGRAM_WEBHOOK_SECRET || undefined,
    })
  : null;

// Lazily initialise the bot once per serverless instance.
let initPromise: Promise<void> | null = null;

export async function POST(req: Request) {
  if (!bot || !handler) {
    return new Response("Telegram is not configured", { status: 503 });
  }
  if (!initPromise) initPromise = bot.init();
  await initPromise;
  return handler(req);
}
