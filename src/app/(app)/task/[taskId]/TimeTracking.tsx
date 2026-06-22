"use client";

import { useState, useTransition } from "react";
import type { TimeLogData } from "@/lib/types";
import { deleteTimeLog, logTime, setEstimate } from "./actions";

const sectionLabel =
  "mb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-faint)]";

export function fmtMinutes(m: number) {
  if (m <= 0) return "0м";
  const h = Math.floor(m / 60);
  const min = m % 60;
  return [h ? `${h}ч` : "", min ? `${min}м` : ""].filter(Boolean).join(" ") || "0м";
}

const hoursToMin = (s: string) => Math.round(parseFloat(s.replace(",", ".")) * 60);

export function TimeTracking({
  taskId,
  estimateMinutes,
  spentMinutes,
  logs: initialLogs,
  currentUserId,
  canManage,
}: {
  taskId: string;
  estimateMinutes: number | null;
  spentMinutes: number;
  logs: TimeLogData[];
  currentUserId: string;
  canManage: boolean;
}) {
  const [logs, setLogs] = useState<TimeLogData[]>(initialLogs);
  const [estimate, setEst] = useState<number | null>(estimateMinutes);
  const [estInput, setEstInput] = useState(estimateMinutes != null ? String(estimateMinutes / 60) : "");
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");
  const [, startTransition] = useTransition();

  const spent = logs.reduce((s, l) => s + l.minutes, 0) || spentMinutes;
  const overEstimate = estimate != null && spent > estimate;

  function saveEstimate() {
    const min = estInput.trim() ? hoursToMin(estInput) : null;
    const val = min && min > 0 ? min : null;
    setEst(val);
    startTransition(() => void setEstimate(taskId, val));
  }

  function add() {
    const min = hoursToMin(hours);
    if (!Number.isFinite(min) || min <= 0) return;
    setHours("");
    const n = note.trim() || null;
    setNote("");
    startTransition(async () => {
      const res = await logTime(taskId, min, n);
      if (res.ok && res.log) setLogs((prev) => [res.log!, ...prev]);
    });
  }

  function remove(id: string) {
    setLogs((prev) => prev.filter((l) => l.id !== id));
    startTransition(() => void deleteTimeLog(id));
  }

  return (
    <div>
      <h3 className={sectionLabel}>Учёт времени</h3>

      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <label className="flex items-center gap-1.5">
          <span className="text-[var(--color-muted)]">Оценка</span>
          <input
            value={estInput}
            onChange={(e) => setEstInput(e.target.value)}
            onBlur={saveEstimate}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            inputMode="decimal"
            placeholder="—"
            className="h-8 w-[64px] rounded-[8px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-2 text-right text-sm outline-none focus:border-[var(--color-accent)]"
          />
          <span className="text-[var(--color-muted)]">ч</span>
        </label>
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--color-muted)]">Затрачено</span>
          <span className={`font-semibold ${overEstimate ? "text-[var(--color-urgent)]" : "text-[var(--color-ink)]"}`}>
            {fmtMinutes(spent)}
          </span>
          {estimate != null && <span className="text-[var(--color-faint)]">из {fmtMinutes(estimate)}</span>}
        </div>
      </div>

      {estimate != null && estimate > 0 && (
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[#F2F1ED]">
          <div
            className={`h-full transition-all ${overEstimate ? "bg-[var(--color-urgent)]" : "bg-[var(--color-accent)]"}`}
            style={{ width: `${Math.min(100, (spent / estimate) * 100)}%` }}
          />
        </div>
      )}

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          inputMode="decimal"
          placeholder="часы"
          className="h-8 w-[72px] rounded-[8px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-2 text-sm outline-none focus:border-[var(--color-accent)]"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="заметка (необязательно)"
          maxLength={200}
          className="h-8 min-w-[120px] flex-1 rounded-[8px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
        />
        <button
          onClick={add}
          className="h-8 rounded-[8px] bg-[var(--color-accent)] px-3 text-[13px] font-semibold text-white transition hover:opacity-90"
        >
          Записать
        </button>
      </div>

      {logs.length > 0 && (
        <div className="space-y-1">
          {logs.map((l) => (
            <div key={l.id} className="group flex items-center gap-2 text-[13px]">
              <span className="font-semibold text-[var(--color-ink)]">{fmtMinutes(l.minutes)}</span>
              <span className="text-[var(--color-muted)]">· {l.user.name}</span>
              {l.note && <span className="min-w-0 flex-1 truncate text-[var(--color-muted)]">— {l.note}</span>}
              <span className="ml-auto whitespace-nowrap font-mono text-[11px] text-[var(--color-faint)]">
                {new Date(l.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
              </span>
              {(l.user.id === currentUserId || canManage) && (
                <button
                  onClick={() => remove(l.id)}
                  className="text-[var(--color-faint)] opacity-0 transition hover:text-[var(--color-urgent)] group-hover:opacity-100"
                  title="Удалить запись"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
