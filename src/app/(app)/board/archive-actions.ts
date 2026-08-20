"use server";

import { revalidatePath } from "next/cache";
import { canAccessBoard, canManageBoard } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function boardIdOfTask(taskId: string) {
  const t = await prisma.task.findUnique({
    where: { id: taskId },
    select: { column: { select: { boardId: true } } },
  });
  return t?.column.boardId ?? null;
}

async function canManage(boardId: string) {
  const user = await requireUser();
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { regions: { select: { id: true } }, ownerId: true },
  });
  return board ? canManageBoard(user, board) : false;
}

/** Archive or restore a single task (any board member). */
export async function archiveTask(taskId: string, archived = true) {
  const user = await requireUser();
  const boardId = await boardIdOfTask(taskId);
  if (!boardId || !(await canAccessBoard(user, boardId))) {
    return { ok: false as const, error: "Недостаточно прав" };
  }
  await prisma.task.update({ where: { id: taskId }, data: { archivedAt: archived ? new Date() : null } });
  revalidatePath("/board/[boardId]", "page");
  revalidatePath(`/task/${taskId}`);
  return { ok: true as const };
}

/** Archive every task currently in the board's «Готово» column (declutter). */
export async function archiveDoneTasks(boardId: string) {
  if (!(await canManage(boardId))) return { ok: false as const, error: "Недостаточно прав" };
  const res = await prisma.task.updateMany({
    where: { archivedAt: null, column: { boardId, done: true } },
    data: { archivedAt: new Date() },
  });
  revalidatePath("/board/[boardId]", "page");
  return { ok: true as const, count: res.count };
}

/** Soft-archive or restore a whole board (hidden from lists, kept in DB). */
export async function setBoardArchived(boardId: string, archived: boolean) {
  if (!(await canManage(boardId))) return { ok: false as const, error: "Недостаточно прав" };
  await prisma.board.update({ where: { id: boardId }, data: { archivedAt: archived ? new Date() : null } });
  revalidatePath("/boards");
  revalidatePath("/board/[boardId]", "page");
  return { ok: true as const };
}
