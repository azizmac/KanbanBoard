import { type Actor, visibleBoardWhere } from "./access";
import { prisma } from "./prisma";

export type DeadlineItem = {
  taskId: string; // link target (the parent task for subtasks)
  title: string;
  kind: "task" | "subtask";
  parentTitle: string | null;
  due: string; // ISO
  overdue: boolean;
  board: { name: string; color: string };
  assignee: string | null;
  assigneeId: string | null;
  regionIds: string[];
  mine: boolean;
};

export type CalendarRegion = { id: string; name: string };

/** Regions that appear on the user's visible boards — for the calendar filter. */
export async function getCalendarRegions(user: Actor): Promise<CalendarRegion[]> {
  const scope = await visibleBoardWhere(user);
  const boards = await prisma.board.findMany({
    where: { AND: [scope, { archivedAt: null }] },
    select: { regions: { select: { id: true, name: true } } },
  });
  const map = new Map<string, string>();
  for (const b of boards) {
    for (const r of b.regions) map.set(r.id, r.name);
  }
  return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

/** Open tasks + undone subtasks that have a due date, across the user's visible
 *  (non-archived) boards. Sorted soonest-first. */
export async function getDeadlines(
  user: Actor,
  opts: { mine?: boolean; regionId?: string } = {},
): Promise<DeadlineItem[]> {
  const scope = await visibleBoardWhere(user);
  const boardScope = {
    AND: [
      scope,
      { archivedAt: null },
      ...(opts.regionId ? [{ regions: { some: { id: opts.regionId } } }] : []),
    ],
  };
  const now = Date.now();
  const mineFilter = opts.mine ? { assigneeId: user.id } : {};

  const [tasks, subs] = await Promise.all([
    prisma.task.findMany({
      where: {
        archivedAt: null,
        dueDate: { not: null },
        column: { done: false, board: boardScope },
        ...mineFilter,
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        assigneeId: true,
        assignee: { select: { name: true } },
        column: { select: { board: { select: { name: true, color: true, regions: { select: { id: true } } } } } },
      },
    }),
    prisma.checklistItem.findMany({
      where: {
        done: false,
        dueDate: { not: null },
        ...(opts.mine ? { assigneeId: user.id } : {}),
        task: { archivedAt: null, column: { board: boardScope } },
      },
      select: {
        text: true,
        dueDate: true,
        assigneeId: true,
        assignee: { select: { name: true } },
        task: {
          select: {
            id: true,
            title: true,
            column: { select: { board: { select: { name: true, color: true, regions: { select: { id: true } } } } } },
          },
        },
      },
    }),
  ]);

  const items: DeadlineItem[] = [
    ...tasks.map((t) => ({
      taskId: t.id,
      title: t.title,
      kind: "task" as const,
      parentTitle: null,
      due: t.dueDate!.toISOString(),
      overdue: t.dueDate!.getTime() < now,
      board: { name: t.column.board.name, color: t.column.board.color },
      assignee: t.assignee?.name ?? null,
      assigneeId: t.assigneeId,
      regionIds: t.column.board.regions.map((r) => r.id),
      mine: t.assigneeId === user.id,
    })),
    ...subs.map((s) => ({
      taskId: s.task.id,
      title: s.text,
      kind: "subtask" as const,
      parentTitle: s.task.title,
      due: s.dueDate!.toISOString(),
      overdue: s.dueDate!.getTime() < now,
      board: { name: s.task.column.board.name, color: s.task.column.board.color },
      assignee: s.assignee?.name ?? null,
      assigneeId: s.assigneeId,
      regionIds: s.task.column.board.regions.map((r) => r.id),
      mine: s.assigneeId === user.id,
    })),
  ];

  items.sort((a, b) => a.due.localeCompare(b.due));
  return items;
}
