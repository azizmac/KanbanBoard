import { redirect } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { isDirector, isRegional } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { getDashboard } from "@/lib/dashboard-data";
import { listManageableRegions } from "@/lib/org-data";
import { getStats } from "@/lib/stats-data";
import { DashboardTabs } from "./DashboardTabs";

export const dynamic = "force-dynamic";

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: "danger" }) {
  const danger = tone === "danger" && typeof value === "number" && value > 0;
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <div className={`text-[28px] font-bold leading-none ${danger ? "text-[var(--color-urgent)]" : "text-[var(--color-ink)]"}`}>
        {value}
      </div>
      <div className="mt-1.5 text-[12.5px] text-[var(--color-muted)]">{label}</div>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  if (!isDirector(user) && !isRegional(user)) redirect("/boards");

  const { tab: raw } = await searchParams;
  const tab = raw === "sales" ? "sales" : "tasks";

  const [d, stats, regionOpts] = await Promise.all([
    getDashboard(user),
    tab === "sales" ? getStats(user, "month") : Promise.resolve(null),
    isRegional(user) ? listManageableRegions(user) : Promise.resolve([]),
  ]);
  const peakDay = Math.max(1, ...d.throughput.map((x) => x.count));
  const peakBoard = Math.max(1, ...d.perBoard.map((b) => b.open));

  const tasks = (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Открытых задач" value={d.totals.open} />
        <Stat label="Просрочено" value={d.totals.overdue} tone="danger" />
        <Stat label="Закрыто за 7 дней" value={d.totals.completed7d} />
        <Stat label="Ср. время до «Готово»" value={d.cycleTimeDays != null ? `${d.cycleTimeDays} дн.` : "—"} />
        <Stat label="Досок" value={d.totals.boards} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
          <h2 className="text-[14px] font-semibold text-[var(--color-ink)]">Закрыто за неделю</h2>
          <div className="mt-4 flex h-28 items-end gap-2">
            {d.throughput.map((day, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="text-[11px] font-medium text-[var(--color-muted)]">{day.count || ""}</div>
                <div
                  className="w-full rounded-t-[5px] bg-[var(--color-accent)] transition-all"
                  style={{ height: `${Math.max(4, (day.count / peakDay) * 80)}px`, opacity: day.count ? 1 : 0.25 }}
                />
                <div className="text-[11px] text-[var(--color-faint)]">{day.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
          <h2 className="text-[14px] font-semibold text-[var(--color-ink)]">Нагрузка по доскам</h2>
          {d.perBoard.length === 0 ? (
            <p className="mt-3 text-[13px] text-[var(--color-muted)]">Нет открытых задач.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {d.perBoard.slice(0, 8).map((b) => (
                <li key={b.id}>
                  <Link href={`/board/${b.id}`} className="group block">
                    <div className="flex items-baseline justify-between text-[13px]">
                      <span className="truncate text-[var(--color-ink)] group-hover:text-[var(--color-accent)]">{b.name}</span>
                      <span className="ml-2 shrink-0 tabular-nums text-[var(--color-muted)]">
                        {b.open}
                        {b.overdue > 0 && <span className="text-[var(--color-urgent)]"> · {b.overdue} просроч.</span>}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--color-line)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-accent)]"
                        style={{ width: `${(b.open / peakBoard) * 100}%` }}
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
        <h2 className="text-[14px] font-semibold text-[var(--color-ink)]">Нагрузка по людям</h2>
        {d.perPerson.length === 0 ? (
          <p className="mt-3 text-[13px] text-[var(--color-muted)]">Нет назначенных открытых задач.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--color-line)]">
            {d.perPerson.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/u/${p.id}`}
                  className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition hover:bg-[var(--color-surface-warm)]"
                >
                  <Avatar name={p.name} size={30} />
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-[var(--color-ink)]">{p.name}</span>
                  {p.overdue > 0 && (
                    <span className="rounded-full bg-[var(--color-urgent-bg)] px-2 py-0.5 text-[11.5px] font-medium text-[var(--color-urgent)]">
                      {p.overdue} просроч.
                    </span>
                  )}
                  <span className="w-16 text-right text-[13px] tabular-nums text-[var(--color-muted)]">
                    {p.open} задач
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[22px] font-bold text-[var(--color-ink)]">Сводка</h1>
        <div className="flex shrink-0 items-center gap-3.5">
          {isDirector(user) && (
            <a href="/api/export/tasks" className="text-[13px] font-medium text-[var(--color-accent)] hover:underline">
              Выгрузить CSV
            </a>
          )}
          <Link href="/templates" className="text-[13px] font-medium text-[var(--color-accent)] hover:underline">
            Шаблоны →
          </Link>
        </div>
      </div>
      <p className="mt-1 text-[13.5px] text-[var(--color-muted)]">
        {isDirector(user) ? "По всем доскам и точкам" : "По вашим регионам"}
      </p>
      <DashboardTabs
        initialTab={tab}
        tasks={tasks}
        role={isDirector(user) ? "director" : "regional"}
        regionLabel={regionOpts.map((r) => r.name).join(", ") || undefined}
        initialStats={stats}
      />
    </div>
  );
}
