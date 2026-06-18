import { prisma } from "./prisma";
import type { BoardData } from "./types";

/** Load the primary board, shaped for the client board view. */
export async function getBoard(): Promise<BoardData | null> {
  const board = await prisma.board.findFirst({
    orderBy: { createdAt: "asc" },
    include: {
      columns: {
        orderBy: { position: "asc" },
        include: {
          tasks: {
            orderBy: { position: "asc" },
            include: {
              assignee: { select: { id: true, name: true } },
              _count: { select: { comments: true, attachments: true } },
            },
          },
        },
      },
    },
  });

  if (!board) return null;

  return {
    id: board.id,
    name: board.name,
    columns: board.columns.map((c) => ({
      id: c.id,
      name: c.name,
      tasks: c.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        assignee: t.assignee,
        commentCount: t._count.comments,
        attachmentCount: t._count.attachments,
      })),
    })),
  };
}
