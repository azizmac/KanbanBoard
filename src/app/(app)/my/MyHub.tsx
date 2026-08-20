"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { priorityChip, priorityDot, priorityLabels } from "@/lib/constants";
import type { CalendarRegion, DeadlineItem } from "@/lib/calendar-data";
import type { InboxItem } from "@/lib/notify-data";
import { tint } from "@/lib/tints";
import type { MyTaskRow } from "@/lib/types";
import { CalendarView } from "./CalendarView";
import { InboxList } from "./InboxList";

export type MyTab = "tasks" | "calendar" | "inbox";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function TaskRow({ t }: { t: MyTaskRow }) {
  const c = tint(t.boardColor);
  return (
    <Link
      href={`/task/${t.id}`}
      className="flex items-center gap-3 rounded-[13px] border border-[var(--color-border-card)] bg-[var(--color-surface)] px-4 py-3 shadow-[0_1px_2px_rgba(20,20,20,0.03)] transition hover:border-[var(--color-accent)]/40"
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${priorityDot[t.priority]}`} title={priorityLabels[t.priority]} />
      <div className="min-w-0 flex-1">
        <div className={`truncate text-sm font-medium ${t.done ? "text-[var(--color-faint)] line-through" : "text-[var(--color-ink)]"}`}>
          {t.title}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="grid h-4 w-4 place-items-center rounded-[5px] text-[9px] font-bold" style={{ background: c.bg, color: c.text }}>
              {t.boardName.charAt(0)}
            </span>
            {t.boardName}
          </span>
          <span className="text-[var(--color-faint)]">·</span>
          <span>{t.columnName}</span>
        </div>
      </div>
      {t.dueDate && (
        <span
          className={`shrink-0 font-mono text-xs ${
            t.overdue && !t.done
              ? "rounded-md border border-[#FECDCA] bg-[#FEF3F2] px-1.5 py-0.5 font-medium text-[var(--color-urgent)]"
              : "text-[var(--color-muted)]"
          }`}
        >
          {formatDate(t.dueDate)}
        </span>
      )}
      <span className={`hidden shrink-0 rounded-[6px] px-1.5 py-0.5 text-[11px] font-semibold sm:inline ${priorityChip[t.priority]}`}>
        {priorityLabels[t.priority]}
      </span>
    </Link>
  );
}

function Section({ title, count, rows, empty }: { title: string; count: number; rows: MyTaskRow[]; empty: string }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-faint)]">{title}</h2>
        <span className="font-mono text-xs text-[var(--color-faint)]">{count}</span>
      </div>
      {rows.length > 0 ? (
        <div className="space-y-2">
          {rows.map((t) => (
            <TaskRow key={t.id} t={t} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--color-muted)]">{empty}</p>
      )}
    </section>
  );
}

const TABS: { id: MyTab; label: string }[] = [
  { id: "tasks", label: "Задачи" },
  { id: "calendar", label: "Календарь" },
  { id: "inbox", label: "Уведомления" },
];

export function MyHub({
  tab,
  assigned,
  mentioned,
  deadlines,
  regions,
  inbox,
  inboxUnread,
}: {
  tab: MyTab;
  assigned: MyTaskRow[];
  mentioned: MyTaskRow[];
  deadlines: DeadlineItem[];
  regions: CalendarRegion[];
  inbox: InboxItem[];
  inboxUnread: number;
}) {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-[760px] px-5 py-7 sm:px-9">
      <h1 className="text-[25px] font-bold tracking-[-0.03em]">Моё</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">Задачи, дедлайны и уведомления с ваших досок</p>

      <div className="mt-5 flex gap-1 rounded-[12px] border border-[var(--color-border-card)] bg-[var(--color-surface-warm)] p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => router.replace(t.id === "tasks" ? "/my" : `/my?tab=${t.id}`)}
            className={`relative flex-1 rounded-[9px] py-2 text-[13px] font-medium transition ${
              tab === t.id ? "bg-[var(--color-surface)] text-[var(--color-ink)] shadow-sm" : "text-[var(--color-muted)]"
            }`}
          >
            {t.label}
            {t.id === "inbox" && inboxUnread > 0 && (
              <span className="absolute right-2 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#F04438] px-0.5 text-[9px] font-bold text-white">
                {inboxUnread > 9 ? "9+" : inboxUnread}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "tasks" && (
          <div className="space-y-8">
            <Section title="Назначено мне" count={assigned.length} rows={assigned} empty="Вам пока ничего не назначено." />
            <Section title="Где меня упомянули" count={mentioned.length} rows={mentioned} empty="Вас пока нигде не упоминали." />
          </div>
        )}
        {tab === "calendar" && <CalendarView items={deadlines} regions={regions} />}
        {tab === "inbox" && <InboxList items={inbox} />}
      </div>
    </div>
  );
}
