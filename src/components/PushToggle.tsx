"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const arr = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type State = "loading" | "unsupported" | "off" | "on" | "denied";

export function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("off"));
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const { key } = await fetch("/api/push/key").then((r) => r.json());
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      setState("on");
      fetch("/api/push/test", { method: "POST" }).catch(() => {}); // confirmation push
    } catch {
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return null;

  return (
    <div className="rounded-[13px] border border-[var(--color-border-card)] bg-[var(--color-surface)] p-4">
      <div className="text-sm font-medium text-[var(--color-ink)]">Push-уведомления</div>
      {state === "unsupported" && (
        <p className="mt-1 text-xs text-[var(--color-muted)]">Браузер не поддерживает push-уведомления.</p>
      )}
      {state === "denied" && (
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Уведомления заблокированы. Разрешите их для сайта в настройках браузера.
        </p>
      )}
      {state === "off" && (
        <>
          <p className="mt-1 text-xs text-[var(--color-muted)]">Получайте уведомления о задачах прямо на устройство, без Telegram.</p>
          <button
            onClick={enable}
            disabled={busy}
            className="mt-3 w-full rounded-[10px] bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Подключаем…" : "Включить"}
          </button>
        </>
      )}
      {state === "on" && (
        <>
          <p className="mt-1 text-xs text-[var(--color-muted)]">Включены на этом устройстве ✅</p>
          <button
            onClick={disable}
            disabled={busy}
            className="mt-3 w-full rounded-[10px] border border-[var(--color-line)] px-3 py-2 text-sm font-medium text-[var(--color-muted)] transition hover:text-[var(--color-ink)] disabled:opacity-60"
          >
            {busy ? "…" : "Отключить"}
          </button>
        </>
      )}
    </div>
  );
}
