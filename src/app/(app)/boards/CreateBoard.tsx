"use client";

import { useState } from "react";
import { NewBoardDialog } from "./NewBoardDialog";

export function CreateBoard({ variant }: { variant: "button" | "tile" }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "button" ? (
        <button
          onClick={() => setOpen(true)}
          className="flex h-10 items-center gap-1.5 rounded-[11px] bg-[var(--color-accent)] px-4 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Новая доска
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex min-h-[170px] flex-col items-center justify-center gap-2.5 rounded-[15px] border-[1.5px] border-dashed border-[#DAD7D0] p-5 text-[var(--color-muted)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          <span className="grid h-[42px] w-[42px] place-items-center rounded-[12px] bg-[#F2F1ED]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <span className="text-sm font-semibold">Создать доску</span>
        </button>
      )}
      {open && <NewBoardDialog onClose={() => setOpen(false)} />}
    </>
  );
}
