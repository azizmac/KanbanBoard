import type { NotificationType } from "@/generated/prisma/client";
import { prisma } from "./prisma";

export type InboxItem = {
  id: string;
  type: NotificationType;
  message: string;
  taskId: string | null;
  read: boolean;
  createdAt: string;
};

export async function getInbox(userId: string, take = 50): Promise<InboxItem[]> {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, type: true, message: true, taskId: true, read: true, createdAt: true },
  });
  return rows.map((n) => ({
    id: n.id,
    type: n.type,
    message: n.message,
    taskId: n.taskId,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }));
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, read: false } });
}
