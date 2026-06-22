import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { type DeadlineItem, getDeadlines } from "@/lib/calendar-data";
import { tint } from "@/lib/tints";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;
const startOfDay = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

function dayLabel(ms: number, today0: number) {
  const diff = Math.round((startOfDay(ms) - today0) / DAY);
  if (diff === 0) return "Сегодня";
  if (diff === 1) return "Завтра";
  return new Date(ms).toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" });
}

export default async function CalendarPage() {
  const user = await requireUser();
  const items = await getDeadlines(user);
  const today0 = startOfDay(Date.now());

  const overdue = items.filter((i) => i.overdue);
  const groups = new Map<number, DeadlineItem[]>();
  for (const i of items) {
    if (i.overdue) continue;
    const k = startOfDay(new Date(i.due).getTime());
    const arr = groups.get(k) ?? [];
    arr.push(i);
    groups.set(k, arr);
  }
  const dayKeys = [...groups.keys()].sort((a, b) => a - b);

  return (
    <div className="mx-auto max-w-[760px] px-5 py-7 sm:px-9">
      <h1 className="text-[25px] font-bold tracking-[-0.03em]">Календарь</h1>
      <p className="mb-6 mt-1 text-sm text-[var(--color-muted)]">
        Дедлайны задач и подзадач — {items.length} со сроком.
      </p>

      {items.length === 0 && (
        <p className="rounded-[12px] border border-dashed border-[var(--color-line)] py-12 text-center text-sm text-[var(--color-muted)]">
          Нет задач со сроком.
        </p>
      )}

      {overdue.length > 0 && <Group title="Просрочено" items={overdue} danger />}
      {dayKeys.map((k) => (
        <Group key={k} title={dayLabel(k, today0)} items={groups.get(k)!} />
      ))}
    </div>
  );
}

function Group({ title, items, danger }: { title: string; items: DeadlineItem[]; danger?: boolean }) {
  return (
    <section className="mb-6">
      <h2 className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.04em] ${danger ? "text-[var(--color-urgent)]" : "text-[var(--color-faint)]"}`}>
        {title} · {items.length}
      </h2>
      <div className="space-y-2">
        {items.map((i, idx) => (
          <Row key={`${i.kind}-${i.taskId}-${idx}`} item={i} />
        ))}
      </div>
    </section>
  );
}

function Row({ item }: { item: DeadlineItem }) {
  const c = tint(item.board.color);
  return (
    <Link
      href={`/task/${item.taskId}`}
      className="flex items-center gap-3 rounded-[12px] border border-[var(--color-border-card)] bg-[var(--color-surface)] px-3.5 py-2.5 transition hover:border-[var(--color-accent)]/40"
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.text }} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-medium text-[var(--color-ink)]">{item.title}</div>
        <div className="truncate text-[12px] text-[var(--color-muted)]">
          {item.kind === "subtask" && <span>↳ {item.parentTitle} · </span>}
          <span style={{ color: c.text }}>{item.board.name}</span>
          {item.assignee ? ` · ${item.assignee}` : ""}
        </div>
      </div>
      {item.kind === "subtask" && (
        <span className="shrink-0 rounded bg-[var(--color-surface-warm)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-muted)]">
          подзадача
        </span>
      )}
    </Link>
  );
}
