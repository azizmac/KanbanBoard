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

  const p = new URL(req.url).searchParams.get("period");
  const period: Period = p === "day" || p === "week" || p === "month" ? p : "month";

  return NextResponse.json(await getStats(user, period));
}
