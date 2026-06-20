import type { Priority } from "@/generated/prisma/client";
import { recordActivity } from "./activity";
import { notify } from "./notify";
import { prisma } from "./prisma";
import { notifyBoardChange } from "./realtime";

export type TemplateForRun = {
  title: string;
  description: string | null;
  priority: Priority;
  boardId: string;
  columnId: string | null;
  assigneeId: string | null;
  checklist: string[];
  tags: string[];
  dueInDays: number | null;
};

/**
 * Create a task from a template. `actorId` is who/what triggered it (the template
 * creator for scheduled runs). Mirrors the web create path (activity + notify +
 * live ping). Returns the new task id, or null if the board has no columns.
 */
export async function instantiateTemplate(t: TemplateForRun, actorId: string): Promise<string | null> {
  // Resolve target column: explicit if it still belongs to the board, else first.
  let columnId = t.columnId;
  if (columnId) {
    const col = await prisma.column.findFirst({ where: { id: columnId, boardId: t.boardId }, select: { id: true } });
    if (!col) columnId = null;
  }
  if (!columnId) {
    const first = await prisma.column.findFirst({ where: { boardId: t.boardId }, orderBy: { position: "asc" }, select: { id: true } });
    if (!first) return null;
    columnId = first.id;
  }

  const count = await prisma.task.count({ where: { columnId } });
  const dueDate = t.dueInDays != null ? new Date(Date.now() + t.dueInDays * 86_400_000) : null;

  const task = await prisma.task.create({
    data: {
      title: t.title,
      description: t.description,
      priority: t.priority,
      columnId,
      creatorId: actorId,
      assigneeId: t.assigneeId,
      position: count,
      dueDate,
    },
  });

  if (t.checklist.length) {
    await prisma.checklistItem.createMany({
      data: t.checklist.map((text, i) => ({ taskId: task.id, text, position: i })),
    });
  }

  for (const name of t.tags) {
    const existing = await prisma.tag.findFirst({
      where: { boardId: t.boardId, name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    const tag = existing ?? (await prisma.tag.create({ data: { name, boardId: t.boardId } }));
    await prisma.task.update({ where: { id: task.id }, data: { tags: { connect: { id: tag.id } } } });
  }

  await recordActivity(task.id, actorId, "CREATED");
  if (t.assigneeId && t.assigneeId !== actorId) {
    await notify({
      userId: t.assigneeId,
      type: "ASSIGNED",
      message: `Вам назначена задача «${t.title}»`,
      taskId: task.id,
    });
  }
  await notifyBoardChange(t.boardId);
  return task.id;
}
