import { getCurrentUser } from "@/lib/auth";
import { saveSubscription } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const sub = await req.json().catch(() => null);
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return new Response("bad request", { status: 400 });
  }
  await saveSubscription(user.id, sub);
  return Response.json({ ok: true });
}
