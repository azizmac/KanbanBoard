"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useState } from "react";
import type { ColumnData } from "@/lib/types";
import { TaskCardView } from "./TaskCardView";

function columnDot(name: string) {
  if (name.includes("Готово")) return "bg-[var(--color-success)]";
  if (name.includes("работе")) return "bg-[var(--color-accent)]";
  if (name.includes("проверке")) return "bg-[var(--color-high-dot)]";
  return "bg-[var(--color-faint)]";
}

export function ColumnView({
  column,
  onAddTask,
  adding,
  onAddingChange,
}: {
  column: ColumnData;
  onAddTask: (columnId: string, title: string) => void;
  adding: boolean;
  onAddingChange: (open: boolean) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [title, setTitle] = useState("");
  const done = column.done;
  const over = column.wipLimit != null && column.tasks.length > column.wipLimit;
  const setAdding = onAddingChange;

  function submit() {
    const t = title.trim();
    if (!t) {
      setAdding(false);
      return;
    }
    onAddTask(column.id, t);
    setTitle("");
  }

  return (
    <div className="flex w-full flex-col">
      <header className="flex items-center gap-2 px-1.5 py-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${columnDot(column.name)}`} />
        <h2 className="text-sm font-semibold text-[var(--color-ink)]">{column.name}</h2>
        <span
          className={`font-mono text-xs ${over ? "font-semibold text-[var(--color-urgent)]" : "text-[var(--color-faint)]"}`}
          title={column.wipLimit != null ? `Лимит WIP: ${column.wipLimit}` : undefined}
        >
          {column.tasks.length}
          {column.wipLimit != null && `/${column.wipLimit}`}
        </span>
        <button
          onClick={() => setAdding(!adding)}
          className="ml-auto grid h-6 w-6 place-items-center rounded-md text-[var(--color-faint)] transition hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"
          title="Добавить задачу"
        >
          +
        </button>
      </header>

      <div
        ref={setNodeRef}
        className={`scroll-thin flex max-h-[calc(100dvh-12rem)] flex-1 flex-col gap-2.5 overflow-y-auto rounded-xl px-0.5 pb-2 transition-[background-color,box-shadow] duration-200 ease-out ${
          isOver ? "bg-[var(--color-accent-tint)] shadow-[inset_0_0_0_2px_rgba(85,70,224,0.35)]" : ""
        }`}
      >
        <SortableContext items={column.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {column.tasks.map((task) => (
            <TaskCardView key={task.id} task={task} done={done} />
          ))}
        </SortableContext>

        {column.tasks.length === 0 && !adding && (
          <p className="px-2 py-6 text-center text-xs text-[var(--color-faint)]">Пусто</p>
        )}

        {adding && (
          <div className="rounded-[13px] border border-[var(--color-accent)]/40 bg-[var(--color-surface)] p-2.5">
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
              className="w-full resize-none text-sm outline-none placeholder:text-[var(--color-faint)]"
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
          className="mt-1 rounded-lg px-2 py-1.5 text-left text-sm text-[var(--color-faint)] transition hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"
        >
          + Добавить задачу
        </button>
      )}
    </div>
  );
}
