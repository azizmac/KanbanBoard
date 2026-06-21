"use client";

import { useCallback, useRef, useState } from "react";

// RU-friendly Telegram sign-in: opens the bot via a t.me deep-link (works without
// VPN, unlike the telegram.org login widget) and polls until the bot confirms.

type Phase = "idle" | "waiting";

function TelegramIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff">
      <path d="M21.94 4.58a1.4 1.4 0 0 0-1.45-.2L3.4 11.1c-1.06.43-1.04 1.95.03 2.35l4.13 1.54 1.6 5.02a1 1 0 0 0 1.62.45l2.42-2.18 4.43 3.26a1.4 1.4 0 0 0 2.2-.86l3.07-14.6a1.4 1.4 0 0 0-.49-1.5zM9.4 14.3l-.6 3.78-.9-2.96 8.9-7.42L9.4 14.3z" />
    </svg>
  );
}

export default function TelegramLogin() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const begin = useCallback(async () => {
    setError(null);
    setManualUrl(null);
    // Open the window synchronously inside the click so the browser keeps the
    // user gesture (popup blockers fire otherwise); redirect it once we have the
    // link. If it was blocked, we fall back to a visible manual link.
    const popup = window.open("about:blank", "_blank");
    setPhase("waiting");

    let nonce: string;
    let url: string;
    try {
      const res = await fetch("/api/auth/tg-login/start", { method: "POST" });
      if (!res.ok) throw new Error();
      ({ nonce, url } = await res.json());
    } catch {
      popup?.close();
      setPhase("idle");
      setError("Не удалось начать вход. Попробуйте ещё раз.");
      return;
    }

    if (popup) popup.location.href = url;
    else setManualUrl(url);

    const startedAt = Date.now();
    const poll = async () => {
      let data: { status?: string; message?: string } = {};
      try {
        const r = await fetch("/api/auth/tg-login/status", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ nonce }),
        });
        data = await r.json();
      } catch {
        // transient network blip — keep polling
      }
      if (data.status === "ok") {
        window.location.href = "/home";
        return;
      }
      if (data.status === "denied") {
        setPhase("idle");
        setError(data.message ?? "Вход отклонён.");
        return;
      }
      if (data.status === "expired" || Date.now() - startedAt > 4 * 60_000) {
        setPhase("idle");
        setError("Время ожидания истекло. Нажмите «Войти через Telegram» ещё раз.");
        return;
      }
      timer.current = window.setTimeout(poll, 2000);
    };
    timer.current = window.setTimeout(poll, 1500);
  }, []);

  if (phase === "waiting") {
    return (
      <div className="rounded-[14px] border border-[var(--color-border-card)] bg-[var(--color-surface-warm)] px-4 py-5 text-center">
        <div className="mx-auto mb-2.5 h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-line)] border-t-[var(--color-accent)]" />
        <p className="text-[13.5px] font-medium">Откройте Telegram и нажмите «Старт»</p>
        <p className="mt-1 text-[12.5px] text-[var(--color-muted)]">Ждём подтверждения…</p>
        {manualUrl && (
          <a
            href={manualUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2.5 inline-block text-[12.5px] font-medium text-[var(--color-accent)] underline"
          >
            Telegram не открылся? Открыть вручную
          </a>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={begin}
        className="flex h-[54px] w-full items-center justify-center gap-2.5 rounded-[14px] bg-[#229ED9] text-base font-semibold text-white transition hover:brightness-105 active:brightness-95"
      >
        <TelegramIcon />
        Войти через Telegram
      </button>
      {error && <p className="mt-2 text-center text-[12.5px] text-[var(--color-urgent)]">{error}</p>}
      <p className="mt-2 text-center text-[12px] text-[var(--color-faint)]">
        Откроется чат с ботом — нажмите «Старт», и вход подтвердится автоматически.
      </p>
    </div>
  );
}
