"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BOARD_TINT_KEYS, tint } from "@/lib/tints";
import { createBoard } from "../board/actions";

export type RegionChoice = { id: string; name: string };

export function NewBoardDialog({
  onClose,
  regions,
}: {
  onClose: () => void;
  regions: RegionChoice[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(BOARD_TINT_KEYS[0]);
  const [regionId, setRegionId] = useState<string>(regions[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Введите название");
      return;
    }
    if (regions.length > 0 && !regionId) {
      setError("Выберите регион");
      return;
    }
    startTransition(async () => {
      const res = await createBoard({ name: trimmed, color, regionId: regionId || null });
      if (res.ok) {
        onClose();
        router.push(`/board/${res.id}`);
        router.refresh();
      } else {
        setError(res.error ?? "Ошибка");
      }
    });
  }

  const c = tint(color);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-[16px] border border-[var(--color-border-card)] bg-[var(--color-surface)] p-5 shadow-[0_10px_30px_rgba(20,20,20,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-3">
          <span
            className="grid h-10 w-10 place-items-center rounded-[11px] text-base font-bold"
            style={{ background: c.bg, color: c.text }}
          >
            {(name.trim().charAt(0) || "Д").toUpperCase()}
          </span>
          <h2 className="text-[17px] font-bold tracking-[-0.02em]">Новая доска</h2>
        </div>

        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-faint)]">
          Название
        </label>
        <input
          autoFocus
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") onClose();
          }}
          placeholder="Например, Маркетинг Q3"
          className="h-[42px] w-full rounded-[10px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-3 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-[3px] focus:ring-[var(--color-accent)]/10"
        />

        <label className="mb-2 mt-4 block text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-faint)]">
          Цвет
        </label>
        <div className="flex gap-2">
          {BOARD_TINT_KEYS.map((k) => {
            const t = tint(k);
            return (
              <button
                key={k}
                onClick={() => setColor(k)}
                className={`h-8 w-8 rounded-full transition ${color === k ? "ring-2 ring-offset-2 ring-[var(--color-ink)]" : ""}`}
                style={{ background: t.bg }}
                title={k}
              >
                <span className="block h-3 w-3 rounded-full" style={{ margin: "auto", background: t.text }} />
              </button>
            );
          })}
        </div>

        {regions.length > 0 ? (
          <>
            <label className="mb-1.5 mt-4 block text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-faint)]">
              Регион
            </label>
            <select
              value={regionId}
              onChange={(e) => setRegionId(e.target.value)}
              className="h-[42px] w-full rounded-[10px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-3 text-sm outline-none focus:border-[var(--color-accent)]"
            >
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </>
        ) : (
          <p className="mt-4 rounded-[10px] border border-[var(--color-border-card)] bg-[var(--color-surface-warm)] px-3 py-2 text-[13px] text-[var(--color-muted)]">
            Нет доступных регионов. Создайте регион в «Управление доступом → Регионы».
          </p>
        )}

        {error && <p className="mt-3 text-sm text-[var(--color-urgent)]">{error}</p>}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-[10px] px-3.5 py-2 text-sm font-medium text-[var(--color-muted)] transition hover:bg-[var(--color-surface-warm)]"
          >
            Отмена
          </button>
          <button
            onClick={submit}
            disabled={pending}
            className="rounded-[10px] bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
          >
            {pending ? "Создаём…" : "Создать"}
          </button>
        </div>
      </div>
    </div>
  );
}
