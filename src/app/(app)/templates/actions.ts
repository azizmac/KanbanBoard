"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canAccessBoard, canManageBoard } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { instantiateTemplate } from "@/lib/templates";

const schema = z.object({
  name: z.string().trim().min(1, "Введите название шаблона").max(120),
  title: z.string().trim().min(1, "Введите заголовок задачи").max(300),
  description: z.string().max(10000).nullable().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  boardId: z.string().min(1, "Выберите доску"),
  columnId: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  checklist: z.array(z.string().trim().min(1).max(200)).max(50),
  tags: z.array(z.string().trim().min(1).max(24)).max(20),
  dueInDays: z.number().int().min(0).max(365).nullable().optional(),
  recurrence: z.enum(["daily", "weekly", "monthly"]).nullable().optional(),
  weekday: z.number().int().min(1).max(7).nullable().optional(),
  monthday: z.number().int().min(1).max(31).nullable().optional(),
  hour: z.number().int().min(0).max(23),
  active: z.boolean(),
});

type Input = z.input<typeof schema>;

async function canManage(userBoardId: string) {
  const board = await prisma.board.findUnique({ where: { id: userBoardId }, select: { regionId: true, ownerId: true } });
  if (!board) return false;
  const user = await requireUser();
  return canManageBoard(user, board);
}

/** Drop fields irrelevant to the chosen recurrence; default the day when needed. */
function normalize(data: z.infer<typeof schema>) {
  const rec = data.recurrence ?? null;
  return {
    ...data,
    description: data.description?.trim() || null,
    columnId: data.columnId || null,
    assigneeId: data.assigneeId || null,
    dueInDays: data.dueInDays ?? null,
    recurrence: rec,
    weekday: rec === "weekly" ? (data.weekday ?? 1) : null,
    monthday: rec === "monthly" ? (data.monthday ?? 1) : null,
  };
}

export async function createTemplate(input: Input) {
  const user = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Ошибка" };
  if (!(await canManage(parsed.data.boardId))) return { ok: false as const, error: "Нет прав на эту доску" };

  const d = normalize(parsed.data);
  await prisma.taskTemplate.create({ data: { ...d, creatorId: user.id } });
  revalidatePath("/templates");
  return { ok: true as const };
}

export async function updateTemplate(id: string, input: Input) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Ошибка" };

  const existing = await prisma.taskTemplate.findUnique({ where: { id }, select: { boardId: true } });
  if (!existing) return { ok: false as const, error: "Шаблон не найден" };
  if (!(await canManage(existing.boardId)) || !(await canManage(parsed.data.boardId))) {
    return { ok: false as const, error: "Нет прав" };
  }

  const d = normalize(parsed.data);
  await prisma.taskTemplate.update({ where: { id }, data: d });
  revalidatePath("/templates");
  return { ok: true as const };
}

export async function deleteTemplate(id: string) {
  const existing = await prisma.taskTemplate.findUnique({ where: { id }, select: { boardId: true } });
  if (!existing) return { ok: false as const };
  if (!(await canManage(existing.boardId))) return { ok: false as const, error: "Нет прав" };
  await prisma.taskTemplate.delete({ where: { id } });
  revalidatePath("/templates");
  return { ok: true as const };
}

/** Create a task from the template right now. */
export async function runTemplate(id: string) {
  const user = await requireUser();
  const t = await prisma.taskTemplate.findUnique({ where: { id } });
  if (!t) return { ok: false as const, error: "Шаблон не найден" };
  if (!(await canAccessBoard(user, t.boardId))) return { ok: false as const, error: "Нет доступа к доске" };

  const taskId = await instantiateTemplate(t, user.id);
  if (!taskId) return { ok: false as const, error: "На доске нет колонок" };
  revalidatePath("/board/[boardId]", "page");
  return { ok: true as const, taskId };
}
