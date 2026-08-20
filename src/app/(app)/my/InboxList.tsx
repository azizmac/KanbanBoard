"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { notificationLabels } from "@/lib/constants";
import type { InboxItem } from "@/lib/notify-data";
import { markAllNotificationsRead, markNotificationRead } from "./actions";

export function InboxList({ items }: { items: InboxItem[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const unread = items.filter((i) => !i.read).length;

  function markOne(id: string) {
    start(async () => {
      await markNotificationRead(id);
      router.refresh();
    });
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-[var(--color-muted)]">
          {unread > 0 ? `${unread} непрочитанных` : "Все прочитаны"}
        </p>
        {unread > 0 && (
          <button
            onClick={() =>
              start(async () => {
                await markAllNotificationsRead();
                router.refresh();
              })
            }
            className="text-[13px] font-medium text-[var(--color-accent)] hover:underline"
          >
            Прочитать все
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">Уведомлений пока нет — назначения и упоминания появятся здесь.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((n) => {
            const inner = (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-faint)]">
                    {notificationLabels[n.type]}
                  </span>
                  {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />}
                </div>
                <div className={`mt-0.5 text-[13.5px] ${n.read ? "text-[var(--color-muted)]" : "font-medium text-[var(--color-ink)]"}`}>
                  {n.message}
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-[var(--color-faint)]">
                  {new Date(n.createdAt).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
              </>
            );
            return (
              <li key={n.id}>
                {n.taskId ? (
                  <Link
                    href={`/task/${n.taskId}`}
                    onClick={() => !n.read && markOne(n.id)}
                    className={`block rounded-[12px] border px-3.5 py-2.5 transition hover:border-[var(--color-accent)]/40 ${
                      n.read
                        ? "border-[var(--color-border-card)] bg-[var(--color-surface)]"
                        : "border-[var(--color-accent)]/25 bg-[var(--color-accent-soft)]"
                    }`}
                  >
                    {inner}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => !n.read && markOne(n.id)}
                    className={`block w-full rounded-[12px] border px-3.5 py-2.5 text-left ${
                      n.read
                        ? "border-[var(--color-border-card)] bg-[var(--color-surface)]"
                        : "border-[var(--color-accent)]/25 bg-[var(--color-accent-soft)]"
                    }`}
                  >
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
