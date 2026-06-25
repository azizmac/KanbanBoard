import { NextResponse } from "next/server";
import { isDirector } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { listDepartments } from "@/lib/iiko/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// iiko sales points for the admin point-picker (director-only).
export async function GET() {
  const user = await requireUser();
  if (!isDirector(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    return NextResponse.json({ departments: await listDepartments() });
  } catch (e) {
    return NextResponse.json({ departments: [], error: (e as Error).message });
  }
}
