import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { priorityChip, priorityDot, priorityLabels } from "@/lib/constants";
import { getMyWork } from "@/lib/task-data";
import { tint } from "@/lib/tints";
import type { MyTaskRow } from "@/lib/types";

export const dynamic = "force-dynamic";

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

export default async function MyTasksPage() {
  const user = await requireUser();
  const { assigned, mentioned } = await getMyWork(user.id);

  return (
    <div className="mx-auto max-w-[760px] px-5 py-7 sm:px-9">
      <h1 className="text-[25px] font-bold tracking-[-0.03em]">Мои задачи</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">Назначенные вам задачи и упоминания со всех досок</p>

      <div className="mt-7 space-y-8">
        <Section title="Назначено мне" count={assigned.length} rows={assigned} empty="Вам пока ничего не назначено." />
        <Section
          title="Где меня упомянули"
          count={mentioned.length}
          rows={mentioned}
          empty="Вас пока нигде не упоминали."
        />
      </div>
    </div>
  );
}
