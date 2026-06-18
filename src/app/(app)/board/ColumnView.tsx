"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useState } from "react";
import type { ColumnData } from "@/lib/types";
import { TaskCardView } from "./TaskCardView";

export function ColumnView({
  column,
  onAddTask,
}: {
  column: ColumnData;
  onAddTask: (columnId: string, title: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");

  function submit() {
    const t = title.trim();
    if (!t) {
      setAdding(false);
      return;
    }
    onAddTask(column.id, t);
    setTitle("");
    // keep the composer open for quick multi-add
  }

  return (
    <div className="flex w-[80vw] shrink-0 flex-col rounded-2xl bg-[color-mix(in_srgb,var(--color-line)_22%,transparent)] sm:w-72">
      <header className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">{column.name}</h2>
          <span className="rounded-full bg-[var(--color-surface)] px-1.5 text-xs text-[var(--color-muted)]">
            {column.tasks.length}
          </span>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="grid h-6 w-6 place-items-center rounded-md text-[var(--color-muted)] transition hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"
          title="Добавить задачу"
        >
          +
        </button>
      </header>

      <div
        ref={setNodeRef}
        className={`scroll-thin flex max-h-[calc(100dvh-12rem)] flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2 transition ${
          isOver ? "bg-[var(--color-accent-soft)]/50" : ""
        }`}
      >
        <SortableContext items={column.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {column.tasks.map((task) => (
            <TaskCardView key={task.id} task={task} />
          ))}
        </SortableContext>

        {column.tasks.length === 0 && !adding && (
          <p className="px-2 py-6 text-center text-xs text-[var(--color-muted)]">Пусто</p>
        )}

        {adding && (
          <div className="rounded-xl border border-[var(--color-accent)]/40 bg-[var(--color-surface)] p-2">
            <textarea
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
                if (e.key === "Escape") {
                  setAdding(false);
                  setTitle("");
                }
              }}
              placeholder="Название задачи…"
              rows={2}
              className="w-full resize-none text-sm outline-none placeholder:text-[var(--color-muted)]"
            />
            <div className="mt-1 flex items-center gap-2">
              <button
                onClick={submit}
                className="rounded-lg bg-[var(--color-accent)] px-2.5 py-1 text-xs font-medium text-white transition hover:opacity-90"
              >
                Добавить
              </button>
              <button
                onClick={() => {
                  setAdding(false);
                  setTitle("");
                }}
                className="text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>

      {!adding && (
        <button
          onClick={() => setAdding(true)}
          className="mx-2 mb-2 rounded-lg px-2 py-1.5 text-left text-sm text-[var(--color-muted)] transition hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"
        >
          + Добавить задачу
        </button>
      )}
    </div>
  );
}
