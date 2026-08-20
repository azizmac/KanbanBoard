"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { addDays, addMonths, monthGrid, toIsoDate, weekGrid } from "@/lib/calendar-grid";
import type { CalendarRegion, DeadlineItem } from "@/lib/calendar-data";
import { tint } from "@/lib/tints";

const WEEKDAYS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

export function CalendarView({
  items,
  regions,
}: {
  items: DeadlineItem[];
  regions: CalendarRegion[];
}) {
  const now = new Date();
  const [view, setView] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState(() => ({ year: now.getFullYear(), month: now.getMonth(), day: now.getDate() }));
  const [mine, setMine] = useState(false);
  const [regionId, setRegionId] = useState("");
  const [picked, setPicked] = useState<string | null>(toIsoDate(now));

  const filtered = useMemo(
    () =>
      items.filter((i) => {
        if (mine && !i.mine) return false;
        if (regionId && !i.regionIds.includes(regionId)) return false;
        return true;
      }),
    [items, mine, regionId],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, DeadlineItem[]>();
    for (const i of filtered) {
      const k = dayKey(i.due);
      const arr = map.get(k) ?? [];
      arr.push(i);
      map.set(k, arr);
    }
    return map;
  }, [filtered]);

  const anchor = new Date(cursor.year, cursor.month, cursor.day);
  const cells = view === "month" ? monthGrid(cursor.year, cursor.month, now) : weekGrid(anchor, now);
  const title =
    view === "month"
      ? new Date(cursor.year, cursor.month, 1).toLocaleDateString("ru-RU", { month: "long", year: "numeric" })
      : `${cells[0].day}–${cells[6].day} ${new Date(cells[0].iso + "T12:00:00").toLocaleDateString("ru-RU", { month: "long" })}`;

  function shift(dir: number) {
    if (view === "month") {
      const n = addMonths(cursor.year, cursor.month, dir);
      setCursor({ year: n.year, month: n.month, day: 1 });
    } else {
      const d = addDays(anchor, dir * 7);
      setCursor({ year: d.getFullYear(), month: d.getMonth(), day: d.getDate() });
    }
  }

  const overdue = filtered.filter((i) => i.overdue);
  const selected = picked ? (byDay.get(picked) ?? []).filter((i) => !i.overdue) : [];
  const selectedOverdue = picked ? (byDay.get(picked) ?? []).filter((i) => i.overdue) : [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-[10px] border border-[var(--color-border-input)] bg-[var(--color-surface)] p-0.5">
          {(["month", "week"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-[8px] px-3 py-1.5 text-[12.5px] font-medium ${
                view === v ? "bg-[var(--color-sidebar)] text-white" : "text-[var(--color-muted)]"
              }`}
            >
              {v === "month" ? "Месяц" : "Неделя"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => shift(-1)}
            className="grid h-8 w-8 place-items-center rounded-[8px] text-[var(--color-muted)] hover:bg-[var(--color-surface-warm)]"
            aria-label="Назад"
          >
            ←
          </button>
          <div className="min-w-[160px] text-center text-[14px] font-semibold capitalize text-[var(--color-ink)]">
            {title}
          </div>
          <button
            onClick={() => shift(1)}
            className="grid h-8 w-8 place-items-center rounded-[8px] text-[var(--color-muted)] hover:bg-[var(--color-surface-warm)]"
            aria-label="Вперёд"
          >
            →
          </button>
        </div>
        <button
          onClick={() => {
            const t = new Date();
            setCursor({ year: t.getFullYear(), month: t.getMonth(), day: t.getDate() });
            setPicked(toIsoDate(t));
          }}
          className="rounded-[8px] border border-[var(--color-border-input)] px-2.5 py-1.5 text-[12.5px] font-medium text-[var(--color-muted)] hover:text-[var(--color-ink)]"
        >
          Сегодня
        </button>
        <label className="ml-auto flex items-center gap-1.5 text-[12.5px] text-[var(--color-muted)]">
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
          Только мои
        </label>
        {regions.length > 0 && (
          <select
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
            className="h-8 rounded-[8px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-2 text-[12.5px] outline-none"
          >
            <option value="">Все регионы</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className={`grid gap-1 ${view === "month" ? "grid-cols-7" : "grid-cols-7"}`}>
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-1 pb-1 text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--color-faint)]">
            {d}
          </div>
        ))}
        {cells.map((c) => {
          const dayItems = byDay.get(c.iso) ?? [];
          const open = dayItems.filter((i) => !i.overdue);
          const hot = dayItems.filter((i) => i.overdue);
          const active = picked === c.iso;
          return (
            <button
              key={c.iso}
              onClick={() => setPicked(c.iso)}
              className={`min-h-[72px] rounded-[10px] border px-1.5 py-1.5 text-left transition ${
                active
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                  : "border-transparent hover:bg-[var(--color-surface-warm)]"
              } ${c.inMonth ? "" : "opacity-40"}`}
            >
              <div className={`text-[12.5px] font-semibold ${c.isToday ? "text-[var(--color-accent)]" : "text-[var(--color-ink)]"}`}>
                {c.day}
              </div>
              {hot.length > 0 && (
                <div className="mt-1 truncate text-[10.5px] font-medium text-[var(--color-urgent)]">
                  {hot.length} просроч.
                </div>
              )}
              {open.slice(0, view === "week" ? 3 : 2).map((i) => (
                <div key={i.taskId + i.title} className="mt-0.5 truncate text-[10.5px] text-[var(--color-muted)]">
                  {i.title}
                </div>
              ))}
              {open.length > (view === "week" ? 3 : 2) && (
                <div className="text-[10px] text-[var(--color-faint)]">+{open.length - (view === "week" ? 3 : 2)}</div>
              )}
            </button>
          );
        })}
      </div>

      {overdue.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-urgent)]">Просрочено</h3>
          <ItemList items={overdue} />
        </div>
      )}

      {picked && (
        <div className="mt-6">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-faint)]">
            {new Date(picked + "T12:00:00").toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
          </h3>
          {selected.length === 0 && selectedOverdue.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">Нет дедлайнов в этот день.</p>
          ) : (
            <ItemList items={[...selectedOverdue, ...selected]} />
          )}
        </div>
      )}
    </div>
  );
}

function ItemList({ items }: { items: DeadlineItem[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((i) => {
        const c = tint(i.board.color);
        return (
          <li key={`${i.kind}-${i.taskId}-${i.title}`}>
            <Link
              href={`/task/${i.taskId}`}
              className="flex items-center gap-3 rounded-[12px] border border-[var(--color-border-card)] bg-[var(--color-surface)] px-3.5 py-2.5 hover:border-[var(--color-accent)]/40"
            >
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-[5px] text-[10px] font-bold" style={{ background: c.bg, color: c.text }}>
                {i.board.name.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <div className={`truncate text-[13.5px] font-medium ${i.overdue ? "text-[var(--color-urgent)]" : "text-[var(--color-ink)]"}`}>
                  {i.title}
                </div>
                <div className="text-[12px] text-[var(--color-muted)]">
                  {i.board.name}
                  {i.kind === "subtask" && i.parentTitle ? ` · ${i.parentTitle}` : ""}
                  {i.assignee ? ` · ${i.assignee}` : ""}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
