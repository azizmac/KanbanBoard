import { NextResponse } from "next/server";
import type { Priority, Role } from "@/generated/prisma/client";
import { assignableUserWhere, canAccessBoard, canCreateWebhookToken, visibleBoardWhere } from "@/lib/access";
import { recordActivity } from "@/lib/activity";
import { notify } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { notifyTaskChange } from "@/lib/realtime";
import { hashToken, isPersonalToken } from "@/lib/webhook-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Inbound webhook for Genspark ────────────────────────────────────────────
// Two auth modes, both via `X-Genspark-Secret` header / `Authorization: Bearer`
// / `?secret=`:
//   • Personal token (starts with "gsk_")  → acts AS its owner (a director/regional).
//     The created task is attributed to them and SCOPED: only their accessible
//     boards, only assignees on their team.
//   • Global GENSPARK_WEBHOOK_SECRET        → system/company mode: any board, any
//     assignee, attributed to the board owner.
//
// Body: { title (req), description?, assignee?, board?, column?, priority?, dueDate? }

const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];

/** Length-safe, constant-time-ish compare for the global secret. */
function secretOk(provided: string, expected: string) {
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i++) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

type Actor = { id: string; role: Role; superAdmin: boolean; name: string };

export async function POST(req: Request) {
  const url = new URL(req.url);
  const provided =
    req.headers.get("x-genspark-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    url.searchParams.get("secret") ||
    "";
  if (!provided) return bad("unauthorized", 401);

  // ---- Auth → mode + actor ----
  let mode: "user" | "system";
  let actor: Actor | null = null;
  let tokenId: string | null = null;

  if (isPersonalToken(provided)) {
    const tok = await prisma.webhookToken.findUnique({
      where: { tokenHash: hashToken(provided) },
      include: { user: { select: { id: true, role: true, superAdmin: true, name: true, active: true } } },
    });
    if (!tok || tok.revokedAt || !tok.user.active) return bad("unauthorized", 401);
    // Role may have been downgraded after the token was minted.
    if (!canCreateWebhookToken(tok.user)) return bad("Токен больше не имеет прав на создание задач", 403);
    actor = { id: tok.user.id, role: tok.user.role, superAdmin: tok.user.superAdmin, name: tok.user.name };
    tokenId = tok.id;
    mode = "user";
  } else if (process.env.GENSPARK_WEBHOOK_SECRET && secretOk(provided, process.env.GENSPARK_WEBHOOK_SECRET)) {
    mode = "system";
  } else {
    return bad("unauthorized", 401);
  }

  // ---- Body ----
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return bad("Тело запроса должно быть JSON");
  }
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return bad("Поле 'title' обязательно");
  if (title.length > 300) return bad("'title' слишком длинный (макс. 300)");

  // ---- Assignee (scoped in user mode) ----
  let assignee: { id: string; name: string } | null = null;
  const who = typeof body.assignee === "string" ? body.assignee.trim().replace(/^@/, "") : "";
  if (who) {
    const match = { OR: [{ id: who }, { username: { equals: who, mode: "insensitive" as const } }, { name: { equals: who, mode: "insensitive" as const } }] };
    assignee = await prisma.user.findFirst({
      where: mode === "user" && actor ? { AND: [assignableUserWhere(actor), match] } : { active: true, ...match },
      select: { id: true, name: true },
    });
    if (!assignee) {
      return bad(mode === "user" ? `Пользователь '${who}' не найден среди ваших участников` : `Пользователь '${who}' не найден`);
    }
  }

  // ---- Board (scoped in user mode) ----
  const boardRef = typeof body.board === "string" ? body.board.trim() : "";
  let board: { id: string; ownerId: string | null } | null = null;
  if (boardRef) {
    board = await prisma.board.findFirst({
      where: { OR: [{ id: boardRef }, { name: { equals: boardRef, mode: "insensitive" } }] },
      select: { id: true, ownerId: true },
    });
    if (!board) return bad(`Доска '${boardRef}' не найдена`);
    if (mode === "user" && actor && !(await canAccessBoard(actor, board.id))) {
      return bad("Нет доступа к этой доске", 403);
    }
  } else if (mode === "user" && actor) {
    // default: the actor's newest accessible board
    board = await prisma.board.findFirst({
      where: await visibleBoardWhere(actor),
      orderBy: { createdAt: "desc" },
      select: { id: true, ownerId: true },
    });
    if (!board) return bad("У вас нет доступных досок — укажите 'board'");
  } else {
    // system mode default: env board, else newest
    if (process.env.GENSPARK_DEFAULT_BOARD_ID) {
      board = await prisma.board.findUnique({ where: { id: process.env.GENSPARK_DEFAULT_BOARD_ID }, select: { id: true, ownerId: true } });
    }
    board ||= await prisma.board.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true, ownerId: true } });
    if (!board) return bad("Нет доступных досок — создайте доску или укажите 'board'");
  }

  // ---- Column / priority / dueDate / description ----
  const colRef = typeof body.column === "string" ? body.column.trim() : "";
  const column = await prisma.column.findFirst({
    where: { boardId: board.id, ...(colRef ? { name: { equals: colRef, mode: "insensitive" } } : {}) },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  if (!column) return bad(colRef ? `Колонка '${colRef}' не найдена` : "На доске нет колонок");

  const pr = String(body.priority ?? "").toUpperCase();
  const priority = (PRIORITIES.includes(pr) ? pr : "NORMAL") as Priority;
  const description = typeof body.description === "string" ? body.description.slice(0, 10000) || null : null;
  let dueDate: Date | null = null;
  if (body.dueDate) {
    const d = new Date(body.dueDate as string);
    if (!Number.isNaN(d.getTime())) dueDate = d;
  }

  // ---- Creator: the token owner (user mode), else board owner / assignee / an admin ----
  const creatorId =
    mode === "user" && actor
      ? actor.id
      : board.ownerId ||
        assignee?.id ||
        (await prisma.user.findFirst({ where: { active: true, OR: [{ superAdmin: true }, { role: "ADMIN" }] }, orderBy: { createdAt: "asc" }, select: { id: true } }))?.id;
  if (!creatorId) return bad("Не найден пользователь-владелец для создания задачи", 500);

  const position = await prisma.task.count({ where: { columnId: column.id } });
  const task = await prisma.task.create({
    data: { title, description, priority, dueDate, columnId: column.id, creatorId, assigneeId: assignee?.id ?? null, position },
    select: { id: true },
  });

  await recordActivity(task.id, creatorId, "CREATED", "Genspark");
  if (assignee) {
    await recordActivity(task.id, creatorId, "ASSIGNED", assignee.name);
    if (assignee.id !== creatorId) {
      const from = mode === "user" && actor ? actor.name : "Genspark";
      await notify({ userId: assignee.id, type: "ASSIGNED", message: `${from} поставил(а) вам задачу «${title}» (Genspark)`, taskId: task.id });
    }
  }
  await notifyTaskChange(task.id);
  if (tokenId) await prisma.webhookToken.update({ where: { id: tokenId }, data: { lastUsedAt: new Date() } });

  // Public origin from the request (Caddy sets Host + X-Forwarded-Proto) so the
  // returned link is https://kanban.freshdv.ru/… in prod, not a stale build env.
  const host = req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const base = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  return NextResponse.json({ ok: true, taskId: task.id, url: base ? `${base}/task/${task.id}` : `/task/${task.id}`, assignedTo: assignee?.name ?? null });
}

// Lightweight discovery/health for integrators (no secret, no data leaked).
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "genspark-webhook",
    modes: ["personal token (gsk_… — acts as its owner, scoped to their boards/team)", "global secret (system)"],
    method: "POST",
    auth: "header 'X-Genspark-Secret' | 'Authorization: Bearer <token>' | '?secret='",
    body: {
      title: "string (required)",
      description: "string?",
      assignee: "string? — @username / username / ФИО / id",
      board: "string? — name or id",
      column: "string? — column name (default: first)",
      priority: "LOW|NORMAL|HIGH|URGENT?",
      dueDate: "string? (ISO date)",
    },
  });
}
