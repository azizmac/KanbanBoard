import { Bot } from "grammy";
import { prisma } from "./prisma";
import { verifyLinkToken } from "./telegram-link";

// Builds a configured bot. Used by both the long-polling dev script and the
// Vercel webhook route. Returns null when no token is configured.
export function createBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;

  const apiRoot = process.env.TELEGRAM_API_ROOT?.replace(/\/$/, "");
  const bot = new Bot(token, apiRoot ? { client: { apiRoot } } : undefined);

  bot.command("start", async (ctx) => {
    const payload = ctx.match?.trim();
    const tgId = String(ctx.from?.id ?? "");

    if (!payload) {
      await ctx.reply(
        "Привет! Это бот Kanban Tracker.\n\nЧтобы получать уведомления, откройте раздел «Команда» в приложении и нажмите «Подключить Telegram».",
      );
      return;
    }

    const userId = verifyLinkToken(payload);
    if (!userId) {
      await ctx.reply("Ссылка для привязки недействительна. Сгенерируйте новую в приложении.");
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      await ctx.reply("Пользователь не найден.");
      return;
    }

    await prisma.user.updateMany({
      where: { telegramId: tgId, NOT: { id: userId } },
      data: { telegramId: null },
    });
    await prisma.user.update({ where: { id: userId }, data: { telegramId: tgId } });

    await ctx.reply(
      `Готово, ${user.name}! ✅\nТеперь уведомления Kanban Tracker (назначения, упоминания, комментарии) будут приходить сюда.`,
    );
  });

  bot.command("stop", async (ctx) => {
    const tgId = String(ctx.from?.id ?? "");
    await prisma.user.updateMany({ where: { telegramId: tgId }, data: { telegramId: null } });
    await ctx.reply("Уведомления отключены. Чтобы снова включить — привяжите аккаунт в приложении.");
  });

  bot.catch((err) => console.error("[bot] error:", err));

  return bot;
}
