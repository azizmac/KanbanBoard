"use client";

import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { chatTime, formatBytes } from "@/lib/format";
import { avatarTint } from "@/lib/tints";
import type { ChatMessageDTO } from "@/lib/chat-data";

export const QUICK_REACTIONS = ["👍", "❤️", "🔥", "😂", "😮", "🙏"];

function IconChecks({ double }: { double: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="shrink-0">
      <path d="M18 7l-8 8-4-4" />
      {double && <path d="M22 7l-8 8" />}
    </svg>
  );
}

function IconReply() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 17H5a2 2 0 0 1-2-2V5M3 5l6-2v4" />
      <path d="M21 11v4a2 2 0 0 1-2 2H8" />
    </svg>
  );
}
function IconEdit() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}
function IconForward() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 17H8a5 5 0 0 1 0-10h9M13 3l4 4-4 4" />
    </svg>
  );
}
function IconPin() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2z" />
    </svg>
  );
}
function IconCopy() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}

export type MessageHandlers = {
  onReply: (msg: ChatMessageDTO) => void;
  onEdit: (msg: ChatMessageDTO) => void;
  onForward: (msg: ChatMessageDTO) => void;
  onPin: (msg: ChatMessageDTO) => void;
  onDelete: (msg: ChatMessageDTO) => void;
  onReact: (msg: ChatMessageDTO, emoji: string) => void;
  onJumpTo: (messageId: string) => void;
};

export function MessageBubble({
  msg,
  showAvatar,
  showName,
  canDelete,
  highlighted,
  handlers,
}: {
  msg: ChatMessageDTO;
  showAvatar: boolean;
  showName: boolean;
  canDelete: boolean;
  highlighted: boolean;
  handlers: MessageHandlers;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const mine = msg.mine;
  const nameColor = avatarTint(msg.authorName).text;

  const images = msg.attachments.filter((a) => a.mimeType.startsWith("image/"));
  const files = msg.attachments.filter((a) => !a.mimeType.startsWith("image/"));

  const itemClass =
    "flex w-full items-center gap-2.5 rounded-[9px] px-3 py-2 text-left text-[14px] text-[var(--color-ink)] transition hover:bg-[var(--color-surface-warm)]";

  function copyBody() {
    if (msg.body) void navigator.clipboard?.writeText(msg.body);
    setMenuOpen(false);
  }

  const menuItems = (
    <>
      <div className="flex items-center justify-between gap-1 px-2 pb-1.5 pt-1">
        {QUICK_REACTIONS.map((e) => (
          <button
            key={e}
            onClick={() => {
              handlers.onReact(msg, e);
              setMenuOpen(false);
            }}
            className="grid h-9 w-9 place-items-center rounded-full text-[19px] transition hover:bg-[var(--color-surface-warm)]"
          >
            {e}
          </button>
        ))}
      </div>
      <div className="mx-2 mb-1 h-px bg-[var(--color-line)]" />
      <button className={itemClass} onClick={() => { handlers.onReply(msg); setMenuOpen(false); }}>
        <IconReply /> Ответить
      </button>
      {mine && (
        <button className={itemClass} onClick={() => { handlers.onEdit(msg); setMenuOpen(false); }}>
          <IconEdit /> Редактировать
        </button>
      )}
      <button className={itemClass} onClick={() => { handlers.onForward(msg); setMenuOpen(false); }}>
        <IconForward /> Переслать
      </button>
      <button className={itemClass} onClick={() => { handlers.onPin(msg); setMenuOpen(false); }}>
        <IconPin /> Закрепить
      </button>
      {msg.body && (
        <button className={itemClass} onClick={copyBody}>
          <IconCopy /> Копировать
        </button>
      )}
      {canDelete && (
        <>
          <div className="mx-2 my-1 h-px bg-[var(--color-line)]" />
          <button
            className="flex w-full items-center gap-2.5 rounded-[9px] px-3 py-2 text-left text-[14px] text-[var(--color-urgent)] transition hover:bg-[var(--color-urgent-bg)]"
            onClick={() => { handlers.onDelete(msg); setMenuOpen(false); }}
          >
            <IconTrash /> Удалить
          </button>
        </>
      )}
    </>
  );

  return (
    <div className={`group relative flex gap-2.5 ${mine ? "justify-end" : ""}`}>
      {!mine && (
        <div className="w-[34px] shrink-0 self-end">
          {showAvatar && <Avatar name={msg.authorName} src={msg.authorAvatarUrl} size={34} />}
        </div>
      )}

      <div className={`relative min-w-0 max-w-[82%] md:max-w-[520px] ${mine ? "flex flex-col items-end" : ""}`}>
        {/* bubble */}
        <div
          onClick={() => setMenuOpen((v) => !v)}
          className={`block cursor-pointer text-left transition ${
            highlighted ? "ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--color-canvas)]" : ""
          } ${
            mine
              ? "rounded-[16px] rounded-tr-[5px] bg-gradient-to-br from-[#8B7CF9] to-[#6D5EF0] shadow-[0_6px_16px_-6px_rgba(109,94,240,0.5)]"
              : "rounded-[16px] rounded-tl-[5px] border border-[var(--color-border-card)] bg-[var(--color-surface)] shadow-[0_3px_10px_-4px_rgba(20,20,20,0.08)]"
          } px-3.5 py-2`}
        >
          {showName && !mine && (
            <span className="mb-0.5 block text-[13px] font-semibold" style={{ color: nameColor }}>
              {msg.authorName}
            </span>
          )}

          {msg.forwardedFrom && (
            <span className={`mb-1 flex items-center gap-1.5 text-[12px] italic ${mine ? "text-white/80" : "text-[var(--color-accent)]"}`}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 17H5a2 2 0 0 1-2-2V5M7 3l-4 2 4 2" />
                <path d="M21 11v4a2 2 0 0 1-2 2H8" />
              </svg>
              Переслано от {msg.forwardedFrom}
            </span>
          )}

          {msg.replyTo && (
            <span
              role="link"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                handlers.onJumpTo(msg.replyTo!.id);
              }}
              className={`mb-1.5 block cursor-pointer border-l-2 py-0.5 pl-2.5 ${
                mine ? "border-white/60" : "border-[var(--color-accent)]"
              }`}
            >
              <span className={`block text-[12px] font-semibold ${mine ? "text-white/90" : "text-[var(--color-accent)]"}`}>
                {msg.replyTo.authorName}
              </span>
              <span className={`block truncate text-[12.5px] ${mine ? "text-white/70" : "text-[var(--color-muted)]"}`}>
                {msg.replyTo.body}
              </span>
            </span>
          )}

          {images.length > 0 && (
            <span className={`flex flex-wrap gap-1.5 ${msg.body ? "mb-1.5" : ""}`}>
              {images.map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.id}
                  src={`/api/chat/attachments/${img.id}`}
                  alt={img.filename}
                  className="max-h-[240px] max-w-[240px] rounded-[10px] object-cover"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`/api/chat/attachments/${img.id}`, "_blank");
                  }}
                />
              ))}
            </span>
          )}

          {files.map((f) => (
            <span key={f.id} className={`flex items-center gap-2.5 ${msg.body ? "mb-1.5" : ""} py-0.5`}>
              <span
                className={`grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[11px] text-[10px] font-bold ${
                  mine ? "bg-white/20 text-white" : "bg-[var(--color-urgent-bg)] text-[var(--color-urgent)]"
                }`}
              >
                {(f.filename.split(".").pop() ?? "FILE").slice(0, 4).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className={`block truncate text-[13.5px] font-medium ${mine ? "text-white" : "text-[var(--color-ink)]"}`}>
                  {f.filename}
                </span>
                <span className={`block text-[12px] ${mine ? "text-white/70" : "text-[var(--color-faint)]"}`}>
                  {formatBytes(f.size)}
                </span>
              </span>
              <a
                href={`/api/chat/attachments/${f.id}`}
                download={f.filename}
                onClick={(e) => e.stopPropagation()}
                className={`ml-1 grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border transition ${
                  mine
                    ? "border-white/30 text-white hover:bg-white/10"
                    : "border-[var(--color-border-input)] text-[var(--color-muted)] hover:border-[var(--color-accent)]"
                }`}
                title="Скачать"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
                </svg>
              </a>
            </span>
          ))}

          {msg.body && (
            <span className={`block whitespace-pre-wrap break-words text-[14.5px] leading-[1.5] ${mine ? "text-white" : "text-[var(--color-body)]"}`}>
              {msg.body}
            </span>
          )}

          <span className={`mt-0.5 flex items-center justify-end gap-1 ${mine ? "text-white/75" : "text-[var(--color-faint)]"}`}>
            {msg.editedAt && <span className="text-[11px] italic">изм.</span>}
            <span className="text-[11px]">{chatTime(msg.createdAt)}</span>
            {mine && <IconChecks double={msg.read} />}
          </span>
        </div>

        {/* reactions */}
        {msg.reactions.length > 0 && (
          <div className={`mt-1.5 flex flex-wrap gap-1.5 ${mine ? "justify-end" : ""}`}>
            {msg.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => handlers.onReact(msg, r.emoji)}
                title={r.names.join(", ")}
                className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[12px] font-semibold transition ${
                  r.mine
                    ? "border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                    : "border-[var(--color-border-card)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-accent)]/40"
                }`}
              >
                <span className="text-[13px] leading-none">{r.emoji}</span>
                {r.count}
              </button>
            ))}
          </div>
        )}

        {/* desktop dropdown */}
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-30 hidden md:block" onClick={() => setMenuOpen(false)} />
            <div
              className={`absolute top-full z-40 mt-1.5 hidden w-[250px] rounded-[14px] border border-[var(--color-border-card)] bg-[var(--color-surface)] p-1.5 shadow-[0_18px_44px_-12px_rgba(20,20,20,0.25)] md:block ${
                mine ? "right-0" : "left-0"
              }`}
            >
              {menuItems}
            </div>
          </>
        )}
      </div>

      {/* mobile action sheet */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 md:hidden" onClick={() => setMenuOpen(false)}>
          <div
            className="rounded-t-[22px] border-t border-[var(--color-border-card)] bg-[var(--color-surface)] px-3 pb-[max(18px,env(safe-area-inset-bottom))] pt-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-[var(--color-border-input)]" />
            {menuItems}
          </div>
        </div>
      )}
    </div>
  );
}
