import { prisma } from "@/lib/prisma";

// Liveness/readiness probe. The bot polls this every minute and alerts on
// failure; it also backs the Cloudflare dead-man's switch. Checks DB reachability.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, db: true, ts: Date.now() });
  } catch (e) {
    return Response.json(
      { ok: false, db: false, error: e instanceof Error ? e.message : String(e) },
      { status: 503 },
    );
  }
}
