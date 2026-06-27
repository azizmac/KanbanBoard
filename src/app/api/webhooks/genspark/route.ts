import { NextResponse } from "next/server";
import type { Priority } from "@/generated/prisma/client";
import { recordActivity } from "@/lib/activity";
import { notify } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { notifyTaskChange } from "@/lib/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Inbound webhook for Genspark ────────────────────────────────────────────
// Genspark (or any automation) POSTs JSON here to create a task and assign it
// to someone. Auth is a shared secret (GENSPARK_WEBHOOK_SECRET) sent as the
// `X-Genspark-Secret` header, `Authorization: Bearer <secret>`, or `?secret=`.
//
// Body:
//   { "title": "...",                 // required
//     "description": "...",           // optional
//     "assignee": "anna",             // optional — @username / username / ФИО / user id
//     "board": "Маркетинг" | "<id>",  // optional — name or id; else GENSPARK_DEFAULT_BOARD_ID, else newest board
//     "column": "Бэклог",             // optional — column name; else first column
//     "priority": "HIGH",             // optional — LOW|NORMAL|HIGH|URGENT (default NORMAL)
//     "dueDate": "2026-07-01" }       // optional — anything Date can parse

const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];

/** Length-safe, constant-time-ish secret compare. */
function secretOk(provided: string, expected: string) {
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i++) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export async function POST(req: Request) {
  const expected = process.env.GENSPARK_WEBHOOK_SECRET;
  if (!expected) return bad("Genspark webhook не настроен (нет GENSPARK_WEBHOOK_SECRET)", 503);

  const url = new URL(req.url);
  const provided =
    req.headers.get("x-genspark-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    url.searchParams.get("secret") ||
    "";
  if (!secretOk(provided, expected)) return bad("unauthorized", 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return bad("Тело запроса должно быть JSON");
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return bad("Поле 'title' обязательно");
  if (title.length > 300) return bad("'title' слишком длинный (макс. 300)");

  // assignee — optional; resolve by @username / username / exact name / id
  let assignee: { id: string; name: string } | null = null;
  const who = typeof body.assignee === "string" ? body.assignee.trim().replace(/^@/, "") : "";
  if (who) {
    assignee = await prisma.user.findFirst({
      where: {
        active: true,
        OR: [
          { id: who },
          { username: { equals: who, mode: "insensitive" } },
          { name: { equals: who, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true },
    });
    if (!assignee) return bad(`Пользователь '${who}' не найден`);
  }

  // board — payload (name/id) → GENSPARK_DEFAULT_BOARD_ID → newest board
  const boardRef = typeof body.board === "string" ? body.board.trim() : "";
  let board =
    (boardRef
      ? await prisma.board.findFirst({
          where: { OR: [{ id: boardRef }, { name: { equals: boardRef, mode: "insensitive" } }] },
          select: { id: true, ownerId: true },
        })
      : null) ??
    (process.env.GENSPARK_DEFAULT_BOARD_ID
      ? await prisma.board.findUnique({
          where: { id: process.env.GENSPARK_DEFAULT_BOARD_ID },
          select: { id: true, ownerId: true },
        })
      : null);
  if (!board) {
    board = await prisma.board.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true, ownerId: true } });
  }
  if (!board) return bad("Нет доступных досок — создайте доску или укажите 'board'");

  // column — payload (name) → first column by position
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

  // Tasks need a creator. There's no human actor here, so attribute to the board
  // owner, else the assignee, else the first admin/owner.
  const creatorId =
    board.ownerId ||
    assignee?.id ||
    (
      await prisma.user.findFirst({
        where: { active: true, OR: [{ superAdmin: true }, { role: "ADMIN" }] },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      })
    )?.id;
  if (!creatorId) return bad("Не найден пользователь-владелец для создания задачи", 500);

  const position = await prisma.task.count({ where: { columnId: column.id } });
  const task = await prisma.task.create({
    data: { title, description, priority, dueDate, columnId: column.id, creatorId, assigneeId: assignee?.id ?? null, position },
    select: { id: true },
  });

  await recordActivity(task.id, creatorId, "CREATED", "Genspark");
  if (assignee) {
    await recordActivity(task.id, creatorId, "ASSIGNED", assignee.name);
    await notify({
      userId: assignee.id,
      type: "ASSIGNED",
      message: `Genspark поставил(а) вам задачу «${title}»`,
      taskId: task.id,
    });
  }
  await notifyTaskChange(task.id);

  const base = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  return NextResponse.json({
    ok: true,
    taskId: task.id,
    url: `${base}/task/${task.id}`,
    assignedTo: assignee?.name ?? null,
  });
}

// Lightweight discovery/health for the integrator (no secret required, no data leaked).
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "genspark-webhook",
    configured: Boolean(process.env.GENSPARK_WEBHOOK_SECRET),
    method: "POST",
    auth: "header 'X-Genspark-Secret' | 'Authorization: Bearer <secret>' | '?secret='",
    body: {
      title: "string (required)",
      description: "string?",
      assignee: "string? — @username / username / ФИО / id",
      board: "string? — name or id (default: newest / GENSPARK_DEFAULT_BOARD_ID)",
      column: "string? — column name (default: first)",
      priority: "LOW|NORMAL|HIGH|URGENT?",
      dueDate: "string? (ISO date)",
    },
  });
}
