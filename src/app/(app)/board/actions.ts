"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { can, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  revalidatePath("/board/[boardId]", "page");
  return { ok: true as const };
}

const DEFAULT_COLUMNS = ["Бэклог", "В работе", "На ревью", "Готово"];
const boardSchema = z.object({
  name: z.string().trim().min(1, "Введите название").max(120),
  color: z.string().trim().max(20).optional(),
});

// Anyone who can manage the board (admin/manager) may create a new board.
export async function createBoard(input: { name: string; color?: string }) {
  const user = await requireUser();
  if (!can(user, "manageBoard")) {
    return { ok: false as const, error: "Недостаточно прав" };
  }
  const parsed = boardSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Ошибка" };
  }

  const board = await prisma.board.create({
    data: {
      name: parsed.data.name,
      color: parsed.data.color ?? "iris",
      columns: { create: DEFAULT_COLUMNS.map((name, position) => ({ name, position })) },
    },
  });

  revalidatePath("/boards");
  return { ok: true as const, id: board.id };
}
