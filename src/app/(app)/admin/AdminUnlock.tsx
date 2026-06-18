"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { unlockAdmin } from "./actions";

export function AdminUnlock() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await unlockAdmin(secret);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Ошибка");
    });
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6 text-center">
        <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-canvas)] text-lg">
          🔒
        </div>
        <h1 className="text-base font-semibold">Админка</h1>
        <p className="mt-1 mb-4 text-sm text-[var(--color-muted)]">
          Введите секрет, чтобы получить права администратора.
        </p>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Секрет"
          className="w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
        />
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        <button
          onClick={submit}
          disabled={pending || !secret}
          className="mt-3 w-full rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Проверка…" : "Войти"}
        </button>
      </div>
    </div>
  );
}
