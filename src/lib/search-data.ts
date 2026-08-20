import type { Prisma, Priority } from "@/generated/prisma/client";
import { type Actor, visibleBoardWhere } from "./access";
import { prisma } from "./prisma";
import type { TagData, UserRef } from "./types";

export type SearchFilters = {
  q?: string;
  assignee?: string; // userId, or "none" for unassigned
  priority?: string; // Priority
  tag?: string; // tag name
  due?: string; // overdue | today | week | none
  board?: string; // boardId
  status?: string; // open (default) | done | all
};

export type SearchHit = {
  id: string;
  title: string;
  priority: Priority;
  dueDate: string | null;
  overdue: boolean;
  assignee: UserRef | null;
  boardId: string;
  boardName: string;
  boardColor: string;
  columnName: string;
  tags: TagData[];
};

export type SearchOptions = {
  boards: { id: string; name: string }[];
  users: UserRef[];
  tags: string[];
  priorities: Priority[];
};

const PRIORITIES: Priority[] = ["URGENT", "HIGH", "NORMAL", "LOW"];

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Dropdown options scoped to what the user can see. */
export async function getSearchOptions(user: Actor): Promise<SearchOptions> {
  const scope = await visibleBoardWhere(user);
  const [boards, users, tags] = await Promise.all([
    prisma.board.findMany({ where: scope, orderBy: { createdAt: "asc" }, select: { id: true, name: true } }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.tag.findMany({ where: { board: scope }, select: { name: true }, distinct: ["name"], orderBy: { name: "asc" } }),
  ]);
  return { boards, users, tags: tags.map((t) => t.name), priorities: PRIORITIES };
}

/** Search tasks across the user's visible boards with optional filters. */
export async function searchTasks(user: Actor, f: SearchFilters): Promise<SearchHit[]> {
  const scope = await visibleBoardWhere(user);
  const now = new Date();

  const boardWhere: Prisma.BoardWhereInput = {
    AND: [scope, { archivedAt: null }, ...(f.board ? [{ id: f.board }] : [])],
  };
  const column: Prisma.ColumnWhereInput = { board: boardWhere };
  if (f.status === "done") column.done = true;
  else if (f.status !== "all") column.done = false; // default: open

  const where: Prisma.TaskWhereInput = { column, archivedAt: null };
  if (f.q?.trim()) where.title = { contains: f.q.trim(), mode: "insensitive" };
  if (f.assignee === "none") where.assigneeId = null;
  else if (f.assignee) where.assigneeId = f.assignee;
  if (f.priority && PRIORITIES.includes(f.priority as Priority)) where.priority = f.priority as Priority;
  if (f.tag) where.tags = { some: { name: f.tag } };

  if (f.due === "overdue") where.dueDate = { lt: now };
  else if (f.due === "today") where.dueDate = { gte: startOfDay(now), lt: new Date(startOfDay(now).getTime() + 86_400_000) };
  else if (f.due === "week") where.dueDate = { gte: startOfDay(now), lt: new Date(startOfDay(now).getTime() + 7 * 86_400_000) };
  else if (f.due === "none") where.dueDate = null;

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { priority: "desc" }],
    take: 100,
    select: {
      id: true,
      title: true,
      priority: true,
      dueDate: true,
      assignee: { select: { id: true, name: true } },
      tags: { select: { id: true, name: true, color: true } },
      column: { select: { name: true, board: { select: { id: true, name: true, color: true } } } },
    },
  });

  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    overdue: Boolean(t.dueDate && t.dueDate.getTime() < now.getTime()),
    assignee: t.assignee,
    boardId: t.column.board.id,
    boardName: t.column.board.name,
    boardColor: t.column.board.color,
    columnName: t.column.name,
    tags: t.tags,
  }));
}
