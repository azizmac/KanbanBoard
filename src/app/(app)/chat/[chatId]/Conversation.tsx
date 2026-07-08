"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AvatarStack } from "@/components/Avatar";
import { chatDayLabel, chatTime, plural } from "@/lib/format";
import type { ChatMessageDTO, ChatPeer, ChatTarget, ConversationDTO } from "@/lib/chat-data";
import { ChatAvatar } from "../ChatAvatar";
import { useTyping } from "../ChatLive";
import {
  deleteMessage,
  editMessage,
  markChatRead,
  notifyTyping,
  pinMessage,
  sendMessage,
  toggleChatPinned,
  toggleReaction,
  unpinMessage,
} from "../actions";
import { ForwardDialog } from "./ForwardDialog";
import { InfoPanel } from "./InfoPanel";
import { MessageBubble, type MessageHandlers } from "./MessageBubble";

type PendingMsg = {
  tempId: string;
  serverId: string | null;
  body: string;
  fileNames: string[];
  createdAt: string;
};

const RUN_GAP_MS = 5 * 60 * 1000;

export function Conversation({
  conv,
  targets,
  people,
}: {
  conv: ConversationDTO;
  targets: ChatTarget[];
  people: ChatPeer[];
}) {
  const router = useRouter();
  const isGroup = conv.type === "GROUP";
  const canManage = conv.myRole === "OWNER" || conv.myRole === "ADMIN";
  const typingName = useTyping(conv.id);

  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [replyTo, setReplyTo] = useState<ChatMessageDTO | null>(null);
  const [editing, setEditing] = useState<ChatMessageDTO | null>(null);
  const [pendingMsgs, setPendingMsgs] = useState<PendingMsg[]>([]);
  const [forwardMsg, setForwardMsg] = useState<ChatMessageDTO | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const msgRefs = useRef(new Map<string, HTMLDivElement>());
  const lastTypingSent = useRef(0);

  const messageIds = useMemo(() => new Set(conv.messages.map((m) => m.id)), [conv.messages]);
  const visiblePending = pendingMsgs.filter((p) => !p.serverId || !messageIds.has(p.serverId));
  const lastMsgId = conv.messages[conv.messages.length - 1]?.id ?? null;

  // mark as read on open + whenever the newest message changes
  useEffect(() => {
    void markChatRead(conv.id);
  }, [conv.id, lastMsgId]);

  // stick to the bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastMsgId, visiblePending.length, typingName]);

  function jumpTo(messageId: string) {
    const el = msgRefs.current.get(messageId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(messageId);
    setTimeout(() => setHighlightId(null), 1600);
  }

  function focusComposer() {
    textareaRef.current?.focus();
  }

  const handlers: MessageHandlers = {
    onReply: (m) => {
      setEditing(null);
      setReplyTo(m);
      focusComposer();
    },
    onEdit: (m) => {
      setReplyTo(null);
      setEditing(m);
      setDraft(m.body);
      focusComposer();
    },
    onForward: (m) => setForwardMsg(m),
    onPin: (m) => {
      startTransition(async () => {
        const res = await pinMessage(m.id);
        if (res.ok) router.refresh();
      });
    },
    onDelete: (m) => {
      if (!confirm("Удалить сообщение?")) return;
      startTransition(async () => {
        const res = await deleteMessage(m.id);
        if (res.ok) router.refresh();
        else alert("error" in res ? (res.error ?? "Ошибка") : "Ошибка");
      });
    },
    onReact: (m, emoji) => {
      startTransition(async () => {
        const res = await toggleReaction({ messageId: m.id, emoji });
        if (res.ok) router.refresh();
      });
    },
    onJumpTo: jumpTo,
  };

  function onDraftChange(v: string) {
    setDraft(v);
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 140) + "px";
    }
    const now = Date.now();
    if (!editing && now - lastTypingSent.current > 2500) {
      lastTypingSent.current = now;
      void notifyTyping(conv.id).catch(() => {});
    }
  }

  function resetComposerHeight() {
    const el = textareaRef.current;
    if (el) el.style.height = "auto";
  }

  function send() {
    const text = draft.trim();

    if (editing) {
      if (!text) return;
      const target = editing;
      setEditing(null);
      setDraft("");
      resetComposerHeight();
      startTransition(async () => {
        const res = await editMessage({ messageId: target.id, body: text });
        if (res.ok) router.refresh();
        else alert(res.error ?? "Не удалось сохранить");
      });
      return;
    }

    if (!text && files.length === 0) return;
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const sentFiles = files;
    const sentReply = replyTo;
    // добавляя новое, заодно выбрасываем подтверждённые (уже пришли с сервера)
    setPendingMsgs((prev) => [
      ...prev.filter((p) => !p.serverId || !messageIds.has(p.serverId)),
      {
        tempId,
        serverId: null,
        body: text,
        fileNames: sentFiles.map((f) => f.name),
        createdAt: new Date().toISOString(),
      },
    ]);
    setDraft("");
    setFiles([]);
    setReplyTo(null);
    resetComposerHeight();

    startTransition(async () => {
      let serverId: string | null = null;
      let error: string | null = null;
      if (sentFiles.length > 0) {
        const fd = new FormData();
        fd.set("body", text);
        if (sentReply) fd.set("replyToId", sentReply.id);
        for (const f of sentFiles) fd.append("files", f);
        try {
          const res = await fetch(`/api/chat/${conv.id}/messages`, { method: "POST", body: fd });
          const json = (await res.json().catch(() => null)) as { ok?: boolean; id?: string; error?: string } | null;
          if (res.ok && json?.ok && json.id) serverId = json.id;
          else error = json?.error ?? "Не удалось отправить";
        } catch {
          error = "Нет соединения";
        }
      } else {
        const res = await sendMessage({ chatId: conv.id, body: text, replyToId: sentReply?.id });
        if (res.ok) serverId = res.id;
        else error = res.error ?? "Не удалось отправить";
      }
      if (error) {
        setPendingMsgs((prev) => prev.filter((p) => p.tempId !== tempId));
        alert(error);
        return;
      }
      setPendingMsgs((prev) => prev.map((p) => (p.tempId === tempId ? { ...p, serverId } : p)));
      router.refresh();
    });
  }

  function togglePinChat() {
    setMenuOpen(false);
    startTransition(async () => {
      const res = await toggleChatPinned(conv.id);
      if (res.ok) router.refresh();
    });
  }

  function unpin() {
    startTransition(async () => {
      const res = await unpinMessage(conv.id);
      if (res.ok) router.refresh();
    });
  }

  // rows: day separators + message runs
  const rows = useMemo(() => {
    const out: ({ kind: "day"; label: string; key: string } | {
      kind: "msg";
      msg: ChatMessageDTO;
      showAvatar: boolean;
      showName: boolean;
    })[] = [];
    const msgs = conv.messages;
    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i];
      const prev = msgs[i - 1];
      const next = msgs[i + 1];
      const day = new Date(m.createdAt).toDateString();
      if (!prev || new Date(prev.createdAt).toDateString() !== day) {
        out.push({ kind: "day", label: chatDayLabel(m.createdAt), key: `day-${day}` });
      }
      const sameRunPrev =
        !!prev &&
        prev.authorId === m.authorId &&
        new Date(prev.createdAt).toDateString() === day &&
        new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < RUN_GAP_MS;
      const sameRunNext =
        !!next &&
        next.authorId === m.authorId &&
        new Date(next.createdAt).toDateString() === day &&
        new Date(next.createdAt).getTime() - new Date(m.createdAt).getTime() < RUN_GAP_MS;
      out.push({
        kind: "msg",
        msg: m,
        showAvatar: !m.mine && !sameRunNext, // avatar at the bottom of a run
        showName: !m.mine && isGroup && !sameRunPrev,
      });
    }
    return out;
  }, [conv.messages, isGroup]);

  const subtitle = isGroup
    ? plural(conv.memberCount, "участник", "участника", "участников")
    : (conv.peer?.position ?? (conv.peer?.username ? `@${conv.peer.username}` : ""));

  return (
    <div className="fixed inset-0 z-40 flex min-w-0 flex-1 bg-[var(--color-canvas)] pt-[env(safe-area-inset-top)] md:static md:z-auto md:h-full md:pt-0">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* header */}
        <div className="flex h-[60px] shrink-0 items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-surface)] px-3 md:px-5">
          <Link
            href="/chat"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-[var(--color-ink)] transition hover:bg-[var(--color-surface-warm)] md:hidden"
            aria-label="К списку чатов"
          >
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <button onClick={() => setInfoOpen(true)} className="flex min-w-0 items-center gap-3 text-left">
            <ChatAvatar type={conv.type} title={conv.title} color={conv.color} peer={conv.peer} size={40} />
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold text-[var(--color-ink)]">
                {conv.title}
              </span>
              <span className="block truncate text-[12.5px] text-[var(--color-muted)]">
                {typingName ? (
                  <span className="italic text-[var(--color-accent)]">{typingName} печатает…</span>
                ) : (
                  subtitle
                )}
              </span>
            </span>
          </button>
          <div className="ml-auto flex shrink-0 items-center gap-2.5">
            {isGroup && (
              <button onClick={() => setInfoOpen(true)} className="hidden md:block" title="Участники">
                <AvatarStack names={conv.members.map((m) => m.name)} size={30} max={3} />
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
                className="grid h-9 w-9 place-items-center rounded-[10px] border border-[var(--color-border-input)] bg-[var(--color-surface)] text-[var(--color-muted)] transition hover:border-[var(--color-accent)]"
                aria-label="Меню чата"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="1.7" />
                  <circle cx="12" cy="12" r="1.7" />
                  <circle cx="12" cy="19" r="1.7" />
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-[42px] z-40 w-[220px] rounded-[12px] border border-[var(--color-border-card)] bg-[var(--color-surface)] p-1.5 shadow-[0_8px_28px_rgba(20,20,20,0.12)]">
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setMenuOpen(false);
                      setInfoOpen(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[13.5px] font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-surface-warm)]"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 11v5M12 8h.01" />
                    </svg>
                    {isGroup ? "Профиль группы" : "Профиль"}
                  </button>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={togglePinChat}
                    className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[13.5px] font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-surface-warm)]"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2z" />
                    </svg>
                    {conv.pinnedByMe ? "Открепить чат" : "Закрепить чат"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* pinned message bar */}
        {conv.pinnedMessage && (
          <div className="flex shrink-0 items-center gap-2.5 border-b border-[var(--color-line)] bg-[var(--color-accent-tint)] px-4 py-2 md:px-5">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="var(--color-accent)" className="shrink-0">
              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2z" />
            </svg>
            <button
              onClick={() => jumpTo(conv.pinnedMessage!.id)}
              className="min-w-0 flex-1 border-l-2 border-[var(--color-accent)] pl-2.5 text-left"
            >
              <span className="block text-[11.5px] font-semibold text-[var(--color-accent)]">
                Закреплённое · {conv.pinnedMessage.authorName}
              </span>
              <span className="block truncate text-[13px] text-[var(--color-body)]">
                {conv.pinnedMessage.body}
              </span>
            </button>
            <button
              onClick={unpin}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-[7px] text-[var(--color-muted)] transition hover:bg-[var(--color-surface)]"
              aria-label="Открепить"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* messages */}
        <div ref={scrollRef} className="scroll-thin min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-6">
          <div className="mx-auto flex max-w-[860px] flex-col gap-2.5">
            {conv.messages.length === 0 && visiblePending.length === 0 && (
              <div className="py-16 text-center text-[13.5px] text-[var(--color-muted)]">
                Сообщений пока нет — напишите первым.
              </div>
            )}
            {rows.map((row) =>
              row.kind === "day" ? (
                <div key={row.key} className="my-1.5 self-center rounded-full border border-[var(--color-border-card)] bg-[var(--color-surface)] px-3 py-1 text-[11.5px] font-semibold text-[var(--color-muted)]">
                  {row.label}
                </div>
              ) : (
                <div
                  key={row.msg.id}
                  ref={(el) => {
                    if (el) msgRefs.current.set(row.msg.id, el);
                    else msgRefs.current.delete(row.msg.id);
                  }}
                >
                  <MessageBubble
                    msg={row.msg}
                    showAvatar={row.showAvatar}
                    showName={row.showName}
                    canDelete={row.msg.mine || (isGroup && canManage)}
                    highlighted={highlightId === row.msg.id}
                    handlers={handlers}
                  />
                </div>
              ),
            )}
            {visiblePending.map((p) => (
              <div key={p.tempId} className="flex justify-end">
                <div className="max-w-[82%] rounded-[16px] rounded-tr-[5px] bg-gradient-to-br from-[#8B7CF9] to-[#6D5EF0] px-3.5 py-2 opacity-70 md:max-w-[520px]">
                  {p.fileNames.map((n) => (
                    <span key={n} className="block text-[13px] font-medium text-white/90">
                      📎 {n}
                    </span>
                  ))}
                  {p.body && (
                    <span className="block whitespace-pre-wrap break-words text-[14.5px] leading-[1.5] text-white">
                      {p.body}
                    </span>
                  )}
                  <span className="mt-0.5 flex items-center justify-end gap-1 text-white/75">
                    <span className="text-[11px]">{chatTime(p.createdAt)}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 3" />
                    </svg>
                  </span>
                </div>
              </div>
            ))}
            {typingName && (
              <div className="flex items-center gap-2 px-1 text-[12.5px] italic text-[var(--color-muted)]">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-faint)] [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-faint)] [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-faint)] [animation-delay:240ms]" />
                </span>
                {typingName} печатает…
              </div>
            )}
          </div>
        </div>

        {/* composer */}
        <div className="shrink-0 border-t border-[var(--color-line)] bg-[var(--color-surface)] px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2.5 md:px-5 md:pb-4">
          {(replyTo || editing) && (
            <div className="mb-2 flex items-center gap-2.5 rounded-[10px] bg-[var(--color-accent-tint)] px-3 py-1.5">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" className="shrink-0">
                {editing ? (
                  <>
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
                  </>
                ) : (
                  <>
                    <path d="M9 17H5a2 2 0 0 1-2-2V5M3 5l6-2v4" />
                    <path d="M21 11v4a2 2 0 0 1-2 2H8" />
                  </>
                )}
              </svg>
              <div className="min-w-0 flex-1 border-l-2 border-[var(--color-accent)] pl-2.5">
                <div className="text-[11.5px] font-semibold text-[var(--color-accent)]">
                  {editing ? "Редактирование" : `Ответ · ${replyTo!.authorName}`}
                </div>
                <div className="truncate text-[12.5px] text-[var(--color-muted)]">
                  {(editing ?? replyTo)!.body || "Вложение"}
                </div>
              </div>
              <button
                onClick={() => {
                  setReplyTo(null);
                  if (editing) {
                    setEditing(null);
                    setDraft("");
                    resetComposerHeight();
                  }
                }}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-[7px] text-[var(--color-muted)] transition hover:bg-[var(--color-surface)]"
                aria-label="Отменить"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {files.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {files.map((f, i) => (
                <span
                  key={`${f.name}-${i}`}
                  className="flex items-center gap-1.5 rounded-full border border-[var(--color-border-card)] bg-[var(--color-surface-warm)] py-1 pl-2.5 pr-1.5 text-[12.5px] text-[var(--color-body)]"
                >
                  📎 {f.name}
                  <button
                    onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="grid h-5 w-5 place-items-center rounded-full text-[var(--color-faint)] transition hover:text-[var(--color-ink)]"
                    aria-label={`Убрать ${f.name}`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2.5">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const list = e.target.files ? [...e.target.files] : [];
                if (list.length) setFiles((prev) => [...prev, ...list].slice(0, 10));
                e.target.value = "";
              }}
            />
            {!editing && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[12px] border border-[var(--color-border-input)] bg-[var(--color-surface)] text-[var(--color-muted)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                title="Прикрепить файл"
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
            )}
            <textarea
              ref={textareaRef}
              rows={1}
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
                if (e.key === "Escape" && (editing || replyTo)) {
                  setReplyTo(null);
                  setEditing(null);
                  setDraft("");
                  resetComposerHeight();
                }
              }}
              placeholder="Сообщение…"
              className="max-h-[140px] min-h-[42px] flex-1 resize-none rounded-[13px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-3.5 py-[10px] text-[14px] leading-[1.45] outline-none focus:border-[var(--color-accent)] focus:ring-[3px] focus:ring-[var(--color-accent)]/10"
            />
            <button
              onClick={send}
              disabled={!draft.trim() && files.length === 0}
              className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[12px] bg-[var(--color-accent)] text-white shadow-[0_6px_16px_-5px_var(--color-accent)] transition hover:opacity-90 disabled:opacity-40 disabled:shadow-none"
              title={editing ? "Сохранить" : "Отправить"}
            >
              {editing ? (
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {infoOpen && <InfoPanel conv={conv} people={people} onClose={() => setInfoOpen(false)} />}
      {forwardMsg && (
        <ForwardDialog msg={forwardMsg} targets={targets} onClose={() => setForwardMsg(null)} />
      )}
    </div>
  );
}
