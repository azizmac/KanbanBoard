import { getCurrentUser } from "@/lib/auth";
import { sendPush } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sends a test push to the caller's own devices (used by the profile toggle).
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return new Response("unauthorized", { status: 401 });
  await sendPush(user.id, { title: "Поток", body: "Push-уведомления подключены ✅", url: "/" });
  return Response.json({ ok: true });
}
