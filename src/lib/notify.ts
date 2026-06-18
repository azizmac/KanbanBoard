import type { NotificationType } from "@/generated/prisma/client";
import { prisma } from "./prisma";
import { escapeHtml, sendTelegram } from "./telegram";

type NotifyInput = {
  userId: string;
  type: NotificationType;
  message: string;
  taskId?: string | null;
};

/**
 * Create an in-app notification and, if the user has linked Telegram, push it.
 * Safe to call from server actions; never throws.
 */
export async function notify(input: NotifyInput) {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user || !user.active) return;

  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      message: input.message,
      taskId: input.taskId ?? null,
    },
  });

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
}
