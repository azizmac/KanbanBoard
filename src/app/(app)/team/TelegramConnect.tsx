"use client";

import { useState, useTransition } from "react";
import { sendTestNotification, unlinkTelegram } from "./actions";

export function TelegramConnect({
  enabled,
  linked,
  deepLink,
  botUsername,
}: {
  enabled: boolean;
  linked: boolean;
  deepLink: string | null;
  botUsername: string;
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  if (!enabled) {
    return (
      <p className="text-sm text-[var(--color-muted)]">
        Telegram пока не настроен (нет токена бота).
      </p>
    );
  }

  if (!linked) {
    return (
      <div className="space-y-2">
        <a
          href={deepLink ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Подключить Telegram
        </a>
        <p className="text-xs text-[var(--color-muted)]">
          Откроется чат с @{botUsername}. Нажмите <b>Start</b> — и уведомления о задачах будут
          приходить вам в Telegram.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
        ✅ Telegram подключён
      </span>
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await sendTestNotification();
            setMsg(r.ok ? "Отправлено — проверьте Telegram" : (r.error ?? "Ошибка"));
          })
        }
        className="rounded-lg border border-[var(--color-line)] px-3 py-1.5 text-sm transition hover:bg-[var(--color-canvas)] disabled:opacity-50"
      >
        Отправить тест
      </button>
      <button
        disabled={pending}
        onClick={() => startTransition(() => void unlinkTelegram())}
        className="rounded-lg px-3 py-1.5 text-sm text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
      >
        Отключить
      </button>
      {msg && <span className="text-xs text-[var(--color-muted)]">{msg}</span>}
    </div>
  );
}
