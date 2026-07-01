"use client";

import { useMemo, useState } from "react";
import type { Channels, Period, PointStat, StatsData } from "@/lib/stats-data";

/* ---------- formatting ---------- */
const rub = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;
const rubShort = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} млн` : n >= 1000 ? `${Math.round(n / 1000)} тыс` : `${Math.round(n)}`;
const num = (n: number) => Math.round(n).toLocaleString("ru-RU");
const pct = (n: number) => `${n.toFixed(1).replace(".", ",")}%`;
const dPct = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? 100 : 0);

const PERIODS: { key: Period; label: string }[] = [
  { key: "day", label: "День" },
  { key: "week", label: "Неделя" },
  { key: "month", label: "Месяц" },
];
const periodSub: Record<Period, string> = {
  day: "vs вчера",
  week: "vs прошлая неделя",
  month: "vs прошлый мес.",
  custom: "vs пред. период",
};
const periodWords: Record<Period, string> = { day: "день", week: "неделю", month: "месяц", custom: "период" };
const FOODCOST_TARGET = 32;
const LABOR_TARGET = 24;

/** Human label for the reporting range, e.g. "26 мая – 25 июня 2026". */
function formatRange(fromISO?: string, toISO?: string) {
  if (!fromISO || !toISO) return "";
  const f = new Date(fromISO);
  const t = new Date(toISO);
  const full: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
  if (f.toDateString() === t.toDateString()) return t.toLocaleDateString("ru-RU", full);
  const short: Intl.DateTimeFormatOptions =
    f.getFullYear() === t.getFullYear() ? { day: "numeric", month: "short" } : full;
  return `${f.toLocaleDateString("ru-RU", short)} – ${t.toLocaleDateString("ru-RU", full)}`;
}
/** YYYY-MM-DD in local time (for prefilling the date inputs). */
function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ---------- detail-table sorting ---------- */
type SortKey = "name" | "regionName" | "revenue" | "delta" | "avgCheck" | "checks" | "foodcostPct" | "laborPct";
function sortValue(p: PointStat, key: SortKey): number | string {
  switch (key) {
    case "name":
      return p.name;
    case "regionName":
      return p.regionName;
    case "revenue":
      return p.revenue;
    case "delta":
      return dPct(p.revenue, p.prevRevenue);
    case "avgCheck":
      return p.checks > 0 ? p.revenue / p.checks : 0;
    case "checks":
      return p.checks;
    case "foodcostPct":
      return p.foodcostPct;
    case "laborPct":
      return p.laborPct;
  }
}

/* ---------- small bits ---------- */
function DeltaChip({ delta, good, unit }: { delta: number; good: boolean; unit: "%" | "пп" }) {
  const flat = Math.abs(delta) < (unit === "%" ? 0.1 : 0.05);
  const cls = flat
    ? "text-[var(--color-muted)] bg-[var(--color-line)]"
    : good
      ? "text-[var(--color-success)] bg-[var(--color-success-bg)]"
      : "text-[var(--color-urgent)] bg-[var(--color-urgent-bg)]";
  const val = unit === "%" ? `${Math.abs(delta).toFixed(1).replace(".", ",")}%` : `${Math.abs(delta).toFixed(1).replace(".", ",")} п.п.`;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${cls}`}>
      {!flat && <span>{delta >= 0 ? "▲" : "▼"}</span>}
      {val}
    </span>
  );
}

function Section({
  title,
  sub,
  open,
  onToggle,
  children,
}: {
  title: string;
  sub?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[14px] border border-[var(--color-border-card)] bg-[var(--color-surface)]">
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-[22px] py-[17px] text-left">
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
          className={`shrink-0 text-[var(--color-faint)] transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
        <span className="flex-1">
          <span className="block text-[15px] font-semibold tracking-[-0.01em] text-[var(--color-ink)]">{title}</span>
          {sub && <span className="block text-[12.5px] text-[var(--color-muted)]">{sub}</span>}
        </span>
      </button>
      {open && <div className="border-t border-[var(--color-line)] px-[22px] py-5">{children}</div>}
    </section>
  );
}

/* ---------- charts ---------- */
function AreaChart({ cur, prev }: { cur: number[]; prev: number[] }) {
  if (cur.length < 2) {
    return <div className="grid h-[200px] place-items-center text-[13px] text-[var(--color-faint)]">Недостаточно данных за период</div>;
  }
  const W = 900;
  const H = 250;
  const pad = { l: 8, r: 8, t: 14, b: 22 };
  const max = Math.max(1, ...cur, ...prev);
  const x = (i: number, n: number) => pad.l + (i / (n - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const line = (a: number[]) => a.map((v, i) => `${i ? "L" : "M"}${x(i, a.length).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line(cur)} L${x(cur.length - 1, cur.length).toFixed(1)},${H - pad.b} L${pad.l},${H - pad.b} Z`;
  const grid = [0, 0.25, 0.5, 0.75, 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[230px] w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="statArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {grid.map((g) => (
        <g key={g}>
          <line x1={pad.l} x2={W - pad.r} y1={pad.t + g * (H - pad.t - pad.b)} y2={pad.t + g * (H - pad.t - pad.b)} stroke="var(--color-grid)" strokeWidth="1" />
          <text x={pad.l} y={pad.t + g * (H - pad.t - pad.b) - 4} fontSize="11" fill="var(--color-faint)">{rubShort(max * (1 - g))}</text>
        </g>
      ))}
      {prev.length >= 2 && <path d={line(prev)} fill="none" stroke="var(--color-faint)" strokeWidth="2" strokeDasharray="5 5" />}
      <path d={area} fill="url(#statArea)" />
      <path d={line(cur)} fill="none" stroke="var(--color-accent)" strokeWidth="2.5" />
    </svg>
  );
}

function Donut({ channels, size = 132 }: { channels: Channels; size?: number }) {
  const total = channels.hall + channels.delivery + channels.pickup;
  const segs = [
    { key: "hall", label: "Зал", value: channels.hall, color: "var(--chart-hall)" },
    { key: "delivery", label: "Доставка", value: channels.delivery, color: "var(--chart-del)" },
    { key: "pickup", label: "Самовывоз", value: channels.pickup, color: "var(--chart-pickup)" },
  ];
  const r = size / 2 - 11;
  const C = 2 * Math.PI * r;
  let off = 0;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth="14" />
        {total > 0 &&
          segs.map((s) => {
            const len = (s.value / total) * C;
            const el = (
              <circle key={s.key} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth="14"
                strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} />
            );
            off += len;
            return el;
          })}
      </svg>
      <div className="min-w-[180px] flex-1 space-y-2">
        {segs.map((s) => {
          const p = total > 0 ? (s.value / total) * 100 : 0;
          return (
            <div key={s.key}>
              <div className="flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-2 text-[var(--color-body)]">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="tabular-nums text-[var(--color-muted)]">{p.toFixed(0)}% · {rub(s.value)}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--color-line)]">
                <div className="h-full rounded-full" style={{ width: `${p}%`, background: s.color }} />
              </div>
            </div>
          );
        })}
        {total === 0 && <p className="text-[13px] text-[var(--color-faint)]">Нет продаж за период</p>}
      </div>
    </div>
  );
}

function CostBar({ value, target }: { value: number; target: number }) {
  const scaleMax = Math.max(target * 1.6, value * 1.1, 1);
  const w = Math.min(100, (value / scaleMax) * 100);
  const tx = (target / scaleMax) * 100;
  const over = value > target;
  const near = !over && value > target * 0.92;
  const color = value <= 0 ? "var(--color-line)" : over ? "var(--color-urgent)" : near ? "var(--color-high)" : "var(--color-accent)";
  return (
    <div className="relative h-2.5 overflow-visible rounded-full bg-[var(--color-line)]">
      <div className="h-full rounded-full" style={{ width: `${w}%`, background: color }} />
      <div className="absolute top-[-3px] bottom-[-3px] w-px bg-[var(--color-ink)]" style={{ left: `${tx}%` }} title={`цель ${target}%`} />
    </div>
  );
}

/* ---------- KPI computation over a point set ---------- */
function aggregate(points: PointStat[]) {
  const sum = (f: (p: PointStat) => number) => points.reduce((s, p) => s + f(p), 0);
  const revenue = sum((p) => p.revenue);
  const prevRevenue = sum((p) => p.prevRevenue);
  const checks = sum((p) => p.checks);
  const prevChecks = sum((p) => p.prevChecks);
  const guests = sum((p) => p.guests);
  const prevGuests = sum((p) => p.prevGuests);
  const wAvg = (f: (p: PointStat) => number, rev: (p: PointStat) => number) => {
    const r = sum(rev);
    return r > 0 ? points.reduce((s, p) => s + f(p) * rev(p), 0) / r : 0;
  };
  const channels: Channels = {
    hall: sum((p) => p.channels.hall),
    delivery: sum((p) => p.channels.delivery),
    pickup: sum((p) => p.channels.pickup),
  };
  const tLen = Math.max(0, ...points.map((p) => p.trend.length));
  const ptLen = Math.max(0, ...points.map((p) => p.prevTrend.length));
  return {
    revenue,
    prevRevenue,
    checks,
    prevChecks,
    guests,
    prevGuests,
    avgCheck: checks > 0 ? revenue / checks : 0,
    prevAvgCheck: prevChecks > 0 ? prevRevenue / prevChecks : 0,
    foodcost: wAvg((p) => p.foodcostPct, (p) => p.revenue),
    prevFoodcost: wAvg((p) => p.prevFoodcostPct, (p) => p.prevRevenue),
    labor: wAvg((p) => p.laborPct, (p) => p.revenue),
    prevLabor: wAvg((p) => p.prevLaborPct, (p) => p.prevRevenue),
    writeoffs: sum((p) => p.writeoffs),
    prevWriteoffs: sum((p) => p.prevWriteoffs),
    channels,
    trend: Array.from({ length: tLen }, (_, i) => sum((p) => p.trend[i] ?? 0)),
    prevTrend: Array.from({ length: ptLen }, (_, i) => sum((p) => p.prevTrend[i] ?? 0)),
  };
}

/* ---------- main ---------- */
export function StatsClient({
  initial,
  role,
  regionLabel,
}: {
  initial: StatsData;
  role: "director" | "regional";
  regionLabel?: string;
}) {
  const [data, setData] = useState(initial);
  const [period, setPeriod] = useState<Period>(initial.period);
  const [region, setRegion] = useState("all");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState({ trend: true, ranking: true, channels: true, cost: true, table: false });
  const [selected, setSelected] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(initial.period === "custom");
  const [customFrom, setCustomFrom] = useState(() => ymd(new Date(initial.from)));
  const [customTo, setCustomTo] = useState(() => ymd(new Date(initial.to)));
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "revenue", dir: "desc" });

  async function load(url: string, p: Period) {
    setLoading(true);
    try {
      const res = await fetch(url);
      if (res.ok) {
        setData(await res.json());
        setPeriod(p);
        setSelected(null);
      }
    } finally {
      setLoading(false);
    }
  }
  function changePeriod(p: Period) {
    if (p === period) return;
    setShowCustom(false);
    load(`/api/stats?period=${p}`, p);
  }
  function applyCustom() {
    if (!customFrom || !customTo) return;
    load(`/api/stats?period=custom&from=${customFrom}&to=${customTo}`, "custom");
  }
  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "desc" ? "asc" : "desc" }
        : { key, dir: key === "name" || key === "regionName" ? "asc" : "desc" },
    );
  }

  const points = useMemo(
    () => (role === "director" && region !== "all" ? data.points.filter((p) => p.regionId === region) : data.points),
    [data, role, region],
  );
  const agg = useMemo(() => aggregate(points), [points]);
  const laborAvailable = points.some((p) => p.laborPct > 0);
  const minsAgo = Math.max(0, Math.round((Date.now() - new Date(data.generatedAt).getTime()) / 60000));

  const ranked = useMemo(() => [...points].sort((a, b) => b.revenue - a.revenue), [points]);
  const maxRev = Math.max(1, ...points.map((p) => p.revenue));
  const selectedPoint = points.find((p) => p.id === selected) ?? null;
  const rangeLabel = useMemo(() => formatRange(data.from, data.to), [data.from, data.to]);
  const sortedRows = useMemo(() => {
    const arr = [...points];
    arr.sort((a, b) => {
      const va = sortValue(a, sort.key);
      const vb = sortValue(b, sort.key);
      const c =
        typeof va === "string" ? va.localeCompare(String(vb), "ru") : (va as number) - (vb as number);
      return sort.dir === "asc" ? c : -c;
    });
    return arr;
  }, [points, sort]);

  const kpis = [
    { label: "Выручка", value: rub(agg.revenue), delta: dPct(agg.revenue, agg.prevRevenue), good: true, unit: "%" as const },
    { label: "Средний чек", value: rub(agg.avgCheck), delta: dPct(agg.avgCheck, agg.prevAvgCheck), good: true, unit: "%" as const },
    { label: "Чеки", value: num(agg.checks), delta: dPct(agg.checks, agg.prevChecks), good: true, unit: "%" as const },
    { label: "Гости", value: num(agg.guests), delta: dPct(agg.guests, agg.prevGuests), good: true, unit: "%" as const },
    { label: "Foodcost (цель ≤32%)", value: pct(agg.foodcost), delta: agg.foodcost - agg.prevFoodcost, good: false, unit: "пп" as const },
    {
      label: "ФОТ к выручке (≤24%)",
      value: laborAvailable ? pct(agg.labor) : "—",
      delta: agg.labor - agg.prevLabor,
      good: false,
      unit: "пп" as const,
      muted: !laborAvailable,
    },
    { label: "Списания", value: rub(agg.writeoffs), delta: dPct(agg.writeoffs, agg.prevWriteoffs), good: false, unit: "%" as const },
  ];

  const sortTh = (label: string, key: SortKey, align: "left" | "right" = "right") => {
    const active = sort.key === key;
    return (
      <th
        onClick={() => toggleSort(key)}
        className={`cursor-pointer select-none py-2 pr-3 ${align === "right" ? "text-right" : "text-left"} ${active ? "text-[var(--color-accent)]" : "transition-colors hover:text-[var(--color-muted)]"}`}
        title="Сортировать"
      >
        {label}
        <span className="ml-0.5 inline-block w-2">{active ? (sort.dir === "desc" ? "↓" : "↑") : ""}</span>
      </th>
    );
  };

  return (
    <div className="pb-12">
      {/* sticky header */}
      <div className="sticky top-safe z-10 border-b border-[var(--color-line)] bg-[var(--color-canvas)] px-5 pt-6 sm:px-9">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[26px] font-bold tracking-[-0.03em] text-[var(--color-ink)]">Статистика</h1>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${
                  data.iikoOk ? "bg-[var(--color-success-bg)] text-[var(--color-success)]" : "bg-[var(--color-urgent-bg)] text-[var(--color-urgent)]"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "currentColor" }} />
                {data.iikoOk ? `iiko · обновлено ${minsAgo} мин назад` : "iiko не настроена"}
              </span>
            </div>
            <p className="mt-1 text-[14px] text-[var(--color-muted)]">
              {role === "director" ? "Вся сеть" : `Региональный управляющий — регион «${regionLabel ?? "—"}»`}
              {rangeLabel && (
                <>
                  {" · "}
                  <span className="font-medium text-[var(--color-body)]">{rangeLabel}</span>
                </>
              )}
            </p>
          </div>
          <div className="flex rounded-[11px] bg-[var(--color-line)] p-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => changePeriod(p.key)}
                className={`rounded-[8px] px-3 py-1.5 text-[13px] font-semibold transition-colors duration-150 ease-out ${
                  period === p.key && !showCustom ? "bg-[var(--color-surface)] text-[var(--color-ink)] shadow-[0_1px_2px_rgba(20,20,20,0.06)]" : "text-[var(--color-muted)]"
                }`}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => setShowCustom((s) => !s)}
              className={`rounded-[8px] px-3 py-1.5 text-[13px] font-semibold transition-colors duration-150 ease-out ${
                period === "custom" || showCustom ? "bg-[var(--color-surface)] text-[var(--color-ink)] shadow-[0_1px_2px_rgba(20,20,20,0.06)]" : "text-[var(--color-muted)]"
              }`}
            >
              Период
            </button>
          </div>
        </div>

        {showCustom && (
          <div className="mt-3 flex flex-wrap items-end gap-2.5 pb-1">
            <label className="flex flex-col gap-1 text-[11px] font-medium text-[var(--color-muted)]">
              с
              <input
                type="date"
                value={customFrom}
                max={customTo || undefined}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-9 rounded-[9px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-2.5 text-[13px] text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-medium text-[var(--color-muted)]">
              по
              <input
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-9 rounded-[9px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-2.5 text-[13px] text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
              />
            </label>
            <button
              onClick={applyCustom}
              disabled={!customFrom || !customTo || loading}
              className="h-9 rounded-[9px] bg-[var(--color-accent)] px-4 text-[13px] font-semibold text-white transition disabled:opacity-50"
            >
              Применить
            </button>
          </div>
        )}
        {role === "director" && data.regions.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-1.5 pb-3">
            {[{ id: "all", name: "Все" }, ...data.regions].map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setRegion(r.id);
                  setSelected(null);
                }}
                className={`rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors duration-150 ease-out ${
                  region === r.id ? "bg-[var(--color-sidebar)] text-white" : "bg-[var(--color-surface-warm)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>
        )}
        {role !== "director" && <div className="pb-3" />}
      </div>

      <div className={`mx-auto max-w-[1180px] px-5 py-6 sm:px-9 ${loading ? "opacity-60" : ""}`}>
        {points.length === 0 ? (
          <p className="rounded-[14px] border border-dashed border-[var(--color-line)] py-16 text-center text-sm text-[var(--color-muted)]">
            {role === "regional"
              ? "К вашим регионам ещё не привязаны точки iiko. Их настраивает директор в «Регионы и группы»."
              : "Точки iiko не настроены. Добавьте их в «Регионы и группы» (раздел «Точки iiko»)."}
          </p>
        ) : (
          <>
            {/* KPI bar */}
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(196px,1fr))" }}>
              {kpis.map((k) => (
                <div key={k.label} className="rounded-[13px] border border-[var(--color-border-card)] bg-[var(--color-surface)] px-[17px] py-[15px]">
                  <div className="text-[12.5px] font-semibold text-[var(--color-muted)]">{k.label}</div>
                  <div className={`mt-1.5 text-[25px] font-bold tracking-[-0.025em] tabular-nums ${k.muted ? "text-[var(--color-faint)]" : "text-[var(--color-ink)]"}`}>
                    {k.value}
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    {k.muted ? (
                      <span className="text-[11px] text-[var(--color-faint)]">источник не подключён</span>
                    ) : (
                      <>
                        <DeltaChip delta={k.delta} good={k.good} unit={k.unit} />
                        <span className="text-[11px] text-[var(--color-faint)]">{periodSub[period]}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {/* 1. trend */}
              <Section title="Динамика выручки" open={open.trend} onToggle={() => setOpen((o) => ({ ...o, trend: !o.trend }))}>
                <AreaChart cur={agg.trend} prev={agg.prevTrend} />
                <div className="mt-2 flex gap-5 text-[12px] text-[var(--color-muted)]">
                  <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-[var(--color-accent)]" /> текущий</span>
                  <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 border-t-2 border-dashed border-[var(--color-faint)]" /> прошлый</span>
                </div>
              </Section>

              {/* 2. ranking */}
              <Section title="Рейтинг точек по выручке" sub="нажмите для детального отчёта" open={open.ranking} onToggle={() => setOpen((o) => ({ ...o, ranking: !o.ranking }))}>
                <div className="space-y-1">
                  {ranked.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => setSelected(p.id)}
                      className="flex w-full items-center gap-3 rounded-[9px] px-2 py-2 text-left transition hover:bg-[var(--color-surface-warm)]"
                    >
                      <span className="w-5 shrink-0 text-center text-[13px] font-semibold tabular-nums text-[var(--color-faint)]">{i + 1}</span>
                      <span className="w-[150px] shrink-0 truncate text-[13.5px] font-medium text-[var(--color-ink)]">
                        {p.name}
                        <span className="ml-1.5 text-[11.5px] font-normal text-[var(--color-faint)]">{p.regionName}</span>
                      </span>
                      <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-line)]">
                        <span className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-accent)]" style={{ width: `${(p.revenue / maxRev) * 100}%` }} />
                      </span>
                      <span className="w-[110px] shrink-0 text-right text-[13.5px] font-semibold tabular-nums text-[var(--color-ink)]">{rub(p.revenue)}</span>
                      <span className="w-[64px] shrink-0 text-right"><DeltaChip delta={dPct(p.revenue, p.prevRevenue)} good unit="%" /></span>
                    </button>
                  ))}
                </div>
              </Section>

              {/* 3. channels */}
              <Section title="Структура продаж по каналам" open={open.channels} onToggle={() => setOpen((o) => ({ ...o, channels: !o.channels }))}>
                <Donut channels={agg.channels} />
              </Section>

              {/* 4. cost / labor / writeoffs */}
              <Section title="Себестоимость, ФОТ и списания" open={open.cost} onToggle={() => setOpen((o) => ({ ...o, cost: !o.cost }))}>
                <div className="space-y-3">
                  {ranked.map((p) => (
                    <button key={p.id} onClick={() => setSelected(p.id)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-[9px] px-2 py-2 text-left transition hover:bg-[var(--color-surface-warm)]">
                      <span className="w-[150px] shrink-0 truncate text-[13.5px] font-medium text-[var(--color-ink)]">{p.name}</span>
                      <span className="min-w-[150px] flex-1">
                        <span className="mb-1 flex justify-between text-[11.5px] text-[var(--color-muted)]"><span>Foodcost</span><span className="tabular-nums">{pct(p.foodcostPct)}</span></span>
                        <CostBar value={p.foodcostPct} target={FOODCOST_TARGET} />
                      </span>
                      <span className="min-w-[150px] flex-1">
                        <span className="mb-1 flex justify-between text-[11.5px] text-[var(--color-muted)]"><span>ФОТ</span><span className="tabular-nums">{laborAvailable ? pct(p.laborPct) : "н/д"}</span></span>
                        <CostBar value={p.laborPct} target={LABOR_TARGET} />
                      </span>
                      <span className="w-[150px] shrink-0 text-right">
                        <span className="block text-[11.5px] text-[var(--color-muted)]">Списания</span>
                        <span className="flex items-center justify-end gap-1.5">
                          <span className="text-[13.5px] font-semibold tabular-nums text-[var(--color-ink)]">{rub(p.writeoffs)}</span>
                          <DeltaChip delta={dPct(p.writeoffs, p.prevWriteoffs)} good={false} unit="%" />
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </Section>

              {/* 5. detail table */}
              <Section title="Детализация по точкам" open={open.table} onToggle={() => setOpen((o) => ({ ...o, table: !o.table }))}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-[13px]">
                    <thead>
                      <tr className="border-b border-[var(--color-line)] text-left text-[11.5px] font-semibold uppercase tracking-[0.03em] text-[var(--color-faint)]">
                        {sortTh("Точка", "name", "left")}
                        {sortTh("Регион", "regionName", "left")}
                        {sortTh("Выручка", "revenue")}
                        {sortTh("Δ", "delta")}
                        {sortTh("Ср. чек", "avgCheck")}
                        {sortTh("Чеки", "checks")}
                        {sortTh("Foodcost", "foodcostPct")}
                        {sortTh("ФОТ", "laborPct")}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRows.map((p) => (
                        <tr key={p.id} onClick={() => setSelected(p.id)} className="cursor-pointer border-b border-[var(--color-line)] transition hover:bg-[var(--color-surface-warm)]">
                          <td className="py-2.5 pr-3 font-medium text-[var(--color-ink)]">{p.name}</td>
                          <td className="py-2.5 pr-3 text-[var(--color-muted)]">{p.regionName}</td>
                          <td className="py-2.5 pr-3 text-right font-semibold tabular-nums text-[var(--color-ink)]">{rub(p.revenue)}</td>
                          <td className="py-2.5 pr-3 text-right"><DeltaChip delta={dPct(p.revenue, p.prevRevenue)} good unit="%" /></td>
                          <td className="py-2.5 pr-3 text-right tabular-nums">{rub(p.checks > 0 ? p.revenue / p.checks : 0)}</td>
                          <td className="py-2.5 pr-3 text-right tabular-nums">{num(p.checks)}</td>
                          <td className="py-2.5 pr-3 text-right tabular-nums">{pct(p.foodcostPct)}</td>
                          <td className="py-2.5 text-right tabular-nums">{laborAvailable ? pct(p.laborPct) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            </div>
          </>
        )}
      </div>

      {selectedPoint && (
        <PointDrawer
          point={selectedPoint}
          rank={ranked.findIndex((p) => p.id === selectedPoint.id) + 1}
          total={ranked.length}
          networkRevenue={agg.revenue}
          network={agg}
          period={period}
          laborAvailable={laborAvailable}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

/* ---------- drawer ---------- */
function PointDrawer({
  point,
  rank,
  total,
  networkRevenue,
  network,
  period,
  laborAvailable,
  onClose,
}: {
  point: PointStat;
  rank: number;
  total: number;
  networkRevenue: number;
  network: ReturnType<typeof aggregate>;
  period: Period;
  laborAvailable: boolean;
  onClose: () => void;
}) {
  const avg = point.checks > 0 ? point.revenue / point.checks : 0;
  const sharePct = networkRevenue > 0 ? (point.revenue / networkRevenue) * 100 : 0;
  const netAvg = network.checks > 0 ? network.revenue / network.checks : 0;
  const periodWord = periodWords[period];

  const mini = [
    { label: "Выручка", value: rub(point.revenue), delta: dPct(point.revenue, point.prevRevenue), good: true, unit: "%" as const },
    { label: "Средний чек", value: rub(avg), delta: dPct(avg, point.prevChecks > 0 ? point.prevRevenue / point.prevChecks : 0), good: true, unit: "%" as const },
    { label: "Чеки", value: num(point.checks), delta: dPct(point.checks, point.prevChecks), good: true, unit: "%" as const },
    { label: "Гости", value: num(point.guests), delta: dPct(point.guests, point.prevGuests), good: true, unit: "%" as const },
    { label: "Foodcost", value: pct(point.foodcostPct), delta: point.foodcostPct - point.prevFoodcostPct, good: false, unit: "пп" as const },
    { label: "ФОТ", value: laborAvailable ? pct(point.laborPct) : "—", delta: point.laborPct - point.prevLaborPct, good: false, unit: "пп" as const, muted: !laborAvailable },
    { label: "Списания", value: rub(point.writeoffs), delta: dPct(point.writeoffs, point.prevWriteoffs), good: false, unit: "%" as const },
  ];
  const cmp = [
    { label: "Средний чек", pt: rub(avg), net: rub(netAvg), good: avg >= netAvg },
    { label: "Foodcost", pt: pct(point.foodcostPct), net: pct(network.foodcost), good: point.foodcostPct <= network.foodcost },
    { label: "ФОТ к выручке", pt: laborAvailable ? pct(point.laborPct) : "—", net: laborAvailable ? pct(network.labor) : "—", good: point.laborPct <= network.labor },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div
        className="fixed right-0 top-0 h-screen w-[min(720px,94vw)] overflow-y-auto border-l border-[var(--color-border-card)] bg-[var(--color-canvas)] shadow-[-20px_0_60px_rgba(0,0,0,0.28)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-[var(--color-line)] bg-[var(--color-canvas)] px-6 pt-5 pb-4">
          <button onClick={onClose} className="mb-2 flex items-center gap-1 text-[13px] font-medium text-[var(--color-accent)]">‹ К дашборду</button>
          <h2 className="text-[26px] font-bold tracking-[-0.03em] text-[var(--color-ink)]">{point.name}</h2>
          <p className="mt-0.5 text-[13.5px] text-[var(--color-muted)]">Регион «{point.regionName}» · отчёт за {periodWord}</p>
          <div className="mt-2.5 flex flex-wrap gap-2 text-[12px] font-semibold">
            <span className="rounded-full bg-[var(--color-line)] px-2.5 py-1 text-[var(--color-body)]">{rank} место из {total}</span>
            <span className="rounded-full bg-[var(--color-accent-soft)] px-2.5 py-1 text-[var(--color-accent)]">{sharePct.toFixed(1)}% выручки сети</span>
          </div>
        </div>

        <div className="space-y-6 px-6 py-5">
          <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
            {mini.map((m) => (
              <div key={m.label} className="rounded-[12px] border border-[var(--color-border-card)] bg-[var(--color-surface)] px-3 py-2.5">
                <div className="text-[11.5px] font-semibold text-[var(--color-muted)]">{m.label}</div>
                <div className={`mt-1 text-[20px] font-bold tabular-nums ${m.muted ? "text-[var(--color-faint)]" : "text-[var(--color-ink)]"}`}>{m.value}</div>
                {!m.muted && <div className="mt-1"><DeltaChip delta={m.delta} good={m.good} unit={m.unit} /></div>}
              </div>
            ))}
          </div>

          <div className="rounded-[14px] border border-[var(--color-border-card)] bg-[var(--color-surface)] p-5">
            <h3 className="mb-3 text-[14px] font-semibold text-[var(--color-ink)]">Динамика выручки</h3>
            <AreaChart cur={point.trend} prev={point.prevTrend} />
          </div>

          <div className="rounded-[14px] border border-[var(--color-border-card)] bg-[var(--color-surface)] p-5">
            <h3 className="mb-3 text-[14px] font-semibold text-[var(--color-ink)]">Каналы продаж</h3>
            <Donut channels={point.channels} />
          </div>

          <div className="rounded-[14px] border border-[var(--color-border-card)] bg-[var(--color-surface)] p-5">
            <h3 className="mb-3 text-[14px] font-semibold text-[var(--color-ink)]">Эффективность · сравнение с сетью</h3>
            <div className="mb-4 space-y-3">
              <div>
                <div className="mb-1 flex justify-between text-[12px] text-[var(--color-muted)]"><span>Foodcost (цель ≤{FOODCOST_TARGET}%)</span><span className="tabular-nums">{pct(point.foodcostPct)}</span></div>
                <CostBar value={point.foodcostPct} target={FOODCOST_TARGET} />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-[12px] text-[var(--color-muted)]"><span>ФОТ (цель ≤{LABOR_TARGET}%)</span><span className="tabular-nums">{laborAvailable ? pct(point.laborPct) : "н/д"}</span></div>
                <CostBar value={point.laborPct} target={LABOR_TARGET} />
              </div>
            </div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--color-line)] text-left text-[11.5px] font-semibold uppercase tracking-[0.03em] text-[var(--color-faint)]">
                  <th className="py-2">Метрика</th><th className="py-2 text-right">Точка</th><th className="py-2 text-right">Сеть</th><th className="py-2 text-right">Δ</th>
                </tr>
              </thead>
              <tbody>
                {cmp.map((c) => (
                  <tr key={c.label} className="border-b border-[var(--color-line)]">
                    <td className="py-2.5 text-[var(--color-body)]">{c.label}</td>
                    <td className="py-2.5 text-right font-semibold tabular-nums text-[var(--color-ink)]">{c.pt}</td>
                    <td className="py-2.5 text-right tabular-nums text-[var(--color-muted)]">{c.net}</td>
                    <td className={`py-2.5 text-right font-semibold ${c.good ? "text-[var(--color-success)]" : "text-[var(--color-urgent)]"}`}>{c.good ? "лучше" : "хуже"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
