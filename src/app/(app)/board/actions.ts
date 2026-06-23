"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canCreateBoardInRegions, canManageBoard } from "@/lib/access";
import { recordActivity } from "@/lib/activity";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyTaskChange } from "@/lib/realtime";

const createSchema = z.object({
  columnId: z.string().min(1),
  title: z.string().trim().min(1, "Введите название").max(300),
});

export async function createTask(input: { columnId: string; title: string }) {
  const user = await requireUser();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Ошибка" };
  }

  const count = await prisma.task.count({ where: { columnId: parsed.data.columnId } });
  const task = await prisma.task.create({
    data: {
      title: parsed.data.title,
      columnId: parsed.data.columnId,
      creatorId: user.id,
      position: count,
    },
  });
  await recordActivity(task.id, user.id, "CREATED");
  await notifyTaskChange(task.id);

  revalidatePath("/board/[boardId]", "page");
  return { ok: true as const, id: task.id };
}

const moveSchema = z.object({
  taskId: z.string().min(1),
  toColumnId: z.string().min(1),
  orderedIds: z.array(z.string().min(1)),
});

export async function moveTask(input: {
  taskId: string;
  toColumnId: string;
  orderedIds: string[];
}) {
  await requireUser();
  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const };

  const { taskId, toColumnId, orderedIds } = parsed.data;

  await prisma.$transaction([
    prisma.task.update({ where: { id: taskId }, data: { columnId: toColumnId } }),
    ...orderedIds.map((id, index) =>
      prisma.task.update({ where: { id }, data: { position: index } }),
    ),
  ]);
  await notifyTaskChange(taskId);

  revalidatePath("/board/[boardId]", "page");
  return { ok: true as const };
}

const DEFAULT_COLUMNS = ["Бэклог", "В работе", "На ревью", "Готово"];
const boardSchema = z.object({
  name: z.string().trim().min(1, "Введите название").max(120),
  color: z.string().trim().max(20).optional(),
  regionIds: z.array(z.string()).optional(),
});

// Anyone can create a personal board (no regions). A board attached to regions
// needs rights for ALL of them (directors anywhere, regionals in theirs). A board
// may span several regions — managers of any of them then see + manage it.
export async function createBoard(input: z.input<typeof boardSchema>) {
  const user = await requireUser();
  const parsed = boardSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Ошибка" };
  }
  const regionIds = [...new Set(parsed.data.regionIds ?? [])];
  if (!(await canCreateBoardInRegions(user, regionIds))) {
    return { ok: false as const, error: "Нет прав на создание доски в этих регионах" };
  }

  const board = await prisma.board.create({
    data: {
      name: parsed.data.name,
      color: parsed.data.color ?? "iris",
      regions: regionIds.length ? { connect: regionIds.map((id) => ({ id })) } : undefined,
      ownerId: user.id, // the creator owns it (esp. personal boards)
      columns: { create: DEFAULT_COLUMNS.map((name, position) => ({ name, position })) },
    },
  });

  revalidatePath("/boards");
  return { ok: true as const, id: board.id };
}

/** Delete a board and everything in it. Director, the region's manager, or the
 *  board's owner (personal boards). Cascades to columns/tasks/tags/templates. */
export async function deleteBoard(boardId: string) {
  const user = await requireUser();
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { regions: { select: { id: true } }, ownerId: true },
  });
  if (!board || !(await canManageBoard(user, board))) {
    return { ok: false as const, error: "Недостаточно прав" };
  }
  await prisma.board.delete({ where: { id: boardId } });
  revalidatePath("/boards");
  revalidatePath("/board/[boardId]", "page");
  return { ok: true as const };
}

export async function unlinkBoardTelegram(boardId: string) {
  const user = await requireUser();
  const board = await prisma.board.findUnique({ where: { id: boardId }, select: { regions: { select: { id: true } }, ownerId: true } });
  if (!board || !(await canManageBoard(user, board))) {
    return { ok: false as const, error: "Недостаточно прав" };
  }
  await prisma.board.update({ where: { id: boardId }, data: { telegramChatId: null } });
  revalidatePath("/board/[boardId]", "page");
  return { ok: true as const };
}
