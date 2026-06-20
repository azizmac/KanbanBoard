// Cross-process board live updates over Postgres LISTEN/NOTIFY.
//
// Any mutation (web server action OR the bot process) calls notifyBoardChange,
// which issues `pg_notify`. A single shared LISTEN connection in the app process
// receives it and fans out to the per-board in-memory subscribers (one per open
// SSE connection). One DB connection regardless of how many browsers are open.
import { Client } from "pg";
import { prisma } from "./prisma";

const CHANNEL = "board_change";
type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();
let client: Client | null = null;
let connecting: Promise<void> | null = null;

async function ensureListening(): Promise<void> {
  if (client) return;
  if (!connecting) {
    connecting = (async () => {
      const c = new Client({ connectionString: process.env.DATABASE_URL });
      c.on("notification", (msg) => {
        const boardId = msg.payload;
        if (!boardId) return;
        const set = listeners.get(boardId);
        if (set) for (const fn of [...set]) { try { fn(); } catch { /* ignore */ } }
      });
      c.on("error", (e) => {
        console.error("[realtime] listen error:", e instanceof Error ? e.message : e);
        client = null;
        connecting = null; // force reconnect on next subscribe
      });
      await c.connect();
      await c.query(`LISTEN ${CHANNEL}`);
      client = c;
    })().catch((e) => {
      connecting = null;
      throw e;
    });
  }
  return connecting;
}

/** Subscribe to changes for one board. Returns an unsubscribe fn. */
export async function subscribeBoard(boardId: string, fn: Listener): Promise<() => void> {
  await ensureListening();
  let set = listeners.get(boardId);
  if (!set) {
    set = new Set();
    listeners.set(boardId, set);
  }
  set.add(fn);
  return () => {
    const s = listeners.get(boardId);
    if (!s) return;
    s.delete(fn);
    if (s.size === 0) listeners.delete(boardId);
  };
}

/** Broadcast that a board changed (reaches every app process via the DB). */
export async function notifyBoardChange(boardId: string): Promise<void> {
  try {
    await prisma.$queryRawUnsafe("SELECT pg_notify($1, $2)", CHANNEL, boardId);
  } catch (e) {
    console.error("[realtime] notify failed:", e instanceof Error ? e.message : e);
  }
}

/** Look up a task's board and broadcast a change. */
export async function notifyTaskChange(taskId: string): Promise<void> {
  const t = await prisma.task.findUnique({
    where: { id: taskId },
    select: { column: { select: { boardId: true } } },
  });
  if (t) await notifyBoardChange(t.column.boardId);
}
