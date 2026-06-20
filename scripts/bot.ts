// Telegram bot worker. Neither long-polling nor webhooks work from the RU mini-PC:
//   - long getUpdates can't be held open through the Cloudflare relay;
//   - Telegram/Cloudflare can't reach the RU origin for a webhook (inbound block).
// So we SHORT-poll: getUpdates({timeout:0}) through the relay (each call returns
// instantly) in a loop, with a small idle delay. Plus the daily reminder digest.
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
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

async function pollLoop() {
  const api = bot!.api;
  let offset = 0;
  for (;;) {
    let updates: Awaited<ReturnType<typeof api.getUpdates>> = [];
    try {
      updates = await api.getUpdates({
        offset,
        timeout: 0,
        allowed_updates: ["message", "my_chat_member"],
      });
    } catch (e) {
      console.error("[poll]", e instanceof Error ? e.message : e);
      await sleep(3000);
      continue;
    }
    for (const u of updates) {
      offset = u.update_id + 1;
      try {
        await bot!.handleUpdate(u);
      } catch (e) {
        console.error("[handle]", e);
      }
    }
    if (updates.length === 0) await sleep(1500);
  }
}

async function main() {
  await bot!.api.deleteWebhook({ drop_pending_updates: false }).catch(() => {});
  await bot!.init().catch((e) => console.error("[bot] init", e));
  await bot!.api.setMyCommands(BOT_COMMANDS).catch((e) => console.error("[bot] setMyCommands", e));
  startReminderLoop();
  console.log("[bot] short-polling via relay…");
  await pollLoop();
}

main();
