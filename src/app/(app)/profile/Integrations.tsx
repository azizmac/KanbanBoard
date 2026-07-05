"use client";

import { useState, useTransition } from "react";
import { createWebhookToken, revokeWebhookToken } from "./integration-actions";

export type TokenRow = {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
};

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" }) : "—";

export function Integrations({ tokens, endpoint }: { tokens: TokenRow[]; endpoint: string }) {
  const [, start] = useTransition();
  const [label, setLabel] = useState("Genspark");
  const [fresh, setFresh] = useState<string | null>(null); // plaintext shown once
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  function create() {
    if (!label.trim()) return;
    setBusy(true);
    setError(null);
    start(async () => {
      const res = await createWebhookToken(label.trim());
      setBusy(false);
      if (!res.ok || !res.token) {
        setError(res.error ?? "Ошибка");
        return;
      }
      setFresh(res.token);
      setCopied(false);
    });
  }

  function revoke(id: string) {
    if (!confirm("Отозвать токен? Интеграция с ним перестанет работать.")) return;
    start(async () => {
      await revokeWebhookToken(id);
    });
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <section className="mt-8">
      <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-faint)]">
        Интеграции · Genspark
      </h2>
      <p className="mb-3 text-[13px] text-[var(--color-muted)]">
        Персональный токен позволяет Genspark ставить задачи от вашего имени — только на{" "}
        <b>доступные вам доски</b> и <b>ваших участников</b>. Показывается один раз.
      </p>

      <div className="rounded-[13px] border border-[var(--color-border-card)] bg-[var(--color-surface)] p-4">
        {/* endpoint */}
        <div className="mb-3 flex items-center gap-2 rounded-[9px] bg-[var(--color-surface-warm)] px-3 py-2">
          <span className="shrink-0 text-[11px] font-semibold uppercase text-[var(--color-faint)]">POST</span>
          <code className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-[var(--color-body)]">{endpoint}</code>
          <button onClick={() => copy(endpoint)} className="shrink-0 text-[12px] font-medium text-[var(--color-accent)]">
            копировать
          </button>
        </div>

        {/* freshly created token (shown once) */}
        {fresh && (
          <div className="mb-3 rounded-[10px] border border-[var(--color-accent)]/40 bg-[var(--color-accent-tint)] p-3">
            <div className="mb-1.5 text-[12px] font-semibold text-[var(--color-accent)]">
              Токен создан — скопируйте сейчас, позже он не покажется:
            </div>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-[7px] bg-[var(--color-surface)] px-2.5 py-1.5 font-mono text-[12.5px] text-[var(--color-ink)]">
                {fresh}
              </code>
              <button
                onClick={() => copy(fresh)}
                className="shrink-0 rounded-[8px] bg-[var(--color-accent)] px-3 py-1.5 text-[12.5px] font-semibold text-white"
              >
                {copied ? "✓ скопировано" : "Копировать"}
              </button>
            </div>
            <p className="mt-2 font-mono text-[11.5px] leading-relaxed text-[var(--color-muted)]">
              Header: <span className="text-[var(--color-body)]">X-Genspark-Secret: {fresh.slice(0, 10)}…</span>
            </p>
          </div>
        )}

        {/* create */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Название (напр. Genspark)"
            maxLength={40}
            className="h-9 min-w-[160px] flex-1 rounded-[9px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-3 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          <button
            onClick={create}
            disabled={busy}
            className="h-9 rounded-[9px] bg-[var(--color-accent)] px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "…" : "Создать токен"}
          </button>
        </div>
        {error && <p className="mt-2 text-[12.5px] text-[var(--color-urgent)]">{error}</p>}

        {/* list */}
        {tokens.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {tokens.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-[9px] border border-[var(--color-line)] px-3 py-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[var(--color-accent-soft)] text-[11px] font-bold text-[var(--color-accent)]">
                  gsk
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium text-[var(--color-ink)]">{t.label}</div>
                  <div className="text-[11.5px] text-[var(--color-faint)]">
                    создан {fmt(t.createdAt)} · использован {fmt(t.lastUsedAt)}
                  </div>
                </div>
                <button onClick={() => revoke(t.id)} className="shrink-0 text-[12.5px] font-medium text-[var(--color-urgent)]">
                  отозвать
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
