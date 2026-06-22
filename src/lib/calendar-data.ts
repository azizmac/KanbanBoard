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
};

/** Open tasks + undone subtasks that have a due date, across the user's visible
 *  (non-archived) boards. Sorted soonest-first. */
export async function getDeadlines(user: Actor): Promise<DeadlineItem[]> {
  const scope = await visibleBoardWhere(user);
  const boardScope = { AND: [scope, { archivedAt: null }] };
  const now = Date.now();

  const [tasks, subs] = await Promise.all([
    prisma.task.findMany({
      where: {
        archivedAt: null,
        dueDate: { not: null },
        column: { name: { not: "Готово" }, board: boardScope },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        assignee: { select: { name: true } },
        column: { select: { board: { select: { name: true, color: true } } } },
      },
    }),
    prisma.checklistItem.findMany({
      where: {
        done: false,
        dueDate: { not: null },
        task: { archivedAt: null, column: { board: boardScope } },
      },
      select: {
        text: true,
        dueDate: true,
        assignee: { select: { name: true } },
        task: {
          select: { id: true, title: true, column: { select: { board: { select: { name: true, color: true } } } } },
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
      board: t.column.board,
      assignee: t.assignee?.name ?? null,
    })),
    ...subs.map((s) => ({
      taskId: s.task.id,
      title: s.text,
      kind: "subtask" as const,
      parentTitle: s.task.title,
      due: s.dueDate!.toISOString(),
      overdue: s.dueDate!.getTime() < now,
      board: s.task.column.board,
      assignee: s.assignee?.name ?? null,
    })),
  ];

  items.sort((a, b) => a.due.localeCompare(b.due));
  return items;
}
