// Telegram bot via long polling (local dev). Handles linking via /start <token>.
//   npm run bot
// NOTE: uses the same bot token as production. If a webhook is set (prod),
// this script removes it so polling works — re-run `npm run webhook:set <url>`
// afterwards to restore the production webhook.
import "dotenv/config";
import { createBot } from "../src/lib/bot";

const bot = createBot();
if (!bot) {
  console.error("TELEGRAM_BOT_TOKEN is not set — nothing to run.");
  process.exit(1);
}
if (process.env.TELEGRAM_API_ROOT) {
  console.log(`[bot] using Telegram API proxy: ${process.env.TELEGRAM_API_ROOT}`);
}

async function main() {
  await bot!.api.deleteWebhook({ drop_pending_updates: false }).catch(() => {});
  await bot!.start({
    onStart: (info) => console.log(`[bot] @${info.username} is polling for updates…`),
  });
}

main();
