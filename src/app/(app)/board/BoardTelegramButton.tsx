"use client";

import { useEffect, useRef, useState } from "react";

export function BoardTelegramButton({
  code,
  botUsername,
  boardName,
}: {
  code: string;
  botUsername: string;
  boardName: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const command = `/link ${code}`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Подключить Telegram-группу"
        className="grid h-9 w-9 place-items-center rounded-[10px] border border-[var(--color-border-input)] text-[var(--color-muted)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21.94 4.58a1.4 1.4 0 0 0-1.45-.2L3.4 11.1c-1.06.43-1.04 1.95.03 2.35l4.13 1.54 1.6 5.02a1 1 0 0 0 1.62.45l2.42-2.18 4.43 3.26a1.4 1.4 0 0 0 2.2-.86l3.07-14.6a1.4 1.4 0 0 0-.49-1.5zM9.4 14.3l-.6 3.78-.9-2.96 8.9-7.42L9.4 14.3z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-[44px] z-30 w-[320px] rounded-[12px] border border-[var(--color-border-card)] bg-[var(--color-surface)] p-4 shadow-[0_10px_30px_rgba(20,20,20,0.14)]">
          <p className="text-sm font-semibold text-[var(--color-ink)]">Подключить Telegram-группу</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-muted)]">
            Добавьте бота <span className="font-mono text-[var(--color-accent)]">@{botUsername}</span> в группу и
            отправьте там команду — бот привяжет группу к доске «{boardName}». После этого <b>/tasks</b> покажет её
            задачи.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-[8px] border border-[var(--color-border-input)] bg-[var(--color-surface-warm)] px-2.5 py-2 font-mono text-[12px] text-[var(--color-ink)]">
              {command}
            </code>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard?.writeText(command);
                  setCopied(true);
                } catch {
                  /* clipboard blocked */
                }
              }}
              className="shrink-0 rounded-[8px] bg-[var(--color-accent)] px-3 py-2 text-[12px] font-semibold text-white transition hover:opacity-90"
            >
              {copied ? "✓" : "Копировать"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
