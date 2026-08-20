"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { StatsClient } from "@/app/(app)/stats/StatsClient";
import type { StatsData } from "@/lib/stats-data";

export function DashboardTabs({
  initialTab,
  tasks,
  role,
  regionLabel,
  initialStats,
}: {
  initialTab: "tasks" | "sales";
  tasks: ReactNode;
  role: "director" | "regional";
  regionLabel?: string;
  initialStats: StatsData | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"tasks" | "sales">(initialTab);
  const [stats, setStats] = useState<StatsData | null>(initialStats);
  const [pending, start] = useTransition();

  function go(next: "tasks" | "sales") {
    setTab(next);
    router.replace(next === "sales" ? "/dashboard?tab=sales" : "/dashboard");
    if (next === "sales" && !stats) {
      start(async () => {
        const res = await fetch("/api/stats?period=month");
        if (res.ok) setStats(await res.json());
      });
    }
  }

  return (
    <div>
      <div className="mt-4 flex gap-1 rounded-[12px] border border-[var(--color-border-card)] bg-[var(--color-surface-warm)] p-1">
        <button
          onClick={() => go("tasks")}
          className={`flex-1 rounded-[9px] py-2 text-[13px] font-medium ${
            tab === "tasks" ? "bg-[var(--color-surface)] text-[var(--color-ink)] shadow-sm" : "text-[var(--color-muted)]"
          }`}
        >
          Задачи
        </button>
        <button
          onClick={() => go("sales")}
          className={`flex-1 rounded-[9px] py-2 text-[13px] font-medium ${
            tab === "sales" ? "bg-[var(--color-surface)] text-[var(--color-ink)] shadow-sm" : "text-[var(--color-muted)]"
          }`}
        >
          Продажи iiko
        </button>
      </div>
      {tab === "tasks" && <div className="mt-5">{tasks}</div>}
      {tab === "sales" && (
        <div className="mt-4">
          {stats ? (
            <StatsClient initial={stats} role={role} regionLabel={regionLabel} embedded />
          ) : (
            <p className="py-10 text-center text-sm text-[var(--color-muted)]">
              {pending ? "Загружаю продажи…" : "Нет данных iiko."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
