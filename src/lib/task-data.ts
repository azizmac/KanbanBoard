import { prisma } from "./prisma";
import type { ColumnOption, TaskDetailData, TeamUser } from "./types";

export async function getTaskDetail(taskId: string): Promise<TaskDetailData | null> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      column: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true } } },
      },
      attachments: {
        orderBy: { createdAt: "asc" },
        include: { uploader: { select: { id: true, name: true } } },
      },
    },
  });

  if (!task) return null;

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    columnId: task.columnId,
    column: task.column,
    creator: task.creator,
    assignee: task.assignee,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    comments: task.comments.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      author: c.author,
    })),
    attachments: task.attachments.map((a) => ({
      id: a.id,
      filename: a.filename,
      size: a.size,
      mimeType: a.mimeType,
      createdAt: a.createdAt.toISOString(),
      uploader: a.uploader,
    })),
  };
}

export async function getTeam(): Promise<TeamUser[]> {
  const users = await prisma.user.findMany({
    where: { active: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, username: true, position: true, role: true },
  });
  return users;
}

export async function getColumnOptions(): Promise<ColumnOption[]> {
  const board = await prisma.board.findFirst({
    orderBy: { createdAt: "asc" },
    include: { columns: { orderBy: { position: "asc" }, select: { id: true, name: true } } },
  });
  return board?.columns ?? [];
}
