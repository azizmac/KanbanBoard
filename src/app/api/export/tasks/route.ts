import { isDirector, visibleBoardWhere } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { priorityLabels } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
const day = (d: Date | null) => (d ? d.toLocaleDateString("ru-RU") : "");

/** CSV of all active tasks in the director's scope (Excel-friendly: BOM + ;). */
export async function GET() {
  const user = await requireUser();
  if (!isDirector(user)) return new Response("Forbidden", { status: 403 });

  const scope = await visibleBoardWhere(user);
  const tasks = await prisma.task.findMany({
    where: { archivedAt: null, column: { board: { AND: [scope, { archivedAt: null }] } } },
    orderBy: [{ createdAt: "asc" }],
    select: {
      title: true,
      priority: true,
      dueDate: true,
      createdAt: true,
      estimateMinutes: true,
      assignee: { select: { name: true } },
      column: { select: { name: true, board: { select: { name: true } } } },
      timeLogs: { select: { minutes: true } },
    },
  });

  const hours = (m: number | null) => (m ? (m / 60).toFixed(1).replace(".", ",") : "");
  const header = [
    "Доска", "Колонка", "Задача", "Исполнитель", "Приоритет",
    "Срок", "Создана", "Оценка, ч", "Затрачено, ч",
  ];
  const rows = tasks.map((t) => [
    t.column.board.name,
    t.column.name,
    t.title,
    t.assignee?.name ?? "",
    priorityLabels[t.priority],
    day(t.dueDate),
    day(t.createdAt),
    hours(t.estimateMinutes),
    hours(t.timeLogs.reduce((s, l) => s + l.minutes, 0)),
  ]);
  const csv =
    "﻿" + [header, ...rows].map((r) => r.map((c) => cell(String(c))).join(";")).join("\r\n");

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="potok-tasks-${stamp}.csv"`,
    },
  });
}
