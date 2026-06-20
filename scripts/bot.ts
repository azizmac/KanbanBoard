// Telegram bot worker. A webhook can't be used from the RU mini-PC (Telegram /
// Cloudflare can't reach the origin), so we poll getUpdates through the relay.
// LONG-poll (timeout=25): the call returns the instant a message arrives, so
// replies are immediate; when idle it parks ~25s, keeping request volume low
// (Cloudflare free tier). A hard 45s per-request abort lives in createBot() so a
// stalled relay call can never freeze the loop. Plus the daily reminder digest.
import "dotenv/config";
import { BOT_COMMANDS, buildTaskListView, createBot } from "../src/lib/bot";
import { prisma } from "../src/lib/prisma";
import { instantiateTemplate } from "../src/lib/templates";
import { syncAvatar } from "../src/lib/tg-avatar";

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
    const view = await buildTaskListView(u.id, true);
    await bot!.api
      .sendMessage(u.telegramId!, view.text, { ...HTML, reply_markup: view.markup })
      .catch((e) => console.error("[reminders]", e));
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

// ---- Health monitor + alerting --------------------------------------------
const HEALTH_URL = process.env.APP_HEALTH_URL || "http://app:3000/api/health";
const HEARTBEAT_URL = process.env.HEARTBEAT_URL; // Cloudflare dead-man's switch (optional)

/** Probe DB (directly) + app (its /api/health). */
async function probe(): Promise<{ db: boolean; app: boolean }> {
  let db = false;
  let app = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch {
    /* db unreachable */
  }
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(HEALTH_URL, { signal: ctrl.signal }).finally(() => clearTimeout(to));
    app = res.ok;
  } catch {
    /* app unreachable */
  }
  return { db, app };
}

/** Alert recipients: ALERT_CHAT_ID if set, else every active director with Telegram. */
async function alertTargets(): Promise<string[]> {
  if (process.env.ALERT_CHAT_ID) return [process.env.ALERT_CHAT_ID];
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", active: true, telegramId: { not: null } },
    select: { telegramId: true },
  });
  return admins.map((a) => a.telegramId).filter((id): id is string => Boolean(id));
}

async function alert(text: string) {
  for (const chat of await alertTargets()) {
    await bot!.api.sendMessage(chat, text, HTML).catch((e) => console.error("[monitor] alert:", e));
  }
}

/** Alert after 2 consecutive failures (avoids flapping); notify on recovery. */
function startMonitorLoop() {
  let healthy = true;
  let fails = 0;
  setInterval(async () => {
    const { db, app } = await probe();
    if (db && app) {
      if (!healthy) {
        healthy = true;
        await alert("🟢 <b>Поток восстановлен</b> — приложение и база снова в строю.");
      }
      fails = 0;
    } else {
      fails += 1;
      if (healthy && fails >= 2) {
        healthy = false;
        const lines = ["🔴 <b>Поток: сбой</b>"];
        if (!app) lines.push("• приложение не отвечает");
        if (!db) lines.push("• база данных недоступна");
        await alert(lines.join("\n"));
      }
    }
  }, 60_000);
}

/** Ping the external dead-man's switch so it knows the box/bot is alive. */
function startHeartbeatLoop() {
  const url = HEARTBEAT_URL;
  if (!url) return;
  const beat = () => {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 8000);
    fetch(url, { method: "POST", signal: ctrl.signal })
      .catch(() => {})
      .finally(() => clearTimeout(to));
  };
  beat();
  setInterval(beat, 3 * 60 * 1000);
}

// ---- Recurring tasks (templates with a schedule) -------------------------
function localDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Create tasks from any recurring templates due this hour (once per day). */
async function runDueTemplates() {
  const now = new Date(); // bot container runs in Europe/Moscow
  const today = localDate(now);
  const wd = now.getDay(); // 0=Sun..6=Sat
  const weekday = wd === 0 ? 7 : wd; // → 1=Mon..7=Sun
  const monthday = now.getDate();

  const due = await prisma.taskTemplate.findMany({
    where: { active: true, recurrence: { not: null }, hour: now.getHours(), NOT: { lastRunDate: today } },
  });

  for (const t of due) {
    const match =
      t.recurrence === "daily" ||
      (t.recurrence === "weekly" && t.weekday === weekday) ||
      (t.recurrence === "monthly" && t.monthday === monthday);
    if (!match) continue;
    try {
      const taskId = await instantiateTemplate(t, t.creatorId);
      await prisma.taskTemplate.update({ where: { id: t.id }, data: { lastRunDate: today } });
      if (taskId) console.log(`[recurring] created «${t.title}» from template ${t.name}`);
    } catch (e) {
      console.error("[recurring]", t.id, e instanceof Error ? e.message : e);
    }
  }
}

function startRecurringLoop() {
  void runDueTemplates().catch((e) => console.error("[recurring]", e)); // catch up on restart
  setInterval(() => void runDueTemplates().catch((e) => console.error("[recurring]", e)), 15 * 60 * 1000);
}

// ---- Telegram avatar sync -------------------------------------------------
/** Pull Telegram profile photos into MinIO. onlyMissing=true skips users who
 *  already have an avatar (startup), false refreshes everyone (daily). */
async function refreshAvatars(onlyMissing: boolean) {
  const users = await prisma.user.findMany({
    where: {
      active: true,
      telegramId: { not: null },
      // "missing" = no avatar yet, or an external (t.me) URL not yet localized
      ...(onlyMissing
        ? { OR: [{ avatarUrl: null }, { NOT: { avatarUrl: { startsWith: "/api/avatar" } } }] }
        : {}),
    },
    select: { id: true },
  });
  let n = 0;
  for (const u of users) {
    if (await syncAvatar(u.id)) n += 1;
    await sleep(500); // gentle on the relay
  }
  if (n) console.log(`[avatars] synced ${n}/${users.length}`);
}

function startAvatarLoop() {
  void refreshAvatars(true).catch((e) => console.error("[avatars]", e)); // fill missing on start
  setInterval(() => void refreshAvatars(false).catch((e) => console.error("[avatars]", e)), 24 * 60 * 60 * 1000);
}

async function pollLoop() {
  const api = bot!.api;
  let offset = 0;
  for (;;) {
    const started = Date.now();
    let updates: Awaited<ReturnType<typeof api.getUpdates>> = [];
    try {
      updates = await api.getUpdates({
        offset,
        timeout: 25,
        allowed_updates: ["message", "my_chat_member", "callback_query"],
      });
    } catch (e) {
      console.error("[poll]", e instanceof Error ? e.message : e);
      await sleep(2000);
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
    // If the relay can't hold the long-poll and returns instantly+empty, back
    // off so we don't spin and burn through the relay's request quota.
    if (updates.length === 0 && Date.now() - started < 2000) await sleep(2000);
  }
}

async function main() {
  await bot!.api.deleteWebhook({ drop_pending_updates: false }).catch(() => {});
  await bot!.init().catch((e) => console.error("[bot] init", e));
  await bot!.api.setMyCommands(BOT_COMMANDS).catch((e) => console.error("[bot] setMyCommands", e));
  startReminderLoop();
  startMonitorLoop();
  startHeartbeatLoop();
  startRecurringLoop();
  startAvatarLoop();
  console.log("[bot] long-polling (timeout=25) via relay…");
  await pollLoop();
}

main();
