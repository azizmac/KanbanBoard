import { type Actor, isDirector, manageableRegionIds } from "./access";
import { prisma } from "./prisma";

const boardSelect = {
  id: true,
  name: true,
  columns: { orderBy: { position: "asc" }, select: { id: true, name: true } },
} as const;

/** Boards the user may manage templates on (directors: all; regionals: their regions). */
export async function manageableBoards(user: Actor) {
  if (isDirector(user)) {
    return prisma.board.findMany({ orderBy: { createdAt: "asc" }, select: boardSelect });
  }
  const regionIds = await manageableRegionIds(user);
  if (!regionIds || regionIds.length === 0) return [];
  return prisma.board.findMany({
    where: { regionId: { in: regionIds } },
    orderBy: { createdAt: "asc" },
    select: boardSelect,
  });
}

export async function listTemplates(user: Actor) {
  const boards = await manageableBoards(user);
  const ids = boards.map((b) => b.id);
  if (ids.length === 0) return [];
  return prisma.taskTemplate.findMany({
    where: { boardId: { in: ids } },
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    include: { board: { select: { name: true } }, assignee: { select: { name: true } } },
  });
}

/** Options for the template form: manageable boards (+ their columns) and users. */
export async function templateFormOptions(user: Actor) {
  const [boards, users] = await Promise.all([
    manageableBoards(user),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { boards, users };
}
