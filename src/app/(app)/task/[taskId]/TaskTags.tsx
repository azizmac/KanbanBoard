"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { TAG_TINT_KEYS, tint } from "@/lib/tints";
import type { TagData } from "@/lib/types";
import { addTaskTag, removeTaskTag } from "./actions";

export function TaskTags({
  taskId,
  initialTags,
  boardTags,
}: {
  taskId: string;
  initialTags: TagData[];
  boardTags: TagData[];
}) {
  const [tags, setTags] = useState<TagData[]>(initialTags);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(TAG_TINT_KEYS[0]);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function add(input: { name: string; color?: string }) {
    const trimmed = input.name.trim();
    if (!trimmed) return;
    if (tags.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
      setName("");
      return;
    }
    startTransition(async () => {
      const res = await addTaskTag(taskId, { name: trimmed, color: input.color });
      if (res.ok && res.tag) setTags((prev) => [...prev, res.tag!]);
    });
    setName("");
  }

  function remove(tagId: string) {
    setTags((prev) => prev.filter((t) => t.id !== tagId));
    startTransition(() => {
      void removeTaskTag(taskId, tagId);
    });
  }

  const suggestions = boardTags.filter((b) => !tags.some((t) => t.id === b.id));

  return (
    <div ref={ref} className="relative inline-flex flex-wrap items-center gap-1.5">
      {tags.map((t) => {
        const c = tint(t.color);
        return (
          <span
            key={t.id}
            className="group inline-flex items-center gap-1 rounded-[6px] px-2 py-[3px] text-[11px] font-medium"
            style={{ background: c.bg, color: c.text }}
          >
            {t.name}
            <button
              onClick={() => remove(t.id)}
              className="opacity-50 transition hover:opacity-100"
              title="Убрать тег"
            >
              ✕
            </button>
          </span>
        );
      })}

      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-[6px] border border-dashed border-[var(--color-border-input)] px-2 py-[3px] text-[11px] font-medium text-[var(--color-muted)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      >
        + тег
      </button>

      {open && (
        <div className="absolute left-0 top-7 z-30 w-[230px] rounded-[12px] border border-[var(--color-border-card)] bg-[var(--color-surface)] p-2.5 shadow-[0_10px_30px_rgba(20,20,20,0.14)]">
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") add({ name, color });
                if (e.key === "Escape") setOpen(false);
              }}
              placeholder="Новый тег"
              maxLength={24}
              className="h-8 min-w-0 flex-1 rounded-[8px] border border-[var(--color-border-input)] px-2 text-[13px] outline-none focus:border-[var(--color-accent)]"
            />
            <button
              onClick={() => add({ name, color })}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-[var(--color-accent)] text-white transition hover:opacity-90"
              title="Добавить"
            >
              +
            </button>
          </div>
          <div className="mt-2 flex gap-1.5">
            {TAG_TINT_KEYS.map((k) => {
              const t = tint(k);
              return (
                <button
                  key={k}
                  onClick={() => setColor(k)}
                  className={`h-5 w-5 rounded-full transition ${color === k ? "ring-2 ring-offset-1 ring-[var(--color-ink)]" : ""}`}
                  style={{ background: t.bg }}
                  title={k}
                >
                  <span className="mx-auto block h-2 w-2 rounded-full" style={{ background: t.text }} />
                </button>
              );
            })}
          </div>

          {suggestions.length > 0 && (
            <div className="mt-2.5 border-t border-[var(--color-line)] pt-2">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--color-faint)]">
                На доске
              </p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => {
                  const c = tint(s.color);
                  return (
                    <button
                      key={s.id}
                      onClick={() => add({ name: s.name, color: s.color })}
                      className="rounded-[6px] px-2 py-[3px] text-[11px] font-medium transition hover:opacity-80"
                      style={{ background: c.bg, color: c.text }}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
