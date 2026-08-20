// Task mutations triggered from the Telegram bot (inline buttons + /new).
// Mirrors the web server actions: same history (recordActivity) and the same
// assignee push (notify). Every function is best-effort and returns a small
// result object instead of throwing, so a bad tap can't crash the poll loop.
import type { Role } from "@/generated/prisma/client";
import { canAccessBoard, isDirector } from "./access";
import { recordActivity } from "./activity";
import { notify } from "./notify";
import { prisma } from "./prisma";
import { notifyBoardChange, notifyTaskChange } from "./realtime";

export type Actor = { id: string; name: string; role: Role };

/** A linked user may act on a task if they're a director, the assignee/creator,
 *  or have access to its board. */
export async function canActOnTask(
  user: Actor,
  task: { assigneeId: string | null; creatorId: string; column: { boardId: string } },
): Promise<boolean> {
  if (isDirector(user)) return true;
  if (task.assigneeId === user.id || task.creatorId === user.id) return true;
  return canAccessBoard(user, task.column.boardId);
}

/** Load a task with the bits needed for permission checks. */
export function loadTask(taskId: string) {
  return prisma.task.findUnique({
    where: { id: taskId },
    include: { column: { select: { boardId: true, name: true } } },
  });
}

/** Active users who can access a board (small team → fine to filter in JS). */
export async function assignableUsers(boardId: string) {
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
  const out: { id: string; name: string }[] = [];
  for (const u of users) {
    if (await canAccessBoard(u, boardId)) out.push({ id: u.id, name: u.name });
  }
  return out.slice(0, 20);
}

/** Move a task into its board's «Готово» column. */
export async function completeTask(taskId: string, actor: Actor) {
  const task = await loadTask(taskId);
  if (!task) return { ok: false as const, error: "Задача не найдена" };
  const done = await prisma.column.findFirst({
    where: { boardId: task.column.boardId, done: true },
    orderBy: { position: "asc" },
  });
  if (!done) return { ok: false as const, error: "На доске нет финальной колонки" };
  const fresh = await prisma.task.findUnique({ where: { id: taskId }, select: { title: true, columnId: true } });
  if (!fresh) return { ok: false as const, error: "Задача не найдена" };
  if (fresh.columnId === done.id) return { ok: true as const, title: fresh.title, already: true };
  const count = await prisma.task.count({ where: { columnId: done.id } });
  await prisma.task.update({ where: { id: taskId }, data: { columnId: done.id, position: count } });
  await recordActivity(taskId, actor.id, "STATUS_CHANGED", `${task.column.name} → ${done.name}`);
  await notifyBoardChange(task.column.boardId);
  return { ok: true as const, title: fresh.title };
}

/** Push a task's due date out by N days (from the later of now / current due). */
export async function snoozeTask(taskId: string, actor: Actor, days = 1) {
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { title: true, dueDate: true } });
  if (!task) return { ok: false as const, error: "Задача не найдена" };
  const base = task.dueDate && task.dueDate.getTime() > Date.now() ? task.dueDate : new Date();
  const due = new Date(base.getTime() + days * 86_400_000);
  await prisma.task.update({ where: { id: taskId }, data: { dueDate: due } });
  await recordActivity(taskId, actor.id, "DUE_CHANGED", due.toLocaleDateString("ru-RU", { day: "numeric", month: "long" }));
  await notifyTaskChange(taskId);
  return { ok: true as const, title: task.title, due };
}

/** Reassign a task and notify the new assignee (unless it's the actor). */
export async function reassignTask(taskId: string, actor: Actor, newAssigneeId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { title: true } });
  if (!task) return { ok: false as const, error: "Задача не найдена" };
  const u = await prisma.user.findUnique({ where: { id: newAssigneeId }, select: { name: true } });
  if (!u) return { ok: false as const, error: "Пользователь не найден" };
  await prisma.task.update({ where: { id: taskId }, data: { assigneeId: newAssigneeId } });
  await recordActivity(taskId, actor.id, "ASSIGNED", u.name);
  await notifyTaskChange(taskId);
  if (newAssigneeId !== actor.id) {
    await notify({
      userId: newAssigneeId,
      type: "ASSIGNED",
      message: `${actor.name} назначил(а) вам задачу «${task.title}»`,
      taskId,
    });
  }
  return { ok: true as const, title: task.title, assignee: u.name };
}

/** Create a task in a board's first column (used by /new in a linked group). */
export async function createTaskInBoard(boardId: string, actor: Actor, title: string) {
  const trimmed = title.trim();
  if (!trimmed) return { ok: false as const, error: "Пустое название" };
  const col = await prisma.column.findFirst({ where: { boardId }, orderBy: { position: "asc" } });
  if (!col) return { ok: false as const, error: "На доске нет колонок" };
  const count = await prisma.task.count({ where: { columnId: col.id } });
  const task = await prisma.task.create({
    data: { title: trimmed.slice(0, 300), columnId: col.id, creatorId: actor.id, position: count },
  });
  await recordActivity(task.id, actor.id, "CREATED");
  await notifyBoardChange(boardId);
  return { ok: true as const, id: task.id, title: task.title };
}
