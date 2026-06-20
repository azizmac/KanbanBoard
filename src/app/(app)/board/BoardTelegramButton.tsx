"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { unlinkBoardTelegram } from "./actions";

export function BoardTelegramButton({
  code,
  botUsername,
  boardName,
  boardId,
  linked,
}: {
  code: string;
  botUsername: string;
  boardName: string;
  boardId: string;
  linked: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const startGroupUrl = `https://t.me/${botUsername}?startgroup=${code}`;
  const command = `/link ${code}`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Telegram-группа"
        className={`grid h-9 w-9 place-items-center rounded-[10px] border transition ${
          linked
            ? "border-[var(--color-success)]/40 bg-[#DCF3E8] text-[var(--color-success)]"
            : "border-[var(--color-border-input)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21.94 4.58a1.4 1.4 0 0 0-1.45-.2L3.4 11.1c-1.06.43-1.04 1.95.03 2.35l4.13 1.54 1.6 5.02a1 1 0 0 0 1.62.45l2.42-2.18 4.43 3.26a1.4 1.4 0 0 0 2.2-.86l3.07-14.6a1.4 1.4 0 0 0-.49-1.5zM9.4 14.3l-.6 3.78-.9-2.96 8.9-7.42L9.4 14.3z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-[44px] z-30 w-[340px] max-w-[88vw] rounded-[12px] border border-[var(--color-border-card)] bg-[var(--color-surface)] p-4 shadow-[0_10px_30px_rgba(20,20,20,0.14)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--color-ink)]">Telegram-группа</p>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                linked ? "bg-[#DCF3E8] text-[var(--color-success)]" : "bg-[#F2F1ED] text-[var(--color-muted)]"
              }`}
            >
              {linked ? "● подключена" : "○ не подключена"}
            </span>
          </div>

          {linked ? (
            <>
              <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--color-muted)]">
                Группа привязана к доске «{boardName}». В ней работает команда <b>/tasks</b>.
              </p>
              <button
                onClick={() =>
                  startTransition(async () => {
                    await unlinkBoardTelegram(boardId);
                    router.refresh();
                  })
                }
                disabled={pending}
                className="mt-3 w-full rounded-[10px] border border-[#FECDCA] bg-[#FEF3F2] py-2 text-sm font-medium text-[var(--color-urgent)] transition hover:brightness-95 disabled:opacity-50"
              >
                {pending ? "…" : "Отвязать группу"}
              </button>
            </>
          ) : (
            <>
              <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--color-muted)]">
                Нажмите кнопку, выберите Telegram-группу — бот добавится туда и сам привяжет её к доске
                «{boardName}». Дальше <b>/tasks</b> в группе покажет её задачи.
              </p>
              <a
                href={startGroupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-[12px] bg-[#229ED9] text-sm font-semibold text-white transition hover:opacity-90"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
                  <path d="M21.94 4.58a1.4 1.4 0 0 0-1.45-.2L3.4 11.1c-1.06.43-1.04 1.95.03 2.35l4.13 1.54 1.6 5.02a1 1 0 0 0 1.62.45l2.42-2.18 4.43 3.26a1.4 1.4 0 0 0 2.2-.86l3.07-14.6a1.4 1.4 0 0 0-.49-1.5zM9.4 14.3l-.6 3.78-.9-2.96 8.9-7.42L9.4 14.3z" />
                </svg>
                Добавить бота в группу
              </a>

              <button
                onClick={() => setShowManual((v) => !v)}
                className="mt-2.5 text-[12px] text-[var(--color-muted)] hover:text-[var(--color-accent)]"
              >
                {showManual ? "Скрыть" : "Бот уже в группе? Привязать вручную"}
              </button>
              {showManual && (
                <div className="mt-2">
                  <p className="mb-1.5 text-[11.5px] text-[var(--color-faint)]">
                    Отправьте эту команду <b>в самой группе</b> (где есть бот @{botUsername}):
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate rounded-[8px] border border-[var(--color-border-input)] bg-[var(--color-surface-warm)] px-2.5 py-2 font-mono text-[11.5px]">
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
                      className="shrink-0 rounded-[8px] bg-[var(--color-accent)] px-3 py-2 text-[12px] font-semibold text-white"
                    >
                      {copied ? "✓" : "Копировать"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
