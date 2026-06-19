"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { tint } from "@/lib/tints";
import type { BoardOption } from "@/lib/types";
import { NewBoardDialog } from "../boards/NewBoardDialog";

function BoardBadge({ name, color, size = 22 }: { name: string; color: string; size?: number }) {
  const c = tint(color);
  return (
    <span
      className="grid shrink-0 place-items-center font-bold"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.27),
        background: c.bg,
        color: c.text,
        fontSize: Math.round(size * 0.5),
      }}
    >
      {name.charAt(0)}
    </span>
  );
}

export function BoardSwitcher({
  current,
  boards,
  regions,
  canCreate,
}: {
  current: BoardOption;
  boards: BoardOption[];
  regions: { id: string; name: string }[];
  canCreate: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-[10px] border border-[var(--color-border-input)] py-[7px] pl-[11px] pr-3 transition hover:bg-[var(--color-surface-warm)]"
      >
        <BoardBadge name={current.name} color={current.color} />
        <span className="max-w-[40vw] truncate text-[14.5px] font-semibold text-[var(--color-ink)] sm:max-w-none">
          {current.name}
        </span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-faint)" strokeWidth="2.2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-[46px] z-30 w-[260px] rounded-[12px] border border-[var(--color-border-card)] bg-[var(--color-surface)] p-1.5 shadow-[0_10px_30px_rgba(20,20,20,0.12)]">
          <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-faint)]">
            Доски
          </p>
          {boards.map((b) => (
            <Link
              key={b.id}
              href={`/board/${b.id}`}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-sm transition hover:bg-[var(--color-surface-warm)] ${
                b.id === current.id ? "bg-[var(--color-accent-tint)]" : ""
              }`}
            >
              <BoardBadge name={b.name} color={b.color} size={24} />
              <span className="min-w-0 flex-1 truncate font-medium text-[var(--color-ink)]">{b.name}</span>
              {b.id === current.id && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.4">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </Link>
          ))}
          {canCreate && (
            <>
              <div className="my-1 h-px bg-[var(--color-line)]" />
              <button
                onClick={() => {
                  setOpen(false);
                  setCreating(true);
                }}
                className="flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-sm font-medium text-[var(--color-accent)] transition hover:bg-[var(--color-accent-tint)]"
              >
                <span className="grid h-6 w-6 place-items-center rounded-[7px] bg-[var(--color-accent-soft)]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
                Создать доску
              </button>
            </>
          )}
        </div>
      )}

      {creating && <NewBoardDialog regions={regions} onClose={() => setCreating(false)} />}
    </div>
  );
}
