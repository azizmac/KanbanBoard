import { relativeUpdated } from "./format";
import { prisma } from "./prisma";
import type { BoardData, BoardOption, BoardSummary, TaskCard } from "./types";

function isDone(name: string) {
  return name.includes("Готово");
}
function isReview(name: string) {
  return name.includes("ревью") || name.includes("проверке");
}
function isProgress(name: string) {
  return name.includes("работе");
}

const cardTaskInclude = {
  orderBy: { position: "asc" },
  include: {
    assignee: { select: { id: true, name: true } },
    tags: { select: { id: true, name: true, color: true } },
    _count: { select: { comments: true, attachments: true } },
  },
} as const;

function toCard(t: {
  id: string;
  title: string;
  priority: TaskCard["priority"];
  dueDate: Date | null;
  assignee: { id: string; name: string } | null;
  tags: { id: string; name: string; color: string }[];
  _count: { comments: number; attachments: number };
}): TaskCard {
  return {
    id: t.id,
    title: t.title,
    priority: t.priority,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    overdue: t.dueDate ? t.dueDate.getTime() < Date.now() : false,
    assignee: t.assignee,
    tags: t.tags,
    commentCount: t._count.comments,
    attachmentCount: t._count.attachments,
  };
}

/** Load one board (by id, or the first board if none given), shaped for the board view. */
export async function getBoard(boardId?: string): Promise<BoardData | null> {
  const board = await prisma.board.findFirst({
    where: boardId ? { id: boardId } : undefined,
    orderBy: { createdAt: "asc" },
    include: {
      columns: {
        orderBy: { position: "asc" },
        include: { tasks: cardTaskInclude },
      },
    },
  });

  if (!board) return null;

  return {
    id: board.id,
    name: board.name,
    color: board.color,
    columns: board.columns.map((c) => ({
      id: c.id,
      name: c.name,
      tasks: c.tasks.map(toCard),
    })),
  };
}

/** Lightweight list of all boards for the header switcher. */
export async function getBoardOptions(): Promise<BoardOption[]> {
  const boards = await prisma.board.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, color: true },
  });
  return boards;
}

/** All boards with progress + members, for the "Все доски" overview. */
export async function getBoardSummaries(): Promise<BoardSummary[]> {
  const boards = await prisma.board.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      columns: {
        orderBy: { position: "asc" },
        include: {
          tasks: {
            select: {
              updatedAt: true,
              assignee: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  return boards.map((b) => {
    let total = 0;
    let done = 0;
    let review = 0;
    let progress = 0;
    let lastUpdated: Date | null = null;
    const members = new Set<string>();

    for (const col of b.columns) {
      for (const t of col.tasks) {
        total += 1;
        if (isDone(col.name)) done += 1;
        else if (isReview(col.name)) review += 1;
        else if (isProgress(col.name)) progress += 1;
        if (t.assignee) members.add(t.assignee.name);
        if (!lastUpdated || t.updatedAt > lastUpdated) lastUpdated = t.updatedAt;
      }
    }

    const denom = total || 1;
    return {
      id: b.id,
      name: b.name,
      color: b.color,
      taskCount: total,
      doneRatio: done / denom,
      reviewRatio: review / denom,
      progressRatio: progress / denom,
      memberNames: [...members],
      updatedLabel: relativeUpdated(lastUpdated),
    };
  });
}
