"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { plural } from "@/lib/format";
import type { ChatMessageDTO, ChatTarget } from "@/lib/chat-data";
import { ChatAvatar } from "../ChatAvatar";
import { forwardMessage } from "../actions";

export function ForwardDialog({
  msg,
  targets,
  onClose,
}: {
  msg: ChatMessageDTO;
  targets: ChatTarget[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return targets;
    return targets.filter((t) => t.title.toLowerCase().includes(q));
  }, [targets, query]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  function submit() {
    if (selected.length === 0) {
      setError("Выберите чат");
      return;
    }
    startTransition(async () => {
      const res = await forwardMessage({ messageId: msg.id, chatIds: selected });
      if (res.ok) {
        onClose();
        router.refresh();
      } else {
        setError(res.error ?? "Ошибка");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="flex max-h-[80dvh] w-full max-w-sm flex-col overflow-hidden rounded-[16px] border border-[var(--color-border-card)] bg-[var(--color-surface)] shadow-[0_10px_30px_rgba(20,20,20,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-line)] px-5 py-3.5">
          <h2 className="text-[16px] font-bold tracking-[-0.02em]">Переслать сообщение</h2>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-[8px] text-[var(--color-muted)] transition hover:bg-[var(--color-surface-warm)]"
            aria-label="Закрыть"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="shrink-0 border-b border-[var(--color-line)] bg-[var(--color-accent-tint)] px-4 py-2.5">
          <div className="border-l-2 border-[var(--color-accent)] pl-2.5">
            <div className="text-[12px] font-semibold text-[var(--color-accent)]">{msg.authorName}</div>
            <div className="truncate text-[12.5px] text-[var(--color-muted)]">
              {msg.body || "Вложение"}
            </div>
          </div>
        </div>

        <div className="shrink-0 px-4 pb-1 pt-3">
          <div className="relative">
            <svg
              width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-faint)]"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
            </svg>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Кому переслать"
              className="h-[38px] w-full rounded-[11px] border border-[var(--color-border-input)] bg-[var(--color-surface)] pl-9 pr-3 text-[13.5px] outline-none focus:border-[var(--color-accent)] focus:ring-[3px] focus:ring-[var(--color-accent)]/10"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2">
          {filtered.map((t) => {
            const on = selected.includes(t.id);
            return (
              <button
                key={t.id}
                onClick={() => toggle(t.id)}
                className="flex w-full items-center gap-3 rounded-[11px] px-2 py-2 text-left transition hover:bg-[var(--color-surface-warm)]"
              >
                <ChatAvatar type={t.type} title={t.title} color={t.color} peer={t.peer} size={40} />
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-[var(--color-ink)]">
                  {t.title}
                </span>
                {on ? (
                  <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-[var(--color-accent)]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </span>
                ) : (
                  <span className="h-[22px] w-[22px] rounded-full border-2 border-[var(--color-border-input)]" />
                )}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="px-4 py-6 text-center text-[13px] text-[var(--color-muted)]">
              Ничего не найдено.
            </p>
          )}
        </div>

        <div className="shrink-0 border-t border-[var(--color-line)] px-4 py-3">
          {error && <p className="mb-2 text-sm text-[var(--color-urgent)]">{error}</p>}
          <button
            onClick={submit}
            disabled={pending || selected.length === 0}
            className="h-[44px] w-full rounded-[12px] bg-[var(--color-accent)] text-[14.5px] font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
          >
            {pending
              ? "Отправляем…"
              : selected.length > 0
                ? `Отправить · ${plural(selected.length, "чат", "чата", "чатов")}`
                : "Отправить"}
          </button>
        </div>
      </div>
    </div>
  );
}
