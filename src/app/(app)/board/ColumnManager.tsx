"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addColumn, deleteColumn, moveColumn, renameColumn, setColumnWip } from "./column-actions";

type Col = { id: string; name: string; done: boolean; wipLimit: number | null; count: number };

export function ColumnManager({
  boardId,
  columns,
  onClose,
}: {
  boardId: string;
  columns: Col[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(p: Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await p;
      if (!res.ok) setError(res.error ?? "Ошибка");
      router.refresh();
    });
  }

  const lastNonDone = columns.reduce((idx, c, i) => (c.done ? idx : i), -1);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4 pt-[10vh]" onClick={onClose}>
      <div
        className="w-full max-w-[480px] rounded-[16px] border border-[var(--color-border-card)] bg-[var(--color-surface)] p-5 shadow-[0_20px_60px_rgba(20,20,20,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-[17px] font-bold tracking-[-0.02em]">Колонки доски</h2>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-md text-[var(--color-muted)] hover:bg-[var(--color-surface-warm)]">✕</button>
        </div>
        <p className="mb-4 text-[12.5px] text-[var(--color-muted)]">
          Название, порядок и лимит задач (WIP). Колонка «Готово» закреплена последней.
        </p>

        {error && (
          <div className="mb-3 rounded-[10px] border border-[#FECDCA] bg-[#FEF3F2] px-3 py-2 text-[13px] text-[var(--color-urgent)]">
            {error}
          </div>
        )}

        <div className="space-y-2">
          {columns.map((c, i) => (
            <div key={c.id} className="flex items-center gap-1.5 rounded-[11px] border border-[var(--color-border-card)] bg-[var(--color-surface-warm)] px-2.5 py-2">
              <input
                defaultValue={c.name}
                disabled={c.done || pending}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== c.name) run(renameColumn(c.id, v));
                }}
                className="min-w-0 flex-1 rounded-[8px] border border-transparent bg-transparent px-1.5 py-1 text-[14px] font-medium outline-none hover:border-[var(--color-border-input)] focus:border-[var(--color-accent)] disabled:opacity-60"
              />
              {c.done && <span className="shrink-0 rounded bg-[#DCF3E8] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-success)]">финал</span>}
              <input
                type="number"
                min={0}
                max={99}
                defaultValue={c.wipLimit ?? ""}
                disabled={pending}
                title="Лимит задач (WIP), пусто — без лимита"
                onBlur={(e) => {
                  const v = e.target.value ? Number(e.target.value) : null;
                  if (v !== c.wipLimit) run(setColumnWip(c.id, v));
                }}
                placeholder="WIP"
                className="h-8 w-[58px] shrink-0 rounded-[8px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-2 text-center text-[13px] outline-none focus:border-[var(--color-accent)]"
              />
              <div className="flex shrink-0 items-center">
                <button
                  disabled={pending || c.done || i === 0}
                  onClick={() => run(moveColumn(c.id, "left"))}
                  className="grid h-7 w-6 place-items-center rounded-md text-[var(--color-muted)] hover:bg-[var(--color-surface)] disabled:opacity-30"
                  title="Левее"
                >
                  ←
                </button>
                <button
                  disabled={pending || c.done || i >= lastNonDone}
                  onClick={() => run(moveColumn(c.id, "right"))}
                  className="grid h-7 w-6 place-items-center rounded-md text-[var(--color-muted)] hover:bg-[var(--color-surface)] disabled:opacity-30"
                  title="Правее"
                >
                  →
                </button>
              </div>
              <button
                disabled={pending || c.done || c.count > 0}
                onClick={() => {
                  if (confirm(`Удалить колонку «${c.name}»?`)) run(deleteColumn(c.id));
                }}
                title={c.done ? "Закреплена" : c.count > 0 ? "Сначала перенесите задачи" : "Удалить"}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[var(--color-urgent)] hover:bg-[#FEF3F2] disabled:opacity-30"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={() => run(addColumn(boardId))}
          disabled={pending}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[11px] border border-dashed border-[var(--color-border-input)] py-2.5 text-[13.5px] font-medium text-[var(--color-muted)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-50"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg>
          Добавить колонку
        </button>
      </div>
    </div>
  );
}
