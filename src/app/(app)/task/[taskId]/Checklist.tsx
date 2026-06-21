"use client";

import { useState, useTransition } from "react";
import type { ChecklistItemData } from "@/lib/types";
import {
  addChecklistItem,
  deleteChecklistItem,
  setChecklistAssignee,
  setChecklistDue,
  toggleChecklistItem,
} from "./actions";

const sectionLabel =
  "mb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-faint)]";

function overdue(due: string | null, done: boolean) {
  return !done && due != null && new Date(due).getTime() < Date.now();
}

export function Checklist({
  taskId,
  initialItems,
  team,
}: {
  taskId: string;
  initialItems: ChecklistItemData[];
  team: { id: string; name: string }[];
}) {
  const [items, setItems] = useState<ChecklistItemData[]>(initialItems);
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();

  const done = items.filter((i) => i.done).length;
  const ratio = items.length ? (done / items.length) * 100 : 0;

  const patch = (id: string, data: Partial<ChecklistItemData>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...data } : i)));

  function toggle(id: string) {
    const next = !items.find((i) => i.id === id)?.done;
    patch(id, { done: next });
    startTransition(() => void toggleChecklistItem(id, next));
  }

  function assign(id: string, userId: string) {
    patch(id, { assignee: userId ? (team.find((t) => t.id === userId) ?? null) : null });
    startTransition(() => void setChecklistAssignee(id, userId || null));
  }

  function setDue(id: string, date: string) {
    patch(id, { dueDate: date || null });
    startTransition(() => void setChecklistDue(id, date || null));
  }

  function add() {
    const t = text.trim();
    if (!t) {
      setAdding(false);
      return;
    }
    const tempId = `temp-${items.length}-${t.length}`;
    setItems((prev) => [...prev, { id: tempId, text: t, done: false, dueDate: null, assignee: null }]);
    setText("");
    startTransition(async () => {
      const res = await addChecklistItem(taskId, t);
      if (res.ok && res.item) setItems((prev) => prev.map((i) => (i.id === tempId ? res.item! : i)));
      else setItems((prev) => prev.filter((i) => i.id !== tempId));
    });
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    startTransition(() => void deleteChecklistItem(id));
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <h3 className={`${sectionLabel} mb-0`}>Подзадачи</h3>
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
        {items.map((i) => {
          const temp = i.id.startsWith("temp-");
          return (
            <div key={i.id} className="group flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[8px] px-1 py-1 hover:bg-[var(--color-surface-warm)]">
              <button
                onClick={() => toggle(i.id)}
                disabled={temp}
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
              <span className={`min-w-[120px] flex-1 text-sm ${i.done ? "text-[var(--color-faint)] line-through" : "text-[var(--color-body)]"}`}>
                {i.text}
              </span>

              {/* assignee */}
              <select
                value={i.assignee?.id ?? ""}
                disabled={temp}
                onChange={(e) => assign(i.id, e.target.value)}
                title="Исполнитель подзадачи"
                className="h-7 max-w-[130px] rounded-[7px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-1.5 text-[12px] text-[var(--color-muted)] outline-none focus:border-[var(--color-accent)]"
              >
                <option value="">— кто</option>
                {team.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>

              {/* due */}
              <input
                type="date"
                value={i.dueDate ? i.dueDate.slice(0, 10) : ""}
                disabled={temp}
                onChange={(e) => setDue(i.id, e.target.value)}
                title="Срок подзадачи"
                className={`h-7 w-[124px] rounded-[7px] border bg-[var(--color-surface)] px-1.5 text-[12px] outline-none focus:border-[var(--color-accent)] ${
                  overdue(i.dueDate, i.done)
                    ? "border-[var(--color-urgent)] text-[var(--color-urgent)]"
                    : "border-[var(--color-border-input)] text-[var(--color-muted)]"
                }`}
              />

              <button
                onClick={() => remove(i.id)}
                className="shrink-0 text-[var(--color-faint)] opacity-0 transition hover:text-[var(--color-urgent)] group-hover:opacity-100"
                title="Удалить подзадачу"
              >
                ✕
              </button>
            </div>
          );
        })}
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
            placeholder="Новая подзадача…"
            maxLength={200}
            className="h-8 flex-1 rounded-[8px] border border-[var(--color-border-input)] px-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
          />
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-2 text-sm text-[var(--color-muted)] transition hover:text-[var(--color-accent)]"
        >
          + Добавить подзадачу
        </button>
      )}
    </div>
  );
}
