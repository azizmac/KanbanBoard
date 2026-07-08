"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import { chatListTime, formatBytes, plural } from "@/lib/format";
import type { ChatPeer, ConversationDTO } from "@/lib/chat-data";
import { ChatAvatar } from "../ChatAvatar";
import { addGroupMembers, leaveGroup } from "../actions";

const ROLE_LABEL: Record<string, string> = { OWNER: "Владелец", ADMIN: "Админ" };

function AddMembersDialog({
  conv,
  people,
  onClose,
}: {
  conv: ConversationDTO;
  people: ChatPeer[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const memberIds = useMemo(() => new Set(conv.members.map((m) => m.id)), [conv.members]);
  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter(
      (p) =>
        !memberIds.has(p.id) &&
        (!q || p.name.toLowerCase().includes(q) || (p.position ?? "").toLowerCase().includes(q)),
    );
  }, [people, memberIds, query]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  function submit() {
    if (selected.length === 0) return;
    startTransition(async () => {
      const res = await addGroupMembers({ chatId: conv.id, userIds: selected });
      if (res.ok) {
        onClose();
        router.refresh();
      } else {
        alert(res.error ?? "Ошибка");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="flex max-h-[75dvh] w-full max-w-sm flex-col overflow-hidden rounded-[16px] border border-[var(--color-border-card)] bg-[var(--color-surface)] shadow-[0_10px_30px_rgba(20,20,20,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-[var(--color-line)] px-5 pb-3 pt-4">
          <h2 className="mb-3 text-[16px] font-bold tracking-[-0.02em]">Добавить участников</h2>
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
              placeholder="Поиск людей"
              className="h-[38px] w-full rounded-[11px] border border-[var(--color-border-input)] bg-[var(--color-surface)] pl-9 pr-3 text-[13.5px] outline-none focus:border-[var(--color-accent)] focus:ring-[3px] focus:ring-[var(--color-accent)]/10"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2">
          {candidates.map((p) => {
            const on = selected.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className="flex w-full items-center gap-3 rounded-[11px] px-2 py-2 text-left transition hover:bg-[var(--color-surface-warm)]"
              >
                <Avatar name={p.name} src={p.avatarUrl} size={38} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-[var(--color-ink)]">{p.name}</span>
                  <span className="block truncate text-[12px] text-[var(--color-faint)]">{p.position ?? ""}</span>
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
          {candidates.length === 0 && (
            <p className="px-4 py-6 text-center text-[13px] text-[var(--color-muted)]">
              Все уже в группе.
            </p>
          )}
        </div>
        <div className="shrink-0 border-t border-[var(--color-line)] px-4 py-3">
          <button
            onClick={submit}
            disabled={pending || selected.length === 0}
            className="h-[42px] w-full rounded-[11px] bg-[var(--color-accent)] text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
          >
            {pending ? "Добавляем…" : selected.length > 0 ? `Добавить · ${selected.length}` : "Добавить"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Правая панель «профиль группы / собеседника»: участники и роли, добавление,
 *  общие файлы, выход из группы. На мобиле — полноэкранный оверлей. */
export function InfoPanel({
  conv,
  people,
  onClose,
}: {
  conv: ConversationDTO;
  people: ChatPeer[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [pending, startTransition] = useTransition();

  const isGroup = conv.type === "GROUP";
  const canManage = conv.myRole === "OWNER" || conv.myRole === "ADMIN";
  const members = showAll ? conv.members : conv.members.slice(0, 5);

  function leave() {
    if (!confirm(`Выйти из группы «${conv.title}»?`)) return;
    startTransition(async () => {
      const res = await leaveGroup(conv.id);
      if (res.ok) {
        router.push("/chat");
        router.refresh();
      } else {
        alert(res.error ?? "Ошибка");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-surface)] pt-[env(safe-area-inset-top)] md:static md:z-auto md:w-[300px] md:shrink-0 md:border-l md:border-[var(--color-line)] md:pt-0">
      {/* mobile header */}
      <div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-[var(--color-line)] px-3 md:hidden">
        <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-[10px] text-[var(--color-ink)]" aria-label="Назад">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="text-[15px] font-semibold">
          {isGroup ? "Профиль группы" : "Профиль"}
        </span>
      </div>
      {/* desktop close */}
      <div className="hidden shrink-0 items-center justify-end px-3 pt-3 md:flex">
        <button
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-[8px] text-[var(--color-muted)] transition hover:bg-[var(--color-surface-warm)]"
          aria-label="Закрыть панель"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto pb-6">
        <div className="border-b border-[var(--color-line)] px-5 pb-5 pt-3 text-center">
          <div className="mb-3 flex justify-center">
            <ChatAvatar type={conv.type} title={conv.title} color={conv.color} peer={conv.peer} size={76} />
          </div>
          <div className="text-[17px] font-bold tracking-[-0.01em]">{conv.title}</div>
          <div className="mt-0.5 text-[13px] text-[var(--color-muted)]">
            {isGroup
              ? `Группа · ${plural(conv.memberCount, "участник", "участника", "участников")}`
              : (conv.peer?.position ?? (conv.peer?.username ? `@${conv.peer.username}` : "Личный диалог"))}
          </div>
          {!isGroup && conv.peer?.username && (
            <Link
              href={`/u/${conv.peer.username}`}
              className="mt-2 inline-block rounded-full bg-[var(--color-accent-soft)] px-3.5 py-1.5 text-[12.5px] font-semibold text-[var(--color-accent)] transition hover:opacity-80"
            >
              Открыть профиль
            </Link>
          )}
        </div>

        {isGroup && (
          <div className="px-4 pt-4">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[var(--color-faint)]">
                Участники · {conv.memberCount}
              </span>
            </div>
            {canManage && (
              <button
                onClick={() => setAddOpen(true)}
                className="mb-1 flex w-full items-center gap-3 rounded-[11px] bg-[var(--color-accent-tint)] px-2 py-2 text-left transition hover:opacity-90"
              >
                <span className="grid h-[38px] w-[38px] place-items-center rounded-full bg-[var(--color-accent-soft)]">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
                <span className="text-[14px] font-semibold text-[var(--color-accent)]">
                  Добавить участника
                </span>
              </button>
            )}
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-[11px] px-2 py-2">
                <Avatar name={m.name} src={m.avatarUrl} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium text-[var(--color-ink)]">{m.name}</div>
                  <div className="truncate text-[11.5px] text-[var(--color-faint)]">{m.position ?? ""}</div>
                </div>
                {ROLE_LABEL[m.role] && (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      m.role === "OWNER"
                        ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                        : "bg-[var(--color-surface-warm)] text-[var(--color-muted)]"
                    }`}
                  >
                    {ROLE_LABEL[m.role]}
                  </span>
                )}
              </div>
            ))}
            {conv.members.length > 5 && !showAll && (
              <button
                onClick={() => setShowAll(true)}
                className="w-full py-2 text-center text-[12.5px] font-medium text-[var(--color-accent)]"
              >
                Показать всех · {conv.memberCount}
              </button>
            )}
          </div>
        )}

        <div className="mt-4 border-t border-[var(--color-line)] px-4 pt-4">
          <div className="mb-2 px-1 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[var(--color-faint)]">
            Файлы · {conv.sharedFiles.length}
          </div>
          {conv.sharedFiles.length === 0 && (
            <p className="px-1 text-[13px] text-[var(--color-muted)]">Пока нет общих файлов.</p>
          )}
          {conv.sharedFiles.map((f) => (
            <a
              key={f.id}
              href={`/api/chat/attachments/${f.id}`}
              download={f.filename}
              className="mb-1.5 flex items-center gap-2.5 rounded-[10px] border border-[var(--color-border-card)] bg-[var(--color-surface-warm)] px-2.5 py-2 transition hover:border-[var(--color-accent)]/40"
            >
              <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] bg-[var(--color-accent-soft)] text-[9px] font-bold text-[var(--color-accent)]">
                {(f.filename.split(".").pop() ?? "FILE").slice(0, 4).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-[var(--color-ink)]">{f.filename}</span>
                <span className="block text-[11px] text-[var(--color-faint)]">
                  {formatBytes(f.size)} · {f.authorName} · {chatListTime(f.createdAt)}
                </span>
              </span>
            </a>
          ))}
        </div>

        {isGroup && conv.myRole !== "OWNER" && (
          <div className="mt-4 px-4">
            <button
              onClick={leave}
              disabled={pending}
              className="flex h-[44px] w-full items-center justify-center gap-2 rounded-[12px] border border-[var(--color-urgent)]/30 bg-[var(--color-urgent-bg)]/50 text-[14px] font-semibold text-[var(--color-urgent)] transition hover:bg-[var(--color-urgent-bg)] disabled:opacity-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5M21 12H9" />
              </svg>
              {pending ? "Выходим…" : "Выйти из группы"}
            </button>
          </div>
        )}
      </div>

      {addOpen && <AddMembersDialog conv={conv} people={people} onClose={() => setAddOpen(false)} />}
    </div>
  );
}
