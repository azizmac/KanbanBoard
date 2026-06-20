import Link from "next/link";
import { Suspense } from "react";
import { Avatar } from "@/components/Avatar";
import { requireUser } from "@/lib/auth";
import { priorityDot, priorityLabels } from "@/lib/constants";
import { getSearchOptions, searchTasks, type SearchHit } from "@/lib/search-data";
import { pluralTasks } from "@/lib/format";
import { SearchFilters } from "./SearchFilters";

export const dynamic = "force-dynamic";

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function dueLabel(iso: string | null, overdue: boolean) {
  if (!iso) return null;
  const s = new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  return (
    <span className={overdue ? "text-[var(--color-urgent)]" : "text-[var(--color-muted)]"}>
      {overdue ? "⚠ " : "📅 "}{s}
    </span>
  );
}

function Row({ t }: { t: SearchHit }) {
  return (
    <Link
      href={`/task/${t.id}`}
      className="flex items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2.5 transition hover:border-[var(--color-accent)]"
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${priorityDot[t.priority]}`} title={priorityLabels[t.priority]} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] text-[var(--color-ink)]">{t.title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-[var(--color-faint)]">
          <span className="text-[var(--color-muted)]">{t.boardName}</span>
          <span>· {t.columnName}</span>
          {t.tags.map((tag) => (
            <span key={tag.id}>#{tag.name}</span>
          ))}
          {dueLabel(t.dueDate, t.overdue)}
        </div>
      </div>
      {t.assignee && <Avatar name={t.assignee.name} size={26} />}
    </Link>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const filters = {
    q: first(sp.q),
    assignee: first(sp.assignee),
    priority: first(sp.priority),
    tag: first(sp.tag),
    due: first(sp.due),
    board: first(sp.board),
    status: first(sp.status),
  };

  const [options, hits] = await Promise.all([getSearchOptions(user), searchTasks(user, filters)]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-[22px] font-bold text-[var(--color-ink)]">Поиск</h1>

      <div className="mt-4">
        <Suspense>
          <SearchFilters options={options} />
        </Suspense>
      </div>

      <div className="mt-5">
        <div className="mb-2.5 text-[12.5px] text-[var(--color-muted)]">{pluralTasks(hits.length)}</div>
        {hits.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-line)] py-12 text-center text-[13.5px] text-[var(--color-muted)]">
            Ничего не найдено. Измените запрос или фильтры.
          </div>
        ) : (
          <div className="space-y-2">
            {hits.map((t) => (
              <Row key={t.id} t={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
