import { Bot, InlineKeyboard, Keyboard } from "grammy";
import {
  assignableUsers,
  canActOnTask,
  completeTask,
  createTaskInBoard,
  loadTask,
  reassignTask,
  snoozeTask,
} from "./bot-actions";
import { verifyBoardLinkCode } from "./board-link";
import { prisma } from "./prisma";
import { escapeHtml } from "./telegram";
import { resolveTelegramLogin } from "./tg-auth";
import { verifyLinkToken } from "./telegram-link";
import { syncAvatar } from "./tg-avatar";

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

type OpenTask = {
  id: string;
  title: string;
  dueDate: Date | null;
  column: { name: string; board: { name: string } };
};

/** Open (not «Готово») tasks assigned to a user, soonest-due first. */
function openAssignedTasks(userId: string): Promise<OpenTask[]> {
  return prisma.task.findMany({
    where: { assigneeId: userId, column: { name: { not: "Готово" } } },
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }],
    select: { id: true, title: true, dueDate: true, column: { select: { name: true, board: { select: { name: true } } } } },
  });
}

const isBurning = (t: OpenTask) => Boolean(t.dueDate && t.dueDate.getTime() < Date.now() + 24 * 3600 * 1000);
const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Render a task digest, grouped by board. */
function renderTasks(tasks: OpenTask[], onlyBurning: boolean): string {
  if (tasks.length === 0) {
    return onlyBurning ? "🎉 Ничего не горит — на сегодня всё спокойно." : "✅ Активных задач нет.";
  }
  const byBoard = new Map<string, string[]>();
  for (const t of tasks) {
    const board = t.column.board.name;
    const line = `• ${taskLink(t.id, t.title)} <i>(${escapeHtml(t.column.name)})</i>${fmtDue(t.dueDate)}`;
    if (!byBoard.has(board)) byBoard.set(board, []);
    byBoard.get(board)!.push(line);
  }
  const header = onlyBurning ? "🔥 <b>Горящие задачи</b>" : "🗂 <b>Ваши задачи</b>";
  const blocks = [...byBoard.entries()].map(([b, lines]) => `<b>${escapeHtml(b)}</b>\n${lines.join("\n")}`);
  return `${header}\n\n${blocks.join("\n\n")}\n\n👇 Нажмите на задачу для действий`;
}

/** Plain-text digest (kept for callers that only need text). */
export async function myTasksMessage(userId: string, onlyBurning = false): Promise<string> {
  const tasks = await openAssignedTasks(userId);
  return renderTasks(onlyBurning ? tasks.filter(isBurning) : tasks, onlyBurning);
}

/** Digest + an inline keyboard with one button per task (drill-in for actions). */
export async function buildTaskListView(userId: string, onlyBurning = false) {
  const all = await openAssignedTasks(userId);
  const tasks = onlyBurning ? all.filter(isBurning) : all;
  const kb = new InlineKeyboard();
  for (const t of tasks.slice(0, 12)) {
    const due = t.dueDate ? (t.dueDate.getTime() < Date.now() ? " ⚠️" : " 📅") : "";
    kb.text(truncate(t.title, 34) + due, `t:${t.id}`).row();
  }
  return { text: renderTasks(tasks, onlyBurning), markup: tasks.length ? kb : undefined };
}

/** Single-task view with action buttons (Готово / +1 день / Передать / Назад). */
async function taskActionView(taskId: string) {
  const t = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      dueDate: true,
      column: { select: { name: true, board: { select: { name: true } } } },
      assignee: { select: { name: true } },
    },
  });
  if (!t) return null;
  const lines = [
    `📌 <b>${escapeHtml(t.title)}</b>`,
    `${escapeHtml(t.column.board.name)} · ${escapeHtml(t.column.name)}`,
  ];
  if (t.assignee) lines.push(`👤 ${escapeHtml(t.assignee.name)}`);
  if (t.dueDate) lines.push(fmtDue(t.dueDate).replace(/^ · /, ""));
  const kb = new InlineKeyboard()
    .text("✅ Готово", `d:${t.id}`)
    .text("📅 +1 день", `s:${t.id}`)
    .row()
    .text("➡️ Передать", `r:${t.id}`)
    .text("⬅️ К списку", "ml");
  return { text: lines.join("\n"), markup: kb };
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
  "/mytasks — ваши задачи (с кнопками действий)",
  "/today — что горит сегодня",
  "/phone — поделиться номером телефона",
  "",
  "В группе (привязанной к доске):",
  "/tasks — задачи этой доски",
  "/new &lt;название&gt; — создать задачу на доске",
  "/link &lt;код&gt; — привязать группу к доске (код берётся в приложении)",
  "/unlink — отвязать группу",
  "",
  "Под задачей есть кнопки: ✅ Готово · 📅 +1 день · ➡️ Передать.",
].join("\n");

export const BOT_COMMANDS = [
  { command: "mytasks", description: "Мои задачи" },
  { command: "today", description: "Что горит сегодня" },
  { command: "phone", description: "Поделиться номером" },
  { command: "tasks", description: "Задачи доски (в группе)" },
  { command: "new", description: "Новая задача (в группе)" },
  { command: "help", description: "Помощь" },
];

// Builds a configured bot. Used by both the long-polling script and the webhook
// route. Returns null when no token is configured.
export function createBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;

  const apiRoot = process.env.TELEGRAM_API_ROOT?.replace(/\/$/, "");
  const bot = new Bot(token, apiRoot ? { client: { apiRoot } } : undefined);

  // grammY's built-in HTTP client hangs through the Cloudflare relay (while a
  // plain fetch works fine). Route every API call through plain fetch.
  if (apiRoot) {
    bot.api.config.use(async (_prev, method, payload, signal) => {
      // Hard per-request timeout so a stalled relay call can't freeze the bot.
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 45_000);
      (signal as AbortSignal | undefined)?.addEventListener?.("abort", () => ctrl.abort());
      try {
        const res = await fetch(`${apiRoot}/bot${token}/${method}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload ?? {}),
          signal: ctrl.signal,
        });
        return (await res.json()) as Awaited<ReturnType<typeof _prev>>;
      } finally {
        clearTimeout(timer);
      }
    });
  }

  // Diagnostic: log every message the bot actually receives (chat type + text).
  bot.use(async (ctx, next) => {
    const text = ctx.message?.text;
    if (text) console.log(`[bot] recv chat=${ctx.chat?.id} type=${ctx.chat?.type} text=${text.slice(0, 60)}`);
    await next();
  });

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

    // Website sign-in via deep-link (RU-friendly — no telegram.org widget). The
    // browser opened t.me/<bot>?start=login_<nonce>; resolve who this is and flip
    // the nonce so the waiting tab can mint a session.
    if (payload && /^login_[0-9a-f]{32}$/.test(payload)) {
      const nonce = payload.slice(6);
      const row = await prisma.loginNonce.findUnique({ where: { nonce } });
      if (!row || row.status !== "pending" || row.expiresAt < new Date()) {
        await ctx.reply("Ссылка для входа истекла. Обновите страницу входа и попробуйте снова.");
        return;
      }
      const name = [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(" ").trim();
      const result = await resolveTelegramLogin(
        { telegramId: tgId, username: ctx.from?.username ?? null, name },
        row.inviteToken,
      );
      if (!result.ok) {
        await prisma.loginNonce.update({ where: { nonce }, data: { status: "denied", error: result.error } });
        await ctx.reply(
          result.error === "disabled"
            ? "Ваш аккаунт отключён. Обратитесь к администратору."
            : "Вас ещё нет в команде — попросите ссылку-приглашение у администратора.",
        );
        return;
      }
      await prisma.loginNonce.update({ where: { nonce }, data: { status: "ready", userId: result.userId } });
      void syncAvatar(result.userId).catch(() => {}); // pull their Telegram photo
      await ctx.reply("Готово! ✅ Вернитесь во вкладку браузера — вход выполнен.");
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
    void syncAvatar(userId).catch(() => {}); // pull their Telegram photo
    await ctx.reply(`Готово, ${user.name}! ✅\nУведомления будут приходить сюда. Команды — /help`);
  });

  bot.command("stop", async (ctx) => {
    const tgId = String(ctx.from?.id ?? "");
    await prisma.user.updateMany({ where: { telegramId: tgId }, data: { telegramId: null } });
    await ctx.reply("Уведомления отключены. Чтобы снова включить — привяжите аккаунт в приложении.");
  });

  bot.command("help", (ctx) => reply(ctx, HELP));

  const replyView = (
    ctx: { reply: (s: string, o?: object) => Promise<unknown> },
    view: { text: string; markup?: InlineKeyboard },
  ) => ctx.reply(view.text, { parse_mode: "HTML", link_preview_options: { is_disabled: true }, reply_markup: view.markup });

  bot.command("mytasks", async (ctx) => {
    const user = await userByTg(ctx);
    if (!user) return ctx.reply("Сначала привяжите аккаунт: «Команда → Подключить Telegram» в приложении.");
    await replyView(ctx, await buildTaskListView(user.id));
  });

  bot.command("today", async (ctx) => {
    const user = await userByTg(ctx);
    if (!user) return ctx.reply("Сначала привяжите аккаунт в приложении.");
    await replyView(ctx, await buildTaskListView(user.id, true));
  });

  bot.command("phone", async (ctx) => {
    if (ctx.chat.type !== "private") return ctx.reply("Команду /phone отправьте в личке с ботом.");
    const user = await userByTg(ctx);
    if (!user) return ctx.reply("Сначала привяжите аккаунт в приложении.");
    const kb = new Keyboard().requestContact("📱 Поделиться номером").resized().oneTime();
    await ctx.reply(
      "Нажмите кнопку ниже — ваш номер появится в профиле, чтобы коллеги могли быстро связаться. Это по желанию.",
      { reply_markup: kb },
    );
  });

  // The user tapped the request_contact button → save their phone.
  bot.on("message:contact", async (ctx) => {
    const c = ctx.message.contact;
    if (c.user_id !== ctx.from?.id) {
      await ctx.reply("Поделитесь, пожалуйста, своим собственным номером — кнопкой ниже.");
      return;
    }
    const user = await userByTg(ctx);
    if (!user) {
      await ctx.reply("Сначала привяжите аккаунт в приложении.", { reply_markup: { remove_keyboard: true } });
      return;
    }
    const phone = c.phone_number.startsWith("+") ? c.phone_number : `+${c.phone_number}`;
    await prisma.user.update({ where: { id: user.id }, data: { phone } });
    await ctx.reply(`Спасибо! Номер ${phone} сохранён в профиле. ✅`, { reply_markup: { remove_keyboard: true } });
  });

  bot.command("new", async (ctx) => {
    if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") {
      return ctx.reply("Команду /new отправляйте в групповом чате, привязанном к доске.");
    }
    const board = await prisma.board.findUnique({ where: { telegramChatId: String(ctx.chat.id) } });
    if (!board) return ctx.reply("Группа не привязана к доске. Привяжите: /link <код> (код — в приложении, на доске).");
    const user = await userByTg(ctx);
    if (!user) return ctx.reply("Привяжите аккаунт в приложении, чтобы создавать задачи.");
    const title = ctx.match?.trim();
    if (!title) return ctx.reply("Использование: /new Название задачи");
    const r = await createTaskInBoard(board.id, user, title);
    if (!r.ok) return ctx.reply(r.error);
    await reply(ctx, `➕ Создана задача ${taskLink(r.id, r.title)} на доске «${escapeHtml(board.name)}».`);
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

  // ---- Inline-button actions on tasks (callback queries) ----
  type CbCtx = {
    from?: { id?: number };
    answerCallbackQuery: (text?: string) => Promise<unknown>;
    editMessageText: (s: string, o?: object) => Promise<unknown>;
  };
  const editView = async (ctx: CbCtx, view: { text: string; markup?: InlineKeyboard }) => {
    try {
      await ctx.editMessageText(view.text, {
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
        reply_markup: view.markup,
      });
    } catch {
      // ignore "message is not modified" / message too old to edit
    }
  };
  // Resolve the tapping user and verify they may act on the task.
  const actorForTask = async (ctx: CbCtx, taskId: string) => {
    const user = await userByTg(ctx);
    if (!user) {
      await ctx.answerCallbackQuery("Сначала привяжите аккаунт в приложении");
      return null;
    }
    const task = await loadTask(taskId);
    if (!task) {
      await ctx.answerCallbackQuery("Задача не найдена");
      return null;
    }
    if (!(await canActOnTask(user, task))) {
      await ctx.answerCallbackQuery("Нет доступа к этой задаче");
      return null;
    }
    return user;
  };

  bot.callbackQuery(/^t:(.+)$/, async (ctx) => {
    if (!(await actorForTask(ctx, ctx.match[1]))) return;
    const view = await taskActionView(ctx.match[1]);
    if (!view) return ctx.answerCallbackQuery("Задача не найдена");
    await editView(ctx, view);
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery("ml", async (ctx) => {
    const user = await userByTg(ctx);
    if (!user) return ctx.answerCallbackQuery("Привяжите аккаунт");
    await editView(ctx, await buildTaskListView(user.id));
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^d:(.+)$/, async (ctx) => {
    const user = await actorForTask(ctx, ctx.match[1]);
    if (!user) return;
    const r = await completeTask(ctx.match[1], user);
    await ctx.answerCallbackQuery(r.ok ? (r.already ? "Уже в «Готово»" : "Готово ✅") : r.error);
    if (r.ok) await editView(ctx, { text: `✅ <b>${escapeHtml(r.title)}</b> — выполнено` });
  });

  bot.callbackQuery(/^s:(.+)$/, async (ctx) => {
    const user = await actorForTask(ctx, ctx.match[1]);
    if (!user) return;
    const r = await snoozeTask(ctx.match[1], user, 1);
    await ctx.answerCallbackQuery(r.ok ? "Срок перенесён на +1 день" : r.error);
    if (r.ok) {
      const v = await taskActionView(ctx.match[1]);
      if (v) await editView(ctx, v);
    }
  });

  bot.callbackQuery(/^r:(.+)$/, async (ctx) => {
    const user = await actorForTask(ctx, ctx.match[1]);
    if (!user) return;
    const task = await loadTask(ctx.match[1]);
    if (!task) return ctx.answerCallbackQuery("Задача не найдена");
    const users = await assignableUsers(task.column.boardId);
    if (users.length === 0) return ctx.answerCallbackQuery("Некому передать");
    const kb = new InlineKeyboard();
    for (const u of users) kb.text(u.name, `a:${ctx.match[1]}:${u.id}`).row();
    kb.text("⬅️ Назад", `t:${ctx.match[1]}`);
    await editView(ctx, { text: "Кому передать задачу?", markup: kb });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^a:([^:]+):(.+)$/, async (ctx) => {
    const user = await actorForTask(ctx, ctx.match[1]);
    if (!user) return;
    const r = await reassignTask(ctx.match[1], user, ctx.match[2]);
    await ctx.answerCallbackQuery(r.ok ? `Передано: ${r.assignee}` : r.error);
    if (r.ok) {
      const v = await taskActionView(ctx.match[1]);
      if (v) await editView(ctx, v);
    }
  });

  bot.catch((err) => console.error("[bot] error:", err));

  return bot;
}
