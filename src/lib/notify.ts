import type { NotificationType } from "@/generated/prisma/client";
import { prisma } from "./prisma";
import { sendPush } from "./push";
import { escapeHtml, sendTelegram } from "./telegram";

type NotifyInput = {
  userId: string;
  type: NotificationType;
  message: string;
  taskId?: string | null;
};

/** Current hour (0-23) in the company timezone, for quiet-hours checks. */
function moscowHour() {
  const s = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    hour12: false,
  }).format(new Date());
  return Number.parseInt(s, 10) % 24;
}

function inQuietHours(start: number | null, end: number | null, hour: number) {
  if (start == null || end == null || start === end) return false;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

/** Whether the user wants an *external* ping (Telegram/push) for this task right
 *  now. The in-app notification is always created regardless. */
async function externalAllowed(
  user: { quietStart: number | null; quietEnd: number | null; notifyPaused: boolean },
  userId: string,
  taskId?: string | null,
) {
  if (user.notifyPaused) return false;
  if (inQuietHours(user.quietStart, user.quietEnd, moscowHour())) return false;
  if (taskId) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { column: { select: { boardId: true } } },
    });
    const boardId = task?.column.boardId;
    if (boardId) {
      const muted = await prisma.user.count({
        where: { id: userId, mutedBoards: { some: { id: boardId } } },
      });
      if (muted) return false;
    }
  }
  return true;
}

/**
 * Create an in-app notification and, if allowed by the user's preferences and
 * they've linked Telegram, push it out. Safe to call from server actions; never
 * throws.
 */
export async function notify(input: NotifyInput) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      active: true,
      telegramId: true,
      quietStart: true,
      quietEnd: true,
      notifyPaused: true,
    },
  });
  if (!user || !user.active) return;

  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      message: input.message,
      taskId: input.taskId ?? null,
    },
  });

  // External pings respect quiet hours / pause / muted boards; the in-app feed
  // entry above is always kept so nothing is silently lost.
  if (!(await externalAllowed(user, input.userId, input.taskId))) return;

  if (user.telegramId) {
    let html = escapeHtml(input.message);
    if (input.taskId && process.env.NEXT_PUBLIC_APP_URL) {
      html += `\n\n<a href="${process.env.NEXT_PUBLIC_APP_URL}/task/${input.taskId}">Открыть задачу →</a>`;
    }
    const ok = await sendTelegram(user.telegramId, html);
    if (ok) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { delivered: true },
      });
    }
  }

  // Web push to the user's installed PWAs / browsers (independent of Telegram).
  await sendPush(input.userId, {
    title: "Поток",
    body: input.message,
    url: input.taskId ? `/task/${input.taskId}` : "/",
  }).catch(() => {});
}
