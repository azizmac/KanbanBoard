import { type Actor, visibleRestaurantWhere } from "./access";
import {
  iikoConfigured,
  orderTypeToChannel,
  revenueTrend,
  salesByDepartment,
  writeoffs,
} from "./iiko/reports";
import { prisma } from "./prisma";

export type Period = "day" | "week" | "month";
export type Channels = { hall: number; delivery: number; pickup: number };

export type PointStat = {
  id: string;
  name: string;
  regionId: string;
  regionName: string;
  revenue: number;
  prevRevenue: number;
  checks: number;
  prevChecks: number;
  guests: number;
  prevGuests: number;
  foodcostPct: number;
  prevFoodcostPct: number;
  laborPct: number;
  prevLaborPct: number;
  writeoffs: number;
  prevWriteoffs: number;
  channels: Channels;
  trend: number[];
  prevTrend: number[];
};

export type StatsData = {
  period: Period;
  generatedAt: string;
  iikoOk: boolean; // false → iiko not configured or unreachable (numbers are zeroed)
  points: PointStat[];
  regions: { id: string; name: string }[];
};

function ranges(period: Period) {
  const to = new Date();
  const from = new Date(to);
  if (period === "day") from.setDate(to.getDate() - 1);
  else if (period === "week") from.setDate(to.getDate() - 7);
  else from.setMonth(to.getMonth() - 1);
  const span = to.getTime() - from.getTime();
  return { from, to, prevFrom: new Date(from.getTime() - span), prevTo: new Date(from) };
}

type Resto = { id: string; name: string; iikoDepartmentId: string; region: { id: string; name: string } };

// Short result cache keyed by period + the exact set of points in scope. OLAP
// is heavy and the licence is session-limited, so we don't re-query iiko for
// every page load / period flip within the window.
const CACHE_TTL = 2 * 60_000;
const cache = new Map<string, { at: number; data: StatsData }>();

function zeroPoints(restaurants: Resto[]): PointStat[] {
  return restaurants.map((r) => ({
    id: r.id,
    name: r.name,
    regionId: r.region.id,
    regionName: r.region.name,
    revenue: 0,
    prevRevenue: 0,
    checks: 0,
    prevChecks: 0,
    guests: 0,
    prevGuests: 0,
    foodcostPct: 0,
    prevFoodcostPct: 0,
    laborPct: 0,
    prevLaborPct: 0,
    writeoffs: 0,
    prevWriteoffs: 0,
    channels: { hall: 0, delivery: 0, pickup: 0 },
    trend: [],
    prevTrend: [],
  }));
}

export async function getStats(user: Actor, period: Period): Promise<StatsData> {
  const restaurants = (await prisma.restaurant.findMany({
    where: visibleRestaurantWhere(user),
    orderBy: { name: "asc" },
    select: { id: true, name: true, iikoDepartmentId: true, region: { select: { id: true, name: true } } },
  })) as Resto[];

  const regions = [...new Map(restaurants.map((r) => [r.region.id, r.region])).values()];
  const base = (iikoOk: boolean, points: PointStat[]): StatsData => ({
    period,
    generatedAt: new Date().toISOString(),
    iikoOk,
    points,
    regions,
  });

  // No points in scope, or iiko not wired up yet → render the shell with zeros.
  if (restaurants.length === 0) return base(true, []);
  if (!iikoConfigured()) return base(false, zeroPoints(restaurants));

  const cacheKey = `${period}|${restaurants.map((r) => r.iikoDepartmentId).sort().join(",")}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.data;

  const byDept = new Map(restaurants.map((r) => [r.iikoDepartmentId, r]));
  const { from, to, prevFrom, prevTo } = ranges(period);

  try {
    const [salesCur, salesPrev, trendCur, trendPrev, woCur, woPrev] = await Promise.all([
      salesByDepartment(from, to),
      salesByDepartment(prevFrom, prevTo),
      revenueTrend(from, to, period === "day"),
      revenueTrend(prevFrom, prevTo, period === "day"),
      writeoffs(from, to),
      writeoffs(prevFrom, prevTo),
    ]);

    type Acc = { revenue: number; cost: number; checks: number; guests: number; channels: Channels };
    const blank = (): Acc => ({ revenue: 0, cost: 0, checks: 0, guests: 0, channels: { hall: 0, delivery: 0, pickup: 0 } });
    const fold = (rows: typeof salesCur) => {
      const m = new Map<string, Acc>();
      for (const row of rows) {
        const dept = String(row.Department);
        if (!byDept.has(dept)) continue;
        const a = m.get(dept) ?? blank();
        const rev = Number(row.DishDiscountSumInt ?? 0);
        a.revenue += rev;
        a.cost += Number(row["ProductCostBase.ProductCost"] ?? 0);
        a.checks += Number(row.UniqOrderId ?? 0);
        a.guests += Number(row.GuestNum ?? 0);
        a.channels[orderTypeToChannel(String(row.OrderType ?? ""))] += rev;
        m.set(dept, a);
      }
      return m;
    };
    const cur = fold(salesCur);
    const prev = fold(salesPrev);

    const sumWo = (rows: typeof woCur) => {
      const m = new Map<string, number>();
      for (const row of rows) {
        const dept = String(row.Department);
        if (byDept.has(dept)) m.set(dept, (m.get(dept) ?? 0) + Number(row.DishDiscountSumInt ?? 0));
      }
      return m;
    };
    const woC = sumWo(woCur);
    const woP = sumWo(woPrev);

    const trendByDept = (rows: typeof trendCur) => {
      const m = new Map<string, number[]>();
      for (const row of rows) {
        const dept = String(row.Department);
        if (!byDept.has(dept)) continue;
        const arr = m.get(dept) ?? [];
        arr.push(Number(row.DishDiscountSumInt ?? 0));
        m.set(dept, arr);
      }
      return m;
    };
    const trC = trendByDept(trendCur);
    const trP = trendByDept(trendPrev);

    const pct = (cost: number, rev: number) => (rev > 0 ? (cost / rev) * 100 : 0);
    const points: PointStat[] = restaurants.map((r) => {
      const c = cur.get(r.iikoDepartmentId) ?? blank();
      const p = prev.get(r.iikoDepartmentId) ?? blank();
      return {
        id: r.id,
        name: r.name,
        regionId: r.region.id,
        regionName: r.region.name,
        revenue: c.revenue,
        prevRevenue: p.revenue,
        checks: c.checks,
        prevChecks: p.checks,
        guests: c.guests,
        prevGuests: p.guests,
        foodcostPct: pct(c.cost, c.revenue),
        prevFoodcostPct: pct(p.cost, p.revenue),
        laborPct: 0, // ФОТ source not in SALES OLAP — wired up later (see iiko/client.ts)
        prevLaborPct: 0,
        writeoffs: woC.get(r.iikoDepartmentId) ?? 0,
        prevWriteoffs: woP.get(r.iikoDepartmentId) ?? 0,
        channels: c.channels,
        trend: trC.get(r.iikoDepartmentId) ?? [],
        prevTrend: trP.get(r.iikoDepartmentId) ?? [],
      };
    });

    const data = base(true, points);
    cache.set(cacheKey, { at: Date.now(), data });
    return data;
  } catch (err) {
    console.error("[stats] iiko fetch failed:", err);
    return base(false, zeroPoints(restaurants)); // degrade: show points, zeroed numbers
  }
}
