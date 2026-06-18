// Manage the Telegram webhook.
//   npm run webhook:set https://your-app.vercel.app   (or reads NEXT_PUBLIC_APP_URL)
//   npm run webhook:delete                             (back to local polling)
import "dotenv/config";
import { createBot } from "../src/lib/bot";

async function main() {
  const bot = createBot();
  if (!bot) {
    console.error("TELEGRAM_BOT_TOKEN is not set.");
    process.exit(1);
  }

  const arg = process.argv[2];

  if (arg === "delete") {
    await bot.api.deleteWebhook({ drop_pending_updates: false });
    console.log("Webhook removed. Use `npm run bot` for local long polling.");
    return;
  }

  const base = arg || process.env.NEXT_PUBLIC_APP_URL;
  if (!base) {
    console.error("Usage: npm run webhook:set <https://your-app.vercel.app>");
    process.exit(1);
  }
  const url = `${base.replace(/\/$/, "")}/api/telegram/webhook`;
  await bot.api.setWebhook(url, {
    secret_token: process.env.TELEGRAM_WEBHOOK_SECRET || undefined,
    drop_pending_updates: true,
  });
  console.log("Webhook set to:", url);
  const info = await bot.api.getWebhookInfo();
  console.log("Current webhook:", info.url || "(none)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
