"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { chatListTime } from "@/lib/format";
import type { ChatListItem, ChatPeer } from "@/lib/chat-data";
import { ChatAvatar } from "./ChatAvatar";
import { useTyping } from "./ChatLive";
import { NewChatDialog } from "./NewChatDialog";

function IconPin({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2z" />
    </svg>
  );
}

function IconChecks({ double }: { double: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="shrink-0">
      <path d="M18 7l-8 8-4-4" />
      {double && <path d="M22 7l-8 8" />}
    </svg>
  );
}

function ChatRow({ chat, active }: { chat: ChatListItem; active: boolean }) {
  const typingName = useTyping(chat.id);
  const last = chat.lastMessage;

  return (
    <Link
      href={`/chat/${chat.id}`}
      className={`flex items-center gap-3 rounded-[13px] px-2.5 py-2.5 transition ${
        active
          ? "bg-[var(--color-accent-soft)]"
          : "hover:bg-[var(--color-surface-warm)]"
      }`}
    >
      <ChatAvatar type={chat.type} title={chat.title} color={chat.color} peer={chat.peer} size={46} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[14.5px] font-semibold text-[var(--color-ink)]">
            {chat.title}
          </span>
          {last && (
            <span className="ml-auto shrink-0 text-[11.5px] text-[var(--color-faint)]">
              {chatListTime(last.createdAt)}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          {typingName ? (
            <span className="flex-1 truncate text-[13px] italic text-[var(--color-accent)]">
              печатает…
            </span>
          ) : last ? (
            <>
              {last.mine && (
                <span className={last.read ? "text-[var(--color-accent)]" : "text-[var(--color-faint)]"}>
                  <IconChecks double={last.read} />
                </span>
              )}
              <span className="flex-1 truncate text-[13px] text-[var(--color-muted)]">
                {last.mine ? (
                  <span className="text-[var(--color-body)]">Вы: </span>
                ) : chat.type === "GROUP" ? (
                  <span className="text-[var(--color-body)]">{last.authorName}: </span>
                ) : null}
                {last.hasAttachment ? "📎 " : ""}
                {last.body}
              </span>
            </>
          ) : (
            <span className="flex-1 truncate text-[13px] text-[var(--color-faint)]">
              Нет сообщений
            </span>
          )}
          {chat.unread > 0 && (
            <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-[var(--color-accent)] px-1.5 text-[11px] font-bold text-white">
              {chat.unread > 99 ? "99+" : chat.unread}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ChatListPane({
  chats,
  people,
}: {
  chats: ChatListItem[];
  people: ChatPeer[];
}) {
  const params = useParams<{ chatId?: string }>();
  const activeId = params?.chatId ?? null;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "direct" | "group">("all");
  const [newChatOpen, setNewChatOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return chats.filter((c) => {
      if (filter === "direct" && c.type !== "DIRECT") return false;
      if (filter === "group" && c.type !== "GROUP") return false;
      if (q && !c.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [chats, query, filter]);

  const pinned = filtered.filter((c) => c.pinned);
  const rest = filtered.filter((c) => !c.pinned);

  const filters = [
    { key: "all" as const, label: "Все" },
    { key: "direct" as const, label: "Личные" },
    { key: "group" as const, label: "Группы" },
  ];

  return (
    <div
      className={`w-full shrink-0 flex-col border-[var(--color-line)] bg-[var(--color-surface)] md:flex md:w-[330px] md:border-r ${
        activeId ? "hidden" : "flex"
      }`}
    >
      <div className="shrink-0 px-4 pb-3 pt-5">
        <div className="mb-3.5 flex items-center justify-between">
          <h1 className="text-[21px] font-bold tracking-[-0.02em]">Чаты</h1>
          <button
            onClick={() => setNewChatOpen(true)}
            title="Новое сообщение"
            className="grid h-9 w-9 place-items-center rounded-[11px] bg-[var(--color-accent)] text-white shadow-[0_6px_16px_-6px_var(--color-accent)] transition hover:opacity-90"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
            </svg>
          </button>
        </div>
        <div className="relative mb-3">
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-faint)]"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск"
            className="h-[38px] w-full rounded-[11px] border border-[var(--color-border-input)] bg-[var(--color-surface)] pl-9 pr-3 text-[13.5px] outline-none focus:border-[var(--color-accent)] focus:ring-[3px] focus:ring-[var(--color-accent)]/10"
          />
        </div>
        <div className="flex gap-1.5">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition ${
                filter === f.key
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-[var(--color-surface-warm)] font-medium text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {pinned.length > 0 && (
          <>
            <div className="flex items-center gap-1.5 px-2.5 pb-1 pt-2 text-[var(--color-faint)]">
              <IconPin />
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em]">
                Закреплённые
              </span>
            </div>
            {pinned.map((c) => (
              <ChatRow key={c.id} chat={c} active={c.id === activeId} />
            ))}
          </>
        )}
        {rest.length > 0 && (
          <>
            <div className="px-2.5 pb-1 pt-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-faint)]">
                Все чаты
              </span>
            </div>
            {rest.map((c) => (
              <ChatRow key={c.id} chat={c} active={c.id === activeId} />
            ))}
          </>
        )}
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-[13px] text-[var(--color-muted)]">
            {chats.length === 0
              ? "Пока нет чатов — напишите кому-нибудь первым."
              : "Ничего не найдено."}
          </p>
        )}
      </div>

      {newChatOpen && <NewChatDialog people={people} onClose={() => setNewChatOpen(false)} />}
    </div>
  );
}
