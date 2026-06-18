"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
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

  revalidatePath("/board");
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

  revalidatePath("/board");
  return { ok: true as const };
}
