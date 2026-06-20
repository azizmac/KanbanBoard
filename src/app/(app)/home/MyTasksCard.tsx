"use client";

import Link from "next/link";
import { useState } from "react";
import { priorityDot } from "@/lib/constants";
import type { MyTaskRow } from "@/lib/types";

const startOfTomorrow = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime() + 86_400_000;
};

function dueLabel(t: MyTaskRow) {
  if (!t.dueDate) return null;
  const ms = new Date(t.dueDate).getTime();
  if (t.overdue) return <span className="text-[var(--color-urgent)]">Просрочено</span>;
  if (ms < startOfTomorrow()) return <span className="text-[var(--color-high)]">Сегодня</span>;
  return (
    <span className="text-[var(--color-muted)]">
      {new Date(t.dueDate).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
    </span>
  );
}

type Filter = "all" | "today" | "overdue";

export function MyTasksCard({ tasks }: { tasks: MyTaskRow[] }) {
  const open = tasks.filter((t) => !t.done);
  const [filter, setFilter] = useState<Filter>("all");

  const todayCount = open.filter((t) => t.dueDate && !t.overdue && new Date(t.dueDate).getTime() < startOfTomorrow()).length;
  const overdueCount = open.filter((t) => t.overdue).length;

  const shown =
    filter === "today"
      ? open.filter((t) => t.dueDate && !t.overdue && new Date(t.dueDate).getTime() < startOfTomorrow())
      : filter === "overdue"
        ? open.filter((t) => t.overdue)
        : open;

  const pill = (key: Filter, label: string, count?: number, danger?: boolean) => (
    <button
      onClick={() => setFilter(key)}
      className={`rounded-full px-2.5 py-1 text-[12.5px] font-medium transition ${
        filter === key
          ? "bg-[var(--color-sidebar)] text-white"
          : danger
            ? "bg-[var(--color-urgent-bg)] text-[var(--color-urgent)]"
            : "bg-[var(--color-line)] text-[var(--color-muted)]"
      }`}
    >
      {label}
      {count != null && count > 0 && ` · ${count}`}
    </button>
  );

  return (
    <div className="rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-surface)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">Мои задачи</h2>
        <span className="rounded-full bg-[var(--color-accent-tint)] px-2 py-0.5 text-[12px] font-semibold text-[var(--color-accent)]">
          {open.length}
        </span>
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {pill("all", "Все")}
        {pill("today", "Сегодня", todayCount)}
        {pill("overdue", "Просрочено", overdueCount, true)}
      </div>

      {shown.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-[var(--color-muted)]">Ничего нет 🎉</p>
      ) : (
        <div className="space-y-1">
          {shown.slice(0, 12).map((t) => (
            <Link
              key={t.id}
              href={`/task/${t.id}`}
              className="flex items-center gap-2.5 rounded-lg px-1.5 py-2 transition hover:bg-[var(--color-surface-warm)]"
            >
              <span className="h-[19px] w-[19px] shrink-0 rounded-full border-2 border-[var(--color-border-input)]" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] text-[var(--color-ink)]">{t.title}</div>
                <div className="mt-0.5 flex items-center gap-2 text-[12px]">
                  <span className="text-[var(--color-muted)]">{t.boardName}</span>
                  {dueLabel(t)}
                </div>
              </div>
              <span className={`h-2 w-2 shrink-0 rounded-full ${priorityDot[t.priority]}`} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
