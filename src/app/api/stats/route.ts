import { NextResponse } from "next/server";
import { canViewStats } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { getStats, type Period } from "@/lib/stats-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Refetch on period change. The server re-applies scope (getStats filters points
// by role), so a client can never request points outside its rights via params.
export async function GET(req: Request) {
  const user = await requireUser();
  if (!canViewStats(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const sp = new URL(req.url).searchParams;
  const p = sp.get("period");
  const fromQ = sp.get("from");
  const toQ = sp.get("to");
  const isDate = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

  // Custom range: needs both endpoints; we order them so from ≤ to.
  if (p === "custom" && isDate(fromQ) && isDate(toQ)) {
    const [from, to] = fromQ <= toQ ? [fromQ, toQ] : [toQ, fromQ];
    return NextResponse.json(await getStats(user, "custom", { from, to }));
  }

  const period: Period = p === "day" || p === "week" || p === "month" ? p : "month";
  return NextResponse.json(await getStats(user, period));
}
