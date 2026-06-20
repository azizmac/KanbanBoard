import type { ActivityKind } from "@/generated/prisma/client";
import { type Actor, visibleBoardWhere } from "./access";
import { prisma } from "./prisma";

export type FeedEvent = {
  id: string;
  kind: ActivityKind;
  detail: string | null;
  createdAt: string;
  actor: { id: string; name: string; avatarUrl: string | null };
  task: { id: string; title: string };
  board: { name: string; color: string };
};

/** Recent activity across the boards the user can see, newest first. */
export async function getActivityFeed(user: Actor, take = 40): Promise<FeedEvent[]> {
  const scope = await visibleBoardWhere(user);
  const acts = await prisma.activity.findMany({
    where: { task: { column: { board: scope } } },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      kind: true,
      detail: true,
      createdAt: true,
      actor: { select: { id: true, name: true, avatarUrl: true } },
      task: {
        select: { id: true, title: true, column: { select: { board: { select: { name: true, color: true } } } } },
      },
    },
  });
  return acts.map((a) => ({
    id: a.id,
    kind: a.kind,
    detail: a.detail,
    createdAt: a.createdAt.toISOString(),
    actor: a.actor,
    task: { id: a.task.id, title: a.task.title },
    board: a.task.column.board,
  }));
}
