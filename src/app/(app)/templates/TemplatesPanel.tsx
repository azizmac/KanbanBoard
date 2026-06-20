"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { priorityLabels } from "@/lib/constants";
import type { Priority } from "@/lib/types";
import { createTemplate, deleteTemplate, runTemplate, updateTemplate } from "./actions";

type Board = { id: string; name: string; columns: { id: string; name: string }[] };
type UserOpt = { id: string; name: string };
export type TemplateRow = {
  id: string;
  name: string;
  title: string;
  description: string | null;
  priority: Priority;
  boardId: string;
  columnId: string | null;
  assigneeId: string | null;
  checklist: string[];
  tags: string[];
  dueInDays: number | null;
  recurrence: string | null;
  weekday: number | null;
  monthday: number | null;
  hour: number;
  active: boolean;
  board: { name: string };
  assignee: { name: string } | null;
};

type Draft = {
  name: string;
  title: string;
  description: string;
  priority: Priority;
  boardId: string;
  columnId: string;
  assigneeId: string;
  checklist: string[];
  tags: string[];
  dueInDays: string;
  recurrence: "" | "daily" | "weekly" | "monthly";
  weekday: number;
  monthday: number;
  hour: number;
  active: boolean;
};

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]; // 1..7
const PRIORITIES: Priority[] = ["URGENT", "HIGH", "NORMAL", "LOW"];

const FIELD =
  "w-full rounded-[10px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-3 py-2 text-[14px] text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]";
const LABEL = "block text-[12px] font-medium text-[var(--color-muted)] mb-1";

function emptyDraft(boardId: string): Draft {
  return {
    name: "", title: "", description: "", priority: "NORMAL", boardId, columnId: "", assigneeId: "",
    checklist: [], tags: [], dueInDays: "", recurrence: "", weekday: 1, monthday: 1, hour: 9, active: true,
  };
}

function summary(t: TemplateRow): string {
  if (!t.recurrence) return "Без расписания";
  const at = `в ${String(t.hour).padStart(2, "0")}:00`;
  if (t.recurrence === "daily") return `Ежедневно ${at}`;
  if (t.recurrence === "weekly") return `Еженедельно (${WEEKDAYS[(t.weekday ?? 1) - 1]}) ${at}`;
  return `Ежемесячно, ${t.monthday}-го ${at}`;
}

export function TemplatesPanel({ templates, options }: { templates: TemplateRow[]; options: { boards: Board[]; users: UserOpt[] } }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));
  const board = options.boards.find((b) => b.id === draft?.boardId);

  function startNew() {
    if (options.boards.length === 0) return;
    setError(null);
    setEditId(null);
    setDraft(emptyDraft(options.boards[0].id));
  }
  function startEdit(t: TemplateRow) {
    setError(null);
    setEditId(t.id);
    setDraft({
      name: t.name, title: t.title, description: t.description ?? "", priority: t.priority,
      boardId: t.boardId, columnId: t.columnId ?? "", assigneeId: t.assigneeId ?? "",
      checklist: t.checklist, tags: t.tags, dueInDays: t.dueInDays?.toString() ?? "",
      recurrence: (t.recurrence as Draft["recurrence"]) ?? "", weekday: t.weekday ?? 1,
      monthday: t.monthday ?? 1, hour: t.hour, active: t.active,
    });
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    const input = {
      name: draft.name, title: draft.title, description: draft.description || null, priority: draft.priority,
      boardId: draft.boardId, columnId: draft.columnId || null, assigneeId: draft.assigneeId || null,
      checklist: draft.checklist, tags: draft.tags,
      dueInDays: draft.dueInDays.trim() ? Number(draft.dueInDays) : null,
      recurrence: draft.recurrence || null, weekday: draft.weekday, monthday: draft.monthday,
      hour: draft.hour, active: draft.active,
    };
    const res = editId ? await updateTemplate(editId, input) : await createTemplate(input);
    setBusy(false);
    if (!res.ok) { setError(res.error ?? "Ошибка"); return; }
    setDraft(null);
    setEditId(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Удалить шаблон?")) return;
    await deleteTemplate(id);
    router.refresh();
  }
  async function runNow(id: string) {
    setBusy(true);
    const res = await runTemplate(id);
    setBusy(false);
    if (res.ok) router.refresh();
    else setError(res.error ?? "Ошибка");
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[13.5px] text-[var(--color-muted)]">
          Шаблоны для быстрого создания задач. С расписанием — бот создаёт задачу сам.
        </p>
        {!draft && options.boards.length > 0 && (
          <button onClick={startNew} className="h-9 shrink-0 rounded-[10px] bg-[var(--color-accent)] px-3.5 text-[13.5px] font-semibold text-white transition hover:opacity-90">
            + Новый шаблон
          </button>
        )}
      </div>

      {error && <div className="mb-3 rounded-[10px] border border-[#FECDCA] bg-[#FEF3F2] px-3 py-2 text-sm text-[var(--color-urgent)]">{error}</div>}

      {/* Form */}
      {draft && (
        <div className="mb-5 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Название шаблона</label>
              <input className={FIELD} value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Еженедельный отчёт" />
            </div>
            <div>
              <label className={LABEL}>Доска</label>
              <select className={FIELD} value={draft.boardId} onChange={(e) => { set("boardId", e.target.value); set("columnId", ""); }}>
                {options.boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}>Заголовок задачи</label>
              <input className={FIELD} value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="Подготовить отчёт по продажам" />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}>Описание</label>
              <textarea className={`${FIELD} min-h-[70px]`} value={draft.description} onChange={(e) => set("description", e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Колонка</label>
              <select className={FIELD} value={draft.columnId} onChange={(e) => set("columnId", e.target.value)}>
                <option value="">Первая колонка</option>
                {board?.columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Исполнитель</label>
              <select className={FIELD} value={draft.assigneeId} onChange={(e) => set("assigneeId", e.target.value)}>
                <option value="">— не назначен —</option>
                {options.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Приоритет</label>
              <select className={FIELD} value={draft.priority} onChange={(e) => set("priority", e.target.value as Priority)}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{priorityLabels[p]}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Срок (дней от создания)</label>
              <input className={FIELD} type="number" min={0} value={draft.dueInDays} onChange={(e) => set("dueInDays", e.target.value)} placeholder="напр. 3" />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}>Чек-лист (по пункту в строке)</label>
              <textarea className={`${FIELD} min-h-[70px]`} value={draft.checklist.join("\n")} onChange={(e) => set("checklist", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))} />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}>Теги (через запятую)</label>
              <input className={FIELD} value={draft.tags.join(", ")} onChange={(e) => set("tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} placeholder="отчёт, продажи" />
            </div>

            {/* Recurrence */}
            <div>
              <label className={LABEL}>Повтор</label>
              <select className={FIELD} value={draft.recurrence} onChange={(e) => set("recurrence", e.target.value as Draft["recurrence"])}>
                <option value="">Без расписания</option>
                <option value="daily">Ежедневно</option>
                <option value="weekly">Еженедельно</option>
                <option value="monthly">Ежемесячно</option>
              </select>
            </div>
            {draft.recurrence === "weekly" && (
              <div>
                <label className={LABEL}>День недели</label>
                <select className={FIELD} value={draft.weekday} onChange={(e) => set("weekday", Number(e.target.value))}>
                  {WEEKDAYS.map((w, i) => <option key={w} value={i + 1}>{w}</option>)}
                </select>
              </div>
            )}
            {draft.recurrence === "monthly" && (
              <div>
                <label className={LABEL}>Число месяца</label>
                <input className={FIELD} type="number" min={1} max={31} value={draft.monthday} onChange={(e) => set("monthday", Number(e.target.value))} />
              </div>
            )}
            {draft.recurrence && (
              <div>
                <label className={LABEL}>Час (0–23)</label>
                <input className={FIELD} type="number" min={0} max={23} value={draft.hour} onChange={(e) => set("hour", Number(e.target.value))} />
              </div>
            )}
            {draft.recurrence && (
              <label className="flex items-center gap-2 self-end text-[13.5px] text-[var(--color-ink)]">
                <input type="checkbox" checked={draft.active} onChange={(e) => set("active", e.target.checked)} />
                Активно
              </label>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={save} disabled={busy} className="h-9 rounded-[10px] bg-[var(--color-accent)] px-4 text-[13.5px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
              {busy ? "Сохраняем…" : "Сохранить"}
            </button>
            <button onClick={() => { setDraft(null); setEditId(null); setError(null); }} className="h-9 rounded-[10px] border border-[var(--color-line)] px-4 text-[13.5px] font-medium text-[var(--color-muted)] hover:text-[var(--color-ink)]">
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {templates.length === 0 && !draft ? (
        <div className="rounded-xl border border-dashed border-[var(--color-line)] py-12 text-center text-[13.5px] text-[var(--color-muted)]">
          Шаблонов пока нет.
        </div>
      ) : (
        <div className="space-y-2.5">
          {templates.map((t) => (
            <div key={t.id} className={`rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 ${t.active ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-semibold text-[var(--color-ink)]">{t.name}</span>
                    {t.recurrence && (
                      <span className="rounded-full bg-[var(--color-accent-soft)] px-2 py-0.5 text-[11.5px] font-medium text-[var(--color-accent)]">🔁 {summary(t)}</span>
                    )}
                  </div>
                  <div className="mt-1 text-[13px] text-[var(--color-muted)]">
                    «{t.title}» · {t.board.name}
                    {t.assignee && ` · ${t.assignee.name}`}
                    {t.checklist.length > 0 && ` · чек-лист ${t.checklist.length}`}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => runNow(t.id)} disabled={busy} className="h-8 rounded-[9px] bg-[var(--color-accent)] px-3 text-[12.5px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
                  Создать сейчас
                </button>
                <button onClick={() => startEdit(t)} className="h-8 rounded-[9px] border border-[var(--color-line)] px-3 text-[12.5px] font-medium text-[var(--color-ink)] hover:border-[var(--color-accent)]">
                  Изменить
                </button>
                <button onClick={() => remove(t.id)} className="h-8 rounded-[9px] px-3 text-[12.5px] font-medium text-[var(--color-urgent)] hover:underline">
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
