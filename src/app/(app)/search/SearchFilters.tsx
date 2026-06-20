"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { priorityLabels } from "@/lib/constants";
import type { SearchOptions } from "@/lib/search-data";

const SEL =
  "h-9 rounded-[10px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-2.5 text-[13px] text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]";

export function SearchFilters({ options }: { options: SearchOptions }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");

  function pushParams(mut: (p: URLSearchParams) => void) {
    const params = new URLSearchParams(sp.toString());
    mut(params);
    const next = params.toString();
    if (next !== sp.toString()) router.replace(next ? `/search?${next}` : "/search");
  }

  function setParam(key: string, value: string) {
    pushParams((p) => (value ? p.set(key, value) : p.delete(key)));
  }

  // Debounce the text query.
  useEffect(() => {
    const id = setTimeout(() => {
      pushParams((p) => (q.trim() ? p.set("q", q.trim()) : p.delete("q")));
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const val = (k: string) => sp.get(k) ?? "";
  const hasFilters = [...sp.keys()].length > 0;

  return (
    <div className="space-y-2.5">
      <div className="relative">
        <svg
          width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--color-faint)" strokeWidth="2"
          className="pointer-events-none absolute left-3 top-[11px]"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4-4" />
        </svg>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск по названию задачи…"
          className="h-10 w-full rounded-[11px] border border-[var(--color-border-input)] bg-[var(--color-surface)] pl-9 pr-3 text-[14px] text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <select className={SEL} value={val("board")} onChange={(e) => setParam("board", e.target.value)}>
          <option value="">Все доски</option>
          {options.boards.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        <select className={SEL} value={val("assignee")} onChange={(e) => setParam("assignee", e.target.value)}>
          <option value="">Любой исполнитель</option>
          <option value="none">Без исполнителя</option>
          {options.users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>

        <select className={SEL} value={val("priority")} onChange={(e) => setParam("priority", e.target.value)}>
          <option value="">Любой приоритет</option>
          {options.priorities.map((p) => (
            <option key={p} value={p}>{priorityLabels[p]}</option>
          ))}
        </select>

        <select className={SEL} value={val("due")} onChange={(e) => setParam("due", e.target.value)}>
          <option value="">Любой срок</option>
          <option value="overdue">Просроченные</option>
          <option value="today">Сегодня</option>
          <option value="week">На неделе</option>
          <option value="none">Без срока</option>
        </select>

        {options.tags.length > 0 && (
          <select className={SEL} value={val("tag")} onChange={(e) => setParam("tag", e.target.value)}>
            <option value="">Любой тег</option>
            {options.tags.map((t) => (
              <option key={t} value={t}>#{t}</option>
            ))}
          </select>
        )}

        <select className={SEL} value={val("status")} onChange={(e) => setParam("status", e.target.value)}>
          <option value="">Открытые</option>
          <option value="done">Готово</option>
          <option value="all">Все</option>
        </select>

        {hasFilters && (
          <button
            onClick={() => { setQ(""); router.replace("/search"); }}
            className="h-9 rounded-[10px] px-3 text-[13px] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          >
            Сбросить
          </button>
        )}
      </div>
    </div>
  );
}
