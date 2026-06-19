"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { can, requireUser } from "@/lib/auth";
import { processMentions } from "@/lib/mentions";
import { notify } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { deleteStoredFile } from "@/lib/storage";

const updateSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  description: z.string().max(10000).nullable().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  columnId: z.string().min(1).optional(),
});

export async function updateTask(
  taskId: string,
  input: z.input<typeof updateSchema>,
) {
  const user = await requireUser();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Некорректные данные" };

  const current = await prisma.task.findUnique({ where: { id: taskId } });
  if (!current) return { ok: false as const, error: "Задача не найдена" };

  const data = parsed.data;
  const patch: Record<string, unknown> = {};
  if (data.title !== undefined) patch.title = data.title;
  if (data.description !== undefined) patch.description = data.description || null;
  if (data.priority !== undefined) patch.priority = data.priority;
  if (data.dueDate !== undefined) patch.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  if (data.assigneeId !== undefined) patch.assigneeId = data.assigneeId || null;
  if (data.columnId !== undefined) {
    // place at the end of the destination column
    const count = await prisma.task.count({ where: { columnId: data.columnId } });
    patch.columnId = data.columnId;
    patch.position = count;
  }

  const updated = await prisma.task.update({ where: { id: taskId }, data: patch });

  // Notify a newly-assigned user (skip self-assignment).
  const newAssignee = patch.assigneeId as string | null | undefined;
  if (
    newAssignee !== undefined &&
    newAssignee &&
    newAssignee !== current.assigneeId &&
    newAssignee !== user.id
  ) {
    await notify({
      userId: newAssignee,
      type: "ASSIGNED",
      message: `${user.name} назначил(а) вам задачу «${updated.title}»`,
      taskId,
    });
  }

  // Re-scan description for new mentions.
  if (data.description !== undefined && updated.description) {
    await processMentions({
      text: updated.description,
      actorId: user.id,
      actorName: user.name,
      taskId,
      taskTitle: updated.title,
    });
  }

  revalidatePath(`/task/${taskId}`);
  revalidatePath("/board/[boardId]", "page");
  return { ok: true as const };
}

const commentSchema = z.string().trim().min(1, "Пустой комментарий").max(5000);

export async function addComment(taskId: string, body: string) {
  const user = await requireUser();
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message };

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return { ok: false as const, error: "Задача не найдена" };

  const comment = await prisma.comment.create({
    data: { taskId, authorId: user.id, body: parsed.data },
  });

  // Notify the assignee about the new comment (unless they wrote it).
  if (task.assigneeId && task.assigneeId !== user.id) {
    await notify({
      userId: task.assigneeId,
      type: "COMMENTED",
      message: `${user.name} прокомментировал(а) задачу «${task.title}»`,
      taskId,
    });
  }

  await processMentions({
    text: parsed.data,
    actorId: user.id,
    actorName: user.name,
    taskId,
    taskTitle: task.title,
    commentId: comment.id,
  });

  revalidatePath(`/task/${taskId}`);
  revalidatePath("/board/[boardId]", "page");
  return { ok: true as const };
}

export async function deleteTask(taskId: string) {
  const user = await requireUser();
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return { ok: false as const, error: "Задача не найдена" };
  if (task.creatorId !== user.id && !can(user, "deleteAnyTask")) {
    return { ok: false as const, error: "Недостаточно прав" };
  }
  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath("/board/[boardId]", "page");
  return { ok: true as const };
}

export async function deleteAttachment(attachmentId: string) {
  const user = await requireUser();
  const att = await prisma.attachment.findUnique({ where: { id: attachmentId } });
  if (!att) return { ok: false as const };
  if (att.uploaderId !== user.id && !can(user, "deleteAnyTask")) {
    return { ok: false as const, error: "Недостаточно прав" };
  }
  await prisma.attachment.delete({ where: { id: attachmentId } });
  await deleteStoredFile(att.storedName);
  revalidatePath(`/task/${att.taskId}`);
  return { ok: true as const };
}

// ----- Tags -----

const tagSchema = z.object({
  name: z.string().trim().min(1, "Введите тег").max(24),
  color: z.string().trim().max(20).optional(),
});

/** Attach a tag to a task, creating it on the board if it doesn't exist yet. */
export async function addTaskTag(taskId: string, input: z.input<typeof tagSchema>) {
  await requireUser();
  const parsed = tagSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message };

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { column: { select: { boardId: true } } },
  });
  if (!task) return { ok: false as const, error: "Задача не найдена" };

  const boardId = task.column.boardId;
  const name = parsed.data.name;
  let tag = await prisma.tag.findFirst({
    where: { boardId, name: { equals: name, mode: "insensitive" } },
  });
  if (!tag) {
    tag = await prisma.tag.create({ data: { name, color: parsed.data.color ?? "gray", boardId } });
  }
  await prisma.task.update({ where: { id: taskId }, data: { tags: { connect: { id: tag.id } } } });

  revalidatePath(`/task/${taskId}`);
  revalidatePath("/board/[boardId]", "page");
  return { ok: true as const, tag: { id: tag.id, name: tag.name, color: tag.color } };
}

export async function removeTaskTag(taskId: string, tagId: string) {
  await requireUser();
  await prisma.task.update({ where: { id: taskId }, data: { tags: { disconnect: { id: tagId } } } });
  revalidatePath(`/task/${taskId}`);
  revalidatePath("/board/[boardId]", "page");
  return { ok: true as const };
}

// ----- Checklist -----

const checklistTextSchema = z.string().trim().min(1, "Пустой пункт").max(200);

export async function addChecklistItem(taskId: string, text: string) {
  await requireUser();
  const parsed = checklistTextSchema.safeParse(text);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message };

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return { ok: false as const, error: "Задача не найдена" };

  const count = await prisma.checklistItem.count({ where: { taskId } });
  const item = await prisma.checklistItem.create({
    data: { taskId, text: parsed.data, position: count },
  });
  revalidatePath(`/task/${taskId}`);
  return { ok: true as const, item: { id: item.id, text: item.text, done: item.done } };
}

export async function toggleChecklistItem(itemId: string, done: boolean) {
  await requireUser();
  const item = await prisma.checklistItem.update({ where: { id: itemId }, data: { done } });
  revalidatePath(`/task/${item.taskId}`);
  revalidatePath("/board/[boardId]", "page");
  return { ok: true as const };
}

export async function deleteChecklistItem(itemId: string) {
  await requireUser();
  const item = await prisma.checklistItem.findUnique({ where: { id: itemId } });
  if (!item) return { ok: false as const };
  await prisma.checklistItem.delete({ where: { id: itemId } });
  revalidatePath(`/task/${item.taskId}`);
  return { ok: true as const };
}
