// Cross-process live updates over Postgres LISTEN/NOTIFY.
//
// Any mutation (web server action OR the bot process) calls notifyBoardChange /
// notifyChatUsers, which issues `pg_notify`. A single shared LISTEN connection
// in the app process receives it and fans out to the in-memory subscribers
// (one per open SSE connection). One DB connection regardless of how many
// browsers are open.
import { Client } from "pg";
import { prisma } from "./prisma";

const BOARD_CHANNEL = "board_change";
// Chat events target a user (every member of the chat), payload "<userId>|<event>"
// where <event> is "change" (refetch) or "typing:<chatId>:<name>" (ephemeral).
const CHAT_CHANNEL = "chat_change";

type Listener = () => void;
type ChatListener = (event: string) => void;

const boardListeners = new Map<string, Set<Listener>>();
const chatListeners = new Map<string, Set<ChatListener>>();
let client: Client | null = null;
let connecting: Promise<void> | null = null;

async function ensureListening(): Promise<void> {
  if (client) return;
  if (!connecting) {
    connecting = (async () => {
      const c = new Client({ connectionString: process.env.DATABASE_URL });
      c.on("notification", (msg) => {
        if (!msg.payload) return;
        if (msg.channel === BOARD_CHANNEL) {
          const set = boardListeners.get(msg.payload);
          if (set) for (const fn of [...set]) { try { fn(); } catch { /* ignore */ } }
        } else if (msg.channel === CHAT_CHANNEL) {
          const sep = msg.payload.indexOf("|");
          if (sep < 0) return;
          const userId = msg.payload.slice(0, sep);
          const event = msg.payload.slice(sep + 1);
          const set = chatListeners.get(userId);
          if (set) for (const fn of [...set]) { try { fn(event); } catch { /* ignore */ } }
        }
      });
      c.on("error", (e) => {
        console.error("[realtime] listen error:", e instanceof Error ? e.message : e);
        client = null;
        connecting = null; // force reconnect on next subscribe
      });
      await c.connect();
      await c.query(`LISTEN ${BOARD_CHANNEL}`);
      await c.query(`LISTEN ${CHAT_CHANNEL}`);
      client = c;
    })().catch((e) => {
      connecting = null;
      throw e;
    });
  }
  return connecting;
}

function addListener<T>(map: Map<string, Set<T>>, key: string, fn: T): () => void {
  let set = map.get(key);
  if (!set) {
    set = new Set();
    map.set(key, set);
  }
  set.add(fn);
  return () => {
    const s = map.get(key);
    if (!s) return;
    s.delete(fn);
    if (s.size === 0) map.delete(key);
  };
}

/** Subscribe to changes for one board. Returns an unsubscribe fn. */
export async function subscribeBoard(boardId: string, fn: Listener): Promise<() => void> {
  await ensureListening();
  return addListener(boardListeners, boardId, fn);
}

/** Broadcast that a board changed (reaches every app process via the DB). */
export async function notifyBoardChange(boardId: string): Promise<void> {
  try {
    // $executeRawUnsafe: pg_notify returns void, which $queryRaw can't deserialize
    await prisma.$executeRawUnsafe("SELECT pg_notify($1, $2)", BOARD_CHANNEL, boardId);
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

/** Subscribe to chat events addressed to one user. Returns an unsubscribe fn. */
export async function subscribeChatUser(userId: string, fn: ChatListener): Promise<() => void> {
  await ensureListening();
  return addListener(chatListeners, userId, fn);
}

/** Send a chat event ("change" or "typing:<chatId>:<name>") to a set of users. */
export async function notifyChatUsers(userIds: string[], event: string): Promise<void> {
  try {
    await Promise.all(
      [...new Set(userIds)].map((id) =>
        prisma.$executeRawUnsafe("SELECT pg_notify($1, $2)", CHAT_CHANNEL, `${id}|${event}`),
      ),
    );
  } catch (e) {
    console.error("[realtime] chat notify failed:", e instanceof Error ? e.message : e);
  }
}
