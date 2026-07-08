"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import type { ChatPeer } from "@/lib/chat-data";
import { createGroup, openDirectChat } from "./actions";

/** «Новое сообщение»: личный диалог или группа (имя + участники) — как в
 *  макете «Новая группа», объединено в один диалог с двумя вкладками. */
export function NewChatDialog({
  people,
  onClose,
}: {
  people: ChatPeer[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"direct" | "group">("direct");
  const [query, setQuery] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.username ?? "").toLowerCase().includes(q) ||
        (p.position ?? "").toLowerCase().includes(q),
    );
  }, [people, query]);

  function openDirect(userId: string) {
    startTransition(async () => {
      const res = await openDirectChat(userId);
      if (res.ok) {
        onClose();
        router.push(`/chat/${res.id}`);
        router.refresh();
      } else {
        setError(res.error ?? "Ошибка");
      }
    });
  }

  function submitGroup() {
    const name = groupName.trim();
    if (!name) {
      setError("Введите название группы");
      return;
    }
    if (selected.length === 0) {
      setError("Добавьте хотя бы одного участника");
      return;
    }
    startTransition(async () => {
      const res = await createGroup({ name, memberIds: selected });
      if (res.ok) {
        onClose();
        router.push(`/chat/${res.id}`);
        router.refresh();
      } else {
        setError(res.error ?? "Ошибка");
      }
    });
  }

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="flex max-h-[80dvh] w-full max-w-sm flex-col rounded-[16px] border border-[var(--color-border-card)] bg-[var(--color-surface)] shadow-[0_10px_30px_rgba(20,20,20,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-[var(--color-line)] px-5 pb-3 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[17px] font-bold tracking-[-0.02em]">
              {tab === "direct" ? "Новое сообщение" : "Новая группа"}
            </h2>
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
          <div className="flex gap-1.5">
            {(
              [
                { key: "direct", label: "Личный" },
                { key: "group", label: "Группа" },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setTab(t.key);
                  setError(null);
                }}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${
                  tab === t.key
                    ? "bg-[var(--color-accent)] text-white"
                    : "bg-[var(--color-surface-warm)] font-medium text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {tab === "group" && (
            <div className="px-2 pb-3">
              <input
                autoFocus
                value={groupName}
                onChange={(e) => {
                  setGroupName(e.target.value);
                  setError(null);
                }}
                placeholder="Название группы"
                className="h-[42px] w-full rounded-[10px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-3 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-[3px] focus:ring-[var(--color-accent)]/10"
              />
              <p className="mt-1.5 text-[12px] text-[var(--color-faint)]">
                Например, «Спринт 14» или «QA»
              </p>
              {selected.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selected.map((id) => {
                    const p = people.find((x) => x.id === id);
                    if (!p) return null;
                    return (
                      <button
                        key={id}
                        onClick={() => toggle(id)}
                        className="flex items-center gap-1.5 rounded-full border border-[var(--color-border-card)] bg-[var(--color-surface-warm)] py-1 pl-1 pr-2.5 text-[13px] text-[var(--color-body)]"
                      >
                        <Avatar name={p.name} src={p.avatarUrl} size={22} />
                        {p.name.split(/\s+/)[0]}
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-faint)]">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="relative px-2 pb-2">
            <svg
              width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className="pointer-events-none absolute left-5 top-1/2 -translate-y-[13px] text-[var(--color-faint)]"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === "direct" ? "Кому написать" : "Поиск людей"}
              className="h-[38px] w-full rounded-[11px] border border-[var(--color-border-input)] bg-[var(--color-surface)] pl-9 pr-3 text-[13.5px] outline-none focus:border-[var(--color-accent)] focus:ring-[3px] focus:ring-[var(--color-accent)]/10"
            />
          </div>

          {filtered.map((p) => {
            const on = selected.includes(p.id);
            return (
              <button
                key={p.id}
                disabled={pending}
                onClick={() => (tab === "direct" ? openDirect(p.id) : toggle(p.id))}
                className="flex w-full items-center gap-3 rounded-[11px] px-2 py-2 text-left transition hover:bg-[var(--color-surface-warm)] disabled:opacity-50"
              >
                <Avatar name={p.name} src={p.avatarUrl} size={38} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-[var(--color-ink)]">
                    {p.name}
                  </span>
                  <span className="block truncate text-[12px] text-[var(--color-faint)]">
                    {p.position ?? (p.username ? `@${p.username}` : "")}
                  </span>
                </span>
                {tab === "group" &&
                  (on ? (
                    <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-[var(--color-accent)]">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </span>
                  ) : (
                    <span className="h-[22px] w-[22px] rounded-full border-2 border-[var(--color-border-input)]" />
                  ))}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="px-4 py-6 text-center text-[13px] text-[var(--color-muted)]">
              Никого не нашлось.
            </p>
          )}
        </div>

        {(error || tab === "group") && (
          <div className="shrink-0 border-t border-[var(--color-line)] px-4 py-3">
            {error && <p className="mb-2 text-sm text-[var(--color-urgent)]">{error}</p>}
            {tab === "group" && (
              <button
                onClick={submitGroup}
                disabled={pending}
                className="h-[42px] w-full rounded-[11px] bg-[var(--color-accent)] text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
              >
                {pending
                  ? "Создаём…"
                  : selected.length > 0
                    ? `Создать группу · ${selected.length + 1}`
                    : "Создать группу"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
