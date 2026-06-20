import { Bot } from "grammy";
import { verifyBoardLinkCode } from "./board-link";
import { prisma } from "./prisma";
import { escapeHtml } from "./telegram";
import { verifyLinkToken } from "./telegram-link";

function appBase() {
  return (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
}
function taskLink(id: string, title: string) {
  const base = appBase();
  const safe = escapeHtml(title);
  return base ? `<a href="${base}/task/${id}">${safe}</a>` : safe;
}
function isDone(name: string) {
  return name.includes("Готово");
}
function fmtDue(d: Date | null): string {
  if (!d) return "";
  const overdue = d.getTime() < Date.now();
  const s = d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  return overdue ? ` · ⚠️ ${s}` : ` · 📅 ${s}`;
}

async function userByTg(ctx: { from?: { id?: number } }) {
  const tgId = ctx.from?.id ? String(ctx.from.id) : null;
  if (!tgId) return null;
  return prisma.user.findUnique({ where: { telegramId: tgId } });
}

/** Tasks assigned to a user that aren't done, grouped by board. */
export async function myTasksMessage(userId: string, onlyBurning = false): Promise<string> {
  const tasks = await prisma.task.findMany({
    where: { assigneeId: userId, column: { name: { not: "Готово" } } },
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }],
    include: { column: { select: { name: true, board: { select: { name: true } } } } },
  });

  const filtered = onlyBurning
    ? tasks.filter((t) => t.dueDate && t.dueDate.getTime() < Date.now() + 24 * 3600 * 1000)
    : tasks;

  if (filtered.length === 0) {
    return onlyBurning ? "🎉 Ничего не горит — на сегодня всё спокойно." : "✅ Активных задач нет.";
  }

  const byBoard = new Map<string, string[]>();
  for (const t of filtered) {
    const board = t.column.board.name;
    const line = `• ${taskLink(t.id, t.title)} <i>(${escapeHtml(t.column.name)})</i>${fmtDue(t.dueDate)}`;
    if (!byBoard.has(board)) byBoard.set(board, []);
    byBoard.get(board)!.push(line);
  }

  const header = onlyBurning ? "🔥 <b>Горящие задачи</b>" : "🗂 <b>Ваши задачи</b>";
  const blocks = [...byBoard.entries()].map(([b, lines]) => `<b>${escapeHtml(b)}</b>\n${lines.join("\n")}`);
  return `${header}\n\n${blocks.join("\n\n")}`;
}

/** Open tasks of a board, grouped by column. */
async function boardTasksMessage(boardId: string): Promise<string> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      columns: {
        orderBy: { position: "asc" },
        include: {
          tasks: { orderBy: { position: "asc" }, include: { assignee: { select: { name: true } } } },
        },
      },
    },
  });
  if (!board) return "Доска не найдена.";

  const blocks: string[] = [];
  for (const col of board.columns) {
    if (isDone(col.name) || col.tasks.length === 0) continue;
    const lines = col.tasks.map(
      (t) => `• ${taskLink(t.id, t.title)}${t.assignee ? ` — ${escapeHtml(t.assignee.name)}` : ""}${fmtDue(t.dueDate)}`,
    );
    blocks.push(`<b>${escapeHtml(col.name)}</b> (${col.tasks.length})\n${lines.join("\n")}`);
  }
  return `📋 <b>${escapeHtml(board.name)}</b>\n\n${blocks.length ? blocks.join("\n\n") : "Активных задач нет."}`;
}

/** Bind a chat to a board from a signed code (the code is the authorization). */
async function linkChatToBoard(chatId: string, code: string): Promise<string> {
  const boardId = verifyBoardLinkCode(code);
  if (!boardId) return "Неверный код привязки. Возьмите свежий код на доске в приложении.";
  const board = await prisma.board.findUnique({ where: { id: boardId }, select: { id: true, name: true } });
  if (!board) return "Доска не найдена.";
  await prisma.board.updateMany({ where: { telegramChatId: chatId }, data: { telegramChatId: null } });
  await prisma.board.update({ where: { id: board.id }, data: { telegramChatId: chatId } });
  return `✅ Группа привязана к доске «${board.name}». Команда /tasks покажет её задачи.`;
}

const HELP = [
  "<b>Команды бота «Поток»</b>",
  "",
  "В личке:",
  "/mytasks — ваши задачи",
  "/today — что горит сегодня",
  "",
  "В группе (привязанной к доске):",
  "/tasks — задачи этой доски",
  "/link &lt;код&gt; — привязать группу к доске (код берётся в приложении)",
  "/unlink — отвязать группу",
].join("\n");

export const BOT_COMMANDS = [
  { command: "mytasks", description: "Мои задачи" },
  { command: "today", description: "Что горит сегодня" },
  { command: "tasks", description: "Задачи доски (в группе)" },
  { command: "help", description: "Помощь" },
];

// Builds a configured bot. Used by both the long-polling script and the webhook
// route. Returns null when no token is configured.
export function createBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;

  const apiRoot = process.env.TELEGRAM_API_ROOT?.replace(/\/$/, "");
  const bot = new Bot(token, apiRoot ? { client: { apiRoot } } : undefined);

  const reply = (ctx: { reply: (s: string, o?: object) => Promise<unknown> }, html: string) =>
    ctx.reply(html, { parse_mode: "HTML", link_preview_options: { is_disabled: true } });

  bot.command("start", async (ctx) => {
    const payload = ctx.match?.trim();
    const tgId = String(ctx.from?.id ?? "");

    // In a group: ?startgroup=<code> adds the bot and links the chat to a board.
    if (ctx.chat.type === "group" || ctx.chat.type === "supergroup") {
      if (!payload) {
        await ctx.reply(
          "Чтобы привязать группу к доске, на доске в приложении нажмите «Подключить Telegram-группу». Команды — /help",
        );
        return;
      }
      await ctx.reply(await linkChatToBoard(String(ctx.chat.id), payload));
      return;
    }

    if (!payload) {
      await ctx.reply(
        "Привет! Это бот «Поток».\n\nЧтобы получать уведомления, откройте «Команда → Подключить Telegram» в приложении. Команды — /help",
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
    await prisma.user.updateMany({ where: { telegramId: tgId, NOT: { id: userId } }, data: { telegramId: null } });
    await prisma.user.update({ where: { id: userId }, data: { telegramId: tgId } });
    await ctx.reply(`Готово, ${user.name}! ✅\nУведомления будут приходить сюда. Команды — /help`);
  });

  bot.command("stop", async (ctx) => {
    const tgId = String(ctx.from?.id ?? "");
    await prisma.user.updateMany({ where: { telegramId: tgId }, data: { telegramId: null } });
    await ctx.reply("Уведомления отключены. Чтобы снова включить — привяжите аккаунт в приложении.");
  });

  bot.command("help", (ctx) => reply(ctx, HELP));

  bot.command("mytasks", async (ctx) => {
    const user = await userByTg(ctx);
    if (!user) return ctx.reply("Сначала привяжите аккаунт: «Команда → Подключить Telegram» в приложении.");
    await reply(ctx, await myTasksMessage(user.id));
  });

  bot.command("today", async (ctx) => {
    const user = await userByTg(ctx);
    if (!user) return ctx.reply("Сначала привяжите аккаунт в приложении.");
    await reply(ctx, await myTasksMessage(user.id, true));
  });

  bot.command("tasks", async (ctx) => {
    const board = await prisma.board.findUnique({ where: { telegramChatId: String(ctx.chat.id) } });
    if (!board) {
      return ctx.reply("Группа не привязана к доске. Привяжите: /link <код> (код — в приложении, на доске).");
    }
    await reply(ctx, await boardTasksMessage(board.id));
  });

  bot.command("link", async (ctx) => {
    if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") {
      return ctx.reply("Команду /link нужно отправлять в групповом чате (где есть бот).");
    }
    await ctx.reply(await linkChatToBoard(String(ctx.chat.id), ctx.match?.trim() ?? ""));
  });

  bot.command("unlink", async (ctx) => {
    await prisma.board.updateMany({ where: { telegramChatId: String(ctx.chat.id) }, data: { telegramChatId: null } });
    await ctx.reply("Группа отвязана от доски.");
  });

  bot.catch((err) => console.error("[bot] error:", err));

  return bot;
}
