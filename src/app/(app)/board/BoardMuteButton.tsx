"use client";

import { useState, useTransition } from "react";
import { toggleBoardMute } from "../profile/notify-actions";

/** Personal mute toggle for the current board (available to everyone). When on,
 *  this board's Telegram/push pings are silenced for this user. */
export function BoardMuteButton({ boardId, muted: initial }: { boardId: string; muted: boolean }) {
  const [muted, setMuted] = useState(initial);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !muted;
    setMuted(next);
    startTransition(async () => {
      const res = await toggleBoardMute(boardId);
      if (res.ok) setMuted(res.muted);
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      title={muted ? "Уведомления по доске выключены — включить" : "Выключить уведомления по доске"}
      aria-pressed={muted}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border transition ${
        muted
          ? "border-[var(--color-urgent)]/30 bg-[#FEF3F2] text-[var(--color-urgent)]"
          : "border-[var(--color-border-input)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-accent)]"
      }`}
    >
      {muted ? (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M13.73 21a2 2 0 0 1-3.46 0M18.63 13A17.9 17.9 0 0 1 18 8M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14M18 8a6 6 0 0 0-9.33-5M1 1l22 22" />
        </svg>
      ) : (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      )}
    </button>
  );
}
