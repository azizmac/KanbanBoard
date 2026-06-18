"use client";

import { type KeyboardEvent, useRef, useState } from "react";
import type { TeamUser } from "@/lib/types";
import { Avatar } from "./Avatar";

export function MentionTextarea({
  value,
  onChange,
  users,
  placeholder,
  rows = 3,
  className = "",
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  users: TeamUser[];
  placeholder?: string;
  rows?: number;
  className?: string;
  /** Called on Cmd/Ctrl+Enter. */
  onSubmit?: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [atIndex, setAtIndex] = useState(0);
  const [active, setActive] = useState(0);

  const suggestions = open
    ? users
        .filter((u) => {
          if (!u.username) return false;
          const q = query.toLowerCase();
          return u.username.toLowerCase().includes(q) || u.name.toLowerCase().includes(q);
        })
        .slice(0, 6)
    : [];

  function detect(text: string, caret: number) {
    const upto = text.slice(0, caret);
    const m = upto.match(/(?:^|\s)@(\w*)$/);
    if (m) {
      setOpen(true);
      setQuery(m[1].toLowerCase());
      setAtIndex(caret - m[1].length - 1);
      setActive(0);
    } else {
      setOpen(false);
    }
  }

  function insert(u: TeamUser) {
    if (!u.username) return;
    const el = ref.current;
    const caret = el?.selectionStart ?? value.length;
    const before = value.slice(0, atIndex);
    const after = value.slice(caret);
    const inserted = `@${u.username} `;
    const next = before + inserted + after;
    onChange(next);
    setOpen(false);
    requestAnimationFrame(() => {
      const pos = (before + inserted).length;
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (open && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => (a + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => (a - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insert(suggestions[active]);
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
    }
    if (onSubmit && (e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          detect(e.target.value, e.target.selectionStart ?? e.target.value.length);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className={`w-full resize-y rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3 text-sm outline-none focus:border-[var(--color-accent)] ${className}`}
      />

      {open && suggestions.length > 0 && (
        <ul className="absolute z-30 mt-1 w-72 overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] py-1 shadow-lg">
          {suggestions.map((u, i) => (
            <li key={u.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insert(u);
                }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm ${
                  i === active ? "bg-[var(--color-accent-soft)]" : ""
                }`}
              >
                <Avatar name={u.name} size={24} />
                <span className="truncate">
                  <span className="font-medium">@{u.username}</span>
                  <span className="ml-1.5 text-xs text-[var(--color-muted)]">{u.name}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
