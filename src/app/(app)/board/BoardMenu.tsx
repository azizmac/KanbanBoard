"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteBoard } from "./actions";

/** Board-level actions (kebab menu). Only rendered for users who can manage the
 *  board — currently just "delete board". */
export function BoardMenu({ boardId, boardName }: { boardId: string; boardName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    if (
      !confirm(
        `Удалить доску «${boardName}»? Все её задачи, колонки и теги будут удалены безвозвратно.`,
      )
    )
      return;
    setOpen(false);
    startTransition(async () => {
      const res = await deleteBoard(boardId);
      if (res.ok) router.push("/boards");
      else alert(res.error ?? "Не удалось удалить доску");
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        aria-label="Меню доски"
        className="grid h-9 w-9 place-items-center rounded-[10px] border border-[var(--color-border-input)] bg-[var(--color-surface)] text-[var(--color-muted)] transition hover:border-[var(--color-accent)]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-[44px] z-30 w-[210px] rounded-[12px] border border-[var(--color-border-card)] bg-[var(--color-surface)] p-1.5 shadow-[0_8px_28px_rgba(20,20,20,0.12)]">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={remove}
            disabled={pending}
            className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[13.5px] font-medium text-[var(--color-urgent)] transition hover:bg-[#FEF3F2] disabled:opacity-50"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            {pending ? "Удаление…" : "Удалить доску"}
          </button>
        </div>
      )}
    </div>
  );
}
