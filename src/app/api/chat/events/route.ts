import { getCurrentUser } from "@/lib/auth";
import { subscribeChatUser } from "@/lib/realtime";

// Server-Sent Events stream of chat events for the logged-in user:
//   data: change                      → refetch (router.refresh)
//   data: typing:<chatId>:<name>      → transient typing indicator
// nodejs runtime (needs the pg listener).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const encoder = new TextEncoder();
  let unsub: () => void = () => {};
  let hb: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (s: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(s));
        } catch {
          closed = true;
        }
      };
      send(": connected\n\n");
      unsub = await subscribeChatUser(user.id, (event) => send(`data: ${event}\n\n`));
      hb = setInterval(() => send(": ping\n\n"), 25_000); // keep proxies from idling out
      req.signal.addEventListener("abort", () => {
        closed = true;
        if (hb) clearInterval(hb);
        unsub();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      closed = true;
      if (hb) clearInterval(hb);
      unsub();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
