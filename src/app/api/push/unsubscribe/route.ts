import { getCurrentUser } from "@/lib/auth";
import { deleteSubscription } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const { endpoint } = await req.json().catch(() => ({ endpoint: null }));
  if (endpoint) await deleteSubscription(endpoint);
  return Response.json({ ok: true });
}
