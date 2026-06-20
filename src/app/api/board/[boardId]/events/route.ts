import { canAccessBoard } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { subscribeBoard } from "@/lib/realtime";

// Server-Sent Events stream of "this board changed" pings. The client refetches
// the board (router.refresh) on each ping. nodejs runtime (needs the pg listener).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;
  const user = await getCurrentUser();
  if (!user || !(await canAccessBoard(user, boardId))) {
    return new Response("forbidden", { status: 403 });
  }

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
      unsub = await subscribeBoard(boardId, () => send("data: change\n\n"));
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
