// Telegram bot via long polling. Handles /start linking, quick commands and a
// daily reminder digest.
//   npm run bot
// Uses the same token as production; if a webhook is set it's removed so polling
// works (re-run `npm run webhook:set <url>` to restore a webhook).
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

// Once a day at REMINDER_HOUR (container TZ — set TZ=Europe/Moscow in compose).
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
  await bot!.api.deleteWebhook({ drop_pending_updates: false }).catch(() => {});
  await bot!.api.setMyCommands(BOT_COMMANDS).catch((e) => console.error("[bot] setMyCommands", e));
  startReminderLoop();
  await bot!.start({
    onStart: (info) => console.log(`[bot] @${info.username} is polling for updates…`),
  });
}

main();
