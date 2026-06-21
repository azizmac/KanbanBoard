import { prisma } from "./prisma";
import type { ColumnOption, MyTaskRow, TagData, TaskDetailData, TeamUser } from "./types";

const myTaskInclude = {
  column: { select: { name: true, board: { select: { id: true, name: true, color: true } } } },
} as const;

type MyTaskRaw = {
  id: string;
  title: string;
  priority: MyTaskRow["priority"];
  dueDate: Date | null;
  column: { name: string; board: { id: string; name: string; color: string } };
};

function toMyTaskRow(t: MyTaskRaw): MyTaskRow {
  return {
    id: t.id,
    title: t.title,
    priority: t.priority,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    overdue: t.dueDate ? t.dueDate.getTime() < Date.now() : false,
    boardId: t.column.board.id,
    boardName: t.column.board.name,
    boardColor: t.column.board.color,
    columnName: t.column.name,
    done: t.column.name.includes("Готово"),
  };
}

/** Tasks relevant to one user: assigned to them, and where they were @-mentioned. */
export async function getMyWork(
  userId: string,
): Promise<{ assigned: MyTaskRow[]; mentioned: MyTaskRow[] }> {
  const assigned = await prisma.task.findMany({
    where: { assigneeId: userId, archivedAt: null },
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    include: myTaskInclude,
  });

  const mentions = await prisma.mention.findMany({
    where: { userId, taskId: { not: null } },
    select: { taskId: true },
  });
  const taskIds = [...new Set(mentions.map((m) => m.taskId!).filter(Boolean))];
  const mentioned = taskIds.length
    ? await prisma.task.findMany({
        where: { id: { in: taskIds }, archivedAt: null },
        orderBy: { updatedAt: "desc" },
        include: myTaskInclude,
      })
    : [];

  return { assigned: assigned.map(toMyTaskRow), mentioned: mentioned.map(toMyTaskRow) };
}

export async function getTaskDetail(taskId: string): Promise<TaskDetailData | null> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      column: {
        select: { id: true, name: true, board: { select: { id: true, name: true, color: true } } },
      },
      creator: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      tags: { select: { id: true, name: true, color: true } },
      checklist: { orderBy: { position: "asc" }, select: { id: true, text: true, done: true } },
      activities: {
        orderBy: { createdAt: "asc" },
        include: { actor: { select: { id: true, name: true } } },
      },
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
    column: { id: task.column.id, name: task.column.name },
    board: task.column.board,
    creator: task.creator,
    assignee: task.assignee,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    archived: Boolean(task.archivedAt),
    tags: task.tags,
    checklist: task.checklist,
    activities: task.activities.map((a) => ({
      id: a.id,
      kind: a.kind,
      detail: a.detail,
      createdAt: a.createdAt.toISOString(),
      actor: a.actor,
    })),
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

/** All tags defined on a board, for tag suggestions in the task screen. */
export async function getBoardTags(boardId: string): Promise<TagData[]> {
  return prisma.tag.findMany({
    where: { boardId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true },
  });
}

export async function getColumnOptions(boardId?: string): Promise<ColumnOption[]> {
  const board = await prisma.board.findFirst({
    where: boardId ? { id: boardId } : undefined,
    orderBy: { createdAt: "asc" },
    include: { columns: { orderBy: { position: "asc" }, select: { id: true, name: true } } },
  });
  return board?.columns ?? [];
}
