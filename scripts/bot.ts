// Telegram bot WORKER. Long polling does not work through the Cloudflare relay
// (the Worker can't hold a 30s getUpdates), so the bot runs in WEBHOOK mode:
// Telegram pushes updates to <APP_URL>/api/telegram/webhook (handled by the app),
// and this process just (re)registers the webhook, sets the command menu, and
// runs the daily reminder digest. Outbound calls go through TELEGRAM_API_ROOT.
import "dotenv/config";
import { BOT_COMMANDS, createBot, myTasksMessage } from "../src/lib/bot";
import { prisma } from "../src/lib/prisma";

const bot = createBot();
if (!bot) {
  console.error("TELEGRAM_BOT_TOKEN is not set — nothing to run.");
  process.exit(1);
}
if (process.env.TELEGRAM_API_ROOT) {
  console.log(`[bot] using Telegram API proxy: ${process.env.TELEGRAM_API_ROOT}`);
}

const HTML = { parse_mode: "HTML", link_preview_options: { is_disabled: true } } as const;

/** DM each linked user a digest of their due-soon/overdue tasks. */
async function sendReminders() {
  const users = await prisma.user.findMany({
    where: { telegramId: { not: null }, active: true },
    select: { id: true, telegramId: true },
  });
  const horizon = new Date(Date.now() + 24 * 3600 * 1000);
  let sent = 0;
  for (const u of users) {
    const burning = await prisma.task.count({
      where: { assigneeId: u.id, column: { name: { not: "Готово" } }, dueDate: { lt: horizon } },
    });
    if (burning === 0) continue;
    const msg = await myTasksMessage(u.id, true);
    await bot!.api.sendMessage(u.telegramId!, msg, HTML).catch((e) => console.error("[reminders]", e));
    sent += 1;
  }
  if (sent) console.log(`[reminders] sent ${sent} digest(s)`);
}

// Once a day at REMINDER_HOUR (TZ=Europe/Moscow set on the bot service in compose).
const REMINDER_HOUR = Number(process.env.REMINDER_HOUR ?? 9);
let lastReminderDay = "";
function startReminderLoop() {
  setInterval(
    () => {
      const now = new Date();
      const day = now.toISOString().slice(0, 10);
      if (now.getHours() === REMINDER_HOUR && lastReminderDay !== day) {
        lastReminderDay = day;
        void sendReminders();
      }
    },
    15 * 60 * 1000,
  );
}

async function main() {
  await bot!.api.setMyCommands(BOT_COMMANDS).catch((e) => console.error("[bot] setMyCommands", e));

  // Telegram can't reach the RU mini-PC directly (inbound block) — deliver the
  // webhook THROUGH the Cloudflare relay (/hook forwards to the app origin).
  const relay = process.env.TELEGRAM_API_ROOT?.replace(/\/$/, "");
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const url = relay ? `${relay}/hook` : base ? `${base}/api/telegram/webhook` : null;
  if (url) {
    await bot!.api
      .setWebhook(url, {
        secret_token: process.env.TELEGRAM_WEBHOOK_SECRET || undefined,
        drop_pending_updates: true,
        allowed_updates: ["message", "my_chat_member"],
      })
      .then(() => console.log(`[bot] webhook set → ${url}`))
      .catch((e) => console.error("[bot] setWebhook", e));
  } else {
    console.error("[bot] no TELEGRAM_API_ROOT/NEXT_PUBLIC_APP_URL — cannot register webhook");
  }

  startReminderLoop();
  console.log("[bot] worker up (webhook mode + reminders)");
}

main();
