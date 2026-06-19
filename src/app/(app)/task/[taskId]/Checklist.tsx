"use client";

import { useState, useTransition } from "react";
import type { ChecklistItemData } from "@/lib/types";
import { addChecklistItem, deleteChecklistItem, toggleChecklistItem } from "./actions";

const sectionLabel =
  "mb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-faint)]";

export function Checklist({
  taskId,
  initialItems,
}: {
  taskId: string;
  initialItems: ChecklistItemData[];
}) {
  const [items, setItems] = useState<ChecklistItemData[]>(initialItems);
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();

  const done = items.filter((i) => i.done).length;
  const ratio = items.length ? (done / items.length) * 100 : 0;

  function toggle(id: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
    const next = !items.find((i) => i.id === id)?.done;
    startTransition(() => {
      void toggleChecklistItem(id, next);
    });
  }

  function add() {
    const t = text.trim();
    if (!t) {
      setAdding(false);
      return;
    }
    const tempId = `temp-${items.length}-${t.length}`;
    setItems((prev) => [...prev, { id: tempId, text: t, done: false }]);
    setText("");
    startTransition(async () => {
      const res = await addChecklistItem(taskId, t);
      if (res.ok && res.item) {
        setItems((prev) => prev.map((i) => (i.id === tempId ? res.item! : i)));
      } else {
        setItems((prev) => prev.filter((i) => i.id !== tempId));
      }
    });
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    startTransition(() => {
      void deleteChecklistItem(id);
    });
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <h3 className={`${sectionLabel} mb-0`}>Чек-лист</h3>
        {items.length > 0 && (
          <span className="font-mono text-xs text-[var(--color-faint)]">
            {done} из {items.length}
          </span>
        )}
      </div>

      {items.length > 0 && (
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[#F2F1ED]">
          <div className="h-full bg-[var(--color-success)] transition-all" style={{ width: `${ratio}%` }} />
        </div>
      )}

      <div className="space-y-1.5">
        {items.map((i) => (
          <div key={i.id} className="group flex items-center gap-2.5">
            <button
              onClick={() => toggle(i.id)}
              className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2 transition ${
                i.done
                  ? "border-[var(--color-success)] bg-[var(--color-success)] text-white"
                  : "border-[#D5D2CB] text-transparent hover:border-[var(--color-accent)]"
              }`}
              aria-label={i.done ? "Снять отметку" : "Отметить"}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </button>
            <span
              className={`flex-1 text-sm ${i.done ? "text-[var(--color-faint)] line-through" : "text-[var(--color-body)]"}`}
            >
              {i.text}
            </span>
            <button
              onClick={() => remove(i.id)}
              className="text-[var(--color-faint)] opacity-0 transition hover:text-[var(--color-urgent)] group-hover:opacity-100"
              title="Удалить пункт"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="mt-2 flex items-center gap-2">
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
              if (e.key === "Escape") {
                setText("");
                setAdding(false);
              }
            }}
            onBlur={add}
            placeholder="Новый пункт…"
            maxLength={200}
            className="h-8 flex-1 rounded-[8px] border border-[var(--color-border-input)] px-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
          />
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-2 text-sm text-[var(--color-muted)] transition hover:text-[var(--color-accent)]"
        >
          + Добавить пункт
        </button>
      )}
    </div>
  );
}
