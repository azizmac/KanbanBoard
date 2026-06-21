"use client";

import { useState, useTransition } from "react";
import { setNotifyPaused, setQuietHours } from "./notify-actions";

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;

export function NotifySettings({
  paused,
  quietStart,
  quietEnd,
}: {
  paused: boolean;
  quietStart: number | null;
  quietEnd: number | null;
}) {
  const [isPaused, setIsPaused] = useState(paused);
  const [quietOn, setQuietOn] = useState(quietStart != null && quietEnd != null);
  const [start, setStart] = useState(quietStart ?? 22);
  const [end, setEnd] = useState(quietEnd ?? 8);
  const [, startTransition] = useTransition();

  function togglePause() {
    const next = !isPaused;
    setIsPaused(next);
    startTransition(() => void setNotifyPaused(next));
  }

  function saveQuiet(on: boolean, s: number, e: number) {
    setQuietOn(on);
    setStart(s);
    setEnd(e);
    startTransition(() => void setQuietHours(on ? s : null, on ? e : null));
  }

  return (
    <div className="rounded-[13px] border border-[var(--color-border-card)] bg-[var(--color-surface)] p-4">
      <div className="mb-3 text-sm font-medium text-[var(--color-ink)]">Уведомления</div>

      {/* Master pause */}
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span className="text-[13.5px] text-[var(--color-body)]">
          Поставить на паузу
          <span className="block text-[12px] text-[var(--color-muted)]">Telegram и пуши не приходят</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={isPaused}
          onClick={togglePause}
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${isPaused ? "bg-[var(--color-accent)]" : "bg-[var(--color-line)]"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${isPaused ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </label>

      <div className="my-3 h-px bg-[var(--color-line)]" />

      {/* Quiet hours */}
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span className="text-[13.5px] text-[var(--color-body)]">Тихие часы</span>
        <button
          type="button"
          role="switch"
          aria-checked={quietOn}
          onClick={() => saveQuiet(!quietOn, start, end)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${quietOn ? "bg-[var(--color-accent)]" : "bg-[var(--color-line)]"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${quietOn ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </label>

      {quietOn && (
        <div className="mt-3 flex items-center gap-2 text-[13px] text-[var(--color-muted)]">
          <span>с</span>
          <select
            value={start}
            onChange={(e) => saveQuiet(true, Number(e.target.value), end)}
            className="h-8 rounded-[8px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-2 text-[13px] outline-none focus:border-[var(--color-accent)]"
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>{hh(h)}</option>
            ))}
          </select>
          <span>до</span>
          <select
            value={end}
            onChange={(e) => saveQuiet(true, start, Number(e.target.value))}
            className="h-8 rounded-[8px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-2 text-[13px] outline-none focus:border-[var(--color-accent)]"
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>{hh(h)}</option>
            ))}
          </select>
          <span className="text-[12px] text-[var(--color-faint)]">МСК</span>
        </div>
      )}
      <p className="mt-2 text-[12px] text-[var(--color-faint)]">
        В паузе и тихие часы уведомления видны в приложении, но не приходят в Telegram/пуши.
      </p>
    </div>
  );
}
