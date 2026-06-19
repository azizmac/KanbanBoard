"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import type { TeamUser } from "@/lib/types";

export function AssigneePicker({
  team,
  value,
  onChange,
}: {
  team: TeamUser[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const current = team.find((u) => u.id === value) ?? null;

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const q = query.trim().toLowerCase();
  const matches = q
    ? team.filter(
        (u) => u.name.toLowerCase().includes(q) || (u.username ?? "").toLowerCase().includes(q),
      )
    : team;

  function pick(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-[38px] w-full items-center gap-2 rounded-[10px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-2.5 text-left text-sm outline-none transition hover:border-[var(--color-accent)]"
      >
        {current ? (
          <>
            <Avatar name={current.name} size={22} />
            <span className="min-w-0 flex-1 truncate text-[var(--color-ink)]">{current.name}</span>
          </>
        ) : (
          <span className="flex-1 text-[var(--color-faint)]">— не назначен —</span>
        )}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-faint)" strokeWidth="2.2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[42px] z-30 rounded-[12px] border border-[var(--color-border-card)] bg-[var(--color-surface)] p-1.5 shadow-[0_10px_30px_rgba(20,20,20,0.14)]">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && matches[0]) pick(matches[0].id);
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Введите имя…"
            className="mb-1 h-9 w-full rounded-[8px] border border-[var(--color-border-input)] px-2.5 text-[13px] outline-none focus:border-[var(--color-accent)]"
          />
          <div className="max-h-[220px] overflow-y-auto">
            {value && (
              <button
                onClick={() => pick("")}
                className="flex w-full items-center gap-2 rounded-[8px] px-2 py-1.5 text-left text-[13px] text-[var(--color-muted)] transition hover:bg-[var(--color-surface-warm)]"
              >
                <span className="grid h-[22px] w-[22px] place-items-center rounded-full border border-[var(--color-border-input)] text-[var(--color-faint)]">
                  ✕
                </span>
                Снять назначение
              </button>
            )}
            {matches.map((u) => (
              <button
                key={u.id}
                onClick={() => pick(u.id)}
                className={`flex w-full items-center gap-2 rounded-[8px] px-2 py-1.5 text-left transition hover:bg-[var(--color-surface-warm)] ${
                  u.id === value ? "bg-[var(--color-accent-tint)]" : ""
                }`}
              >
                <Avatar name={u.name} size={24} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-[var(--color-ink)]">{u.name}</span>
                  {u.username && (
                    <span className="block truncate font-mono text-[11px] text-[var(--color-faint)]">@{u.username}</span>
                  )}
                </span>
                {u.id === value && (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.4">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            ))}
            {matches.length === 0 && (
              <p className="px-2 py-3 text-center text-[13px] text-[var(--color-faint)]">Никого не найдено</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
