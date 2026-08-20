import { type Actor, visibleBoardWhere } from "./access";
import { prisma } from "./prisma";

export type PersonLoad = { id: string; name: string; open: number; overdue: number };
export type BoardLoad = { id: string; name: string; color: string; open: number; overdue: number };
export type DayBucket = { label: string; count: number };

export type DashboardData = {
  totals: { open: number; overdue: number; completed7d: number; boards: number };
  cycleTimeDays: number | null; // avg days from creation to a done column (last 7d), null if none
  perPerson: PersonLoad[];
  perBoard: BoardLoad[];
  throughput: DayBucket[]; // completions per day, last 7 days
};

const DAY = 86_400_000;

/** Leadership analytics, scoped to the boards the user may see. */
export async function getDashboard(user: Actor): Promise<DashboardData> {
  const scope = await visibleBoardWhere(user);
  const now = Date.now();
  const since = new Date(now - 7 * DAY);

  // One pass over all OPEN (not done) tasks in scope; aggregate in JS.
  const open = await prisma.task.findMany({
    where: { archivedAt: null, column: { done: false, board: { AND: [scope, { archivedAt: null }] } } },
    select: {
      dueDate: true,
      assignee: { select: { id: true, name: true } },
      column: { select: { board: { select: { id: true, name: true, color: true } } } },
    },
  });

  const people = new Map<string, PersonLoad>();
  const boards = new Map<string, BoardLoad>();
  let overdueTotal = 0;

  for (const t of open) {
    const overdue = Boolean(t.dueDate && t.dueDate.getTime() < now);
    if (overdue) overdueTotal += 1;

    if (t.assignee) {
      const p = people.get(t.assignee.id) ?? { id: t.assignee.id, name: t.assignee.name, open: 0, overdue: 0 };
      p.open += 1;
      if (overdue) p.overdue += 1;
      people.set(t.assignee.id, p);
    }

    const b = t.column.board;
    const bl = boards.get(b.id) ?? { id: b.id, name: b.name, color: b.color, open: 0, overdue: 0 };
    bl.open += 1;
    if (overdue) bl.overdue += 1;
    boards.set(b.id, bl);
  }

  // Completions = status changes onto a task that currently sits in a done column.
  const completionWhere = {
    kind: "STATUS_CHANGED" as const,
    createdAt: { gte: since },
    task: { column: { done: true, board: scope } },
  };
  const [completed7d, completions, boardCount] = await Promise.all([
    prisma.activity.count({ where: completionWhere }),
    prisma.activity.findMany({
      where: completionWhere,
      select: { createdAt: true, task: { select: { createdAt: true } } },
    }),
    prisma.board.count({ where: scope }),
  ]);

  // Cycle time: average days from a task's creation to its completion event.
  let cycleSum = 0;
  let cycleN = 0;
  for (const a of completions) {
    if (a.task) {
      cycleSum += a.createdAt.getTime() - a.task.createdAt.getTime();
      cycleN += 1;
    }
  }
  const cycleTimeDays = cycleN ? Math.round((cycleSum / cycleN / DAY) * 10) / 10 : null;

  // Bucket completions into the last 7 calendar days (index 6 = today).
  const startOfDay = (ms: number) => {
    const d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const today0 = startOfDay(now);
  const days: DayBucket[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today0 - i * DAY);
    days.push({ label: d.toLocaleDateString("ru-RU", { weekday: "short" }), count: 0 });
  }
  for (const a of completions) {
    const idx = 6 - Math.round((today0 - startOfDay(a.createdAt.getTime())) / DAY);
    if (idx >= 0 && idx <= 6) days[idx].count += 1;
  }

  return {
    totals: { open: open.length, overdue: overdueTotal, completed7d, boards: boardCount },
    cycleTimeDays,
    perPerson: [...people.values()].sort((a, b) => b.overdue - a.overdue || b.open - a.open),
    perBoard: [...boards.values()].sort((a, b) => b.open - a.open),
    throughput: days,
  };
}
