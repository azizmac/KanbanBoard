"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canManageBoard } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Terminal (done) column is flagged in the DB. It can be renamed, but not
// deleted or moved off the end — stats, search and the bot key off `done`.

const nameSchema = z.string().trim().min(1, "Введите название").max(40);

async function loadManageable(boardId: string) {
  const user = await requireUser();
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { id: true, regions: { select: { id: true } }, ownerId: true },
  });
  if (!board || !(await canManageBoard(user, board))) return null;
  return board;
}

async function columnsOf(boardId: string) {
  return prisma.column.findMany({
    where: { boardId },
    orderBy: { position: "asc" },
    select: { id: true, name: true, position: true, done: true, _count: { select: { tasks: true } } },
  });
}

function ok(boardId: string) {
  revalidatePath("/board/[boardId]", "page");
  revalidatePath("/boards");
  return { ok: true as const, boardId };
}

/** Add a column, inserted just before the terminal done column. */
export async function addColumn(boardId: string, name = "Новая колонка") {
  if (!(await loadManageable(boardId))) return { ok: false as const, error: "Недостаточно прав" };
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message };

  const cols = await columnsOf(boardId);
  const doneIdx = cols.findIndex((c) => c.done);
  const at = doneIdx === -1 ? cols.length : doneIdx;
  await prisma.$transaction([
    ...cols.slice(at).map((c) =>
      prisma.column.update({ where: { id: c.id }, data: { position: c.position + 1 } }),
    ),
    prisma.column.create({ data: { name: parsed.data, boardId, position: at, done: false } }),
  ]);
  return ok(boardId);
}

export async function renameColumn(columnId: string, name: string) {
  const col = await prisma.column.findUnique({ where: { id: columnId }, select: { boardId: true, done: true } });
  if (!col || !(await loadManageable(col.boardId))) return { ok: false as const, error: "Недостаточно прав" };
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message };
  await prisma.column.update({ where: { id: columnId }, data: { name: parsed.data } });
  return ok(col.boardId);
}

export async function deleteColumn(columnId: string) {
  const col = await prisma.column.findUnique({
    where: { id: columnId },
    select: { boardId: true, done: true, _count: { select: { tasks: true } } },
  });
  if (!col || !(await loadManageable(col.boardId))) return { ok: false as const, error: "Недостаточно прав" };
  if (col.done) return { ok: false as const, error: "Финальную колонку удалить нельзя" };
  if (col._count.tasks > 0) return { ok: false as const, error: "Сначала перенесите задачи из колонки" };
  await prisma.column.delete({ where: { id: columnId } });
  return ok(col.boardId);
}

export async function moveColumn(columnId: string, dir: "left" | "right") {
  const col = await prisma.column.findUnique({ where: { id: columnId }, select: { boardId: true, done: true } });
  if (!col || !(await loadManageable(col.boardId))) return { ok: false as const, error: "Недостаточно прав" };
  if (col.done) return { ok: false as const, error: "Финальная колонка всегда последняя" };

  const cols = await columnsOf(col.boardId);
  const i = cols.findIndex((c) => c.id === columnId);
  const j = dir === "left" ? i - 1 : i + 1;
  if (j < 0 || j >= cols.length || cols[j].done) {
    return { ok: false as const, error: "Дальше двигать нельзя" };
  }
  await prisma.$transaction([
    prisma.column.update({ where: { id: cols[i].id }, data: { position: cols[j].position } }),
    prisma.column.update({ where: { id: cols[j].id }, data: { position: cols[i].position } }),
  ]);
  return ok(col.boardId);
}

export async function setColumnWip(columnId: string, limit: number | null) {
  const col = await prisma.column.findUnique({ where: { id: columnId }, select: { boardId: true } });
  if (!col || !(await loadManageable(col.boardId))) return { ok: false as const, error: "Недостаточно прав" };
  const value = limit && limit > 0 ? Math.min(Math.floor(limit), 99) : null;
  await prisma.column.update({ where: { id: columnId }, data: { wipLimit: value } });
  return ok(col.boardId);
}
