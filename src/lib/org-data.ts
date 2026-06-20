import { type Actor, isDirector, manageableRegionIds } from "./access";
import { prisma } from "./prisma";

export type RegionOption = { id: string; name: string; color: string };

/** Regions the user may create boards/groups in (director → all). */
export async function listManageableRegions(user: Actor): Promise<RegionOption[]> {
  if (isDirector(user)) {
    return prisma.region.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, color: true } });
  }
  return prisma.region.findMany({
    where: { managers: { some: { id: user.id } } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true },
  });
}

export type RegionDetail = {
  id: string;
  name: string;
  color: string;
  managers: { id: string; name: string }[];
  boardCount: number;
  groupCount: number;
};

/** All regions with managers + counts, for the admin org screen. */
export async function getRegionsDetail(): Promise<RegionDetail[]> {
  const regions = await prisma.region.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      managers: { select: { id: true, name: true } },
      _count: { select: { boards: true, groups: true } },
    },
  });
  return regions.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    managers: r.managers,
    boardCount: r._count.boards,
    groupCount: r._count.groups,
  }));
}

/** Job-title list (справочник должностей). */
export async function listPositions(): Promise<{ id: string; name: string }[]> {
  return prisma.position.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
}

/** Everything the org panel edits, scoped to what the user manages. */
export async function getOrgAdminData(user: Actor) {
  const director = isDirector(user);
  const regionIds = director ? null : ((await manageableRegionIds(user)) ?? []);
  const regionWhere = director ? {} : { id: { in: regionIds! } };
  const scopedWhere = director ? {} : { regionId: { in: regionIds! } };

  const [regions, groups, users, boards, positions] = await Promise.all([
    prisma.region.findMany({
      where: regionWhere,
      orderBy: { createdAt: "asc" },
      include: { managers: { select: { id: true } }, _count: { select: { boards: true } } },
    }),
    prisma.group.findMany({
      where: scopedWhere,
      orderBy: { createdAt: "asc" },
      include: { members: { select: { id: true } }, boards: { select: { id: true } } },
    }),
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
    prisma.board.findMany({
      where: scopedWhere,
      orderBy: { name: "asc" },
      select: { id: true, name: true, regionId: true },
    }),
    prisma.position.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return {
    positions,
    regions: regions.map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      managerIds: r.managers.map((m) => m.id),
      boardCount: r._count.boards,
    })),
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      regionId: g.regionId,
      memberIds: g.members.map((m) => m.id),
      boardIds: g.boards.map((b) => b.id),
    })),
    users,
    boards,
  };
}

export type GroupDetail = {
  id: string;
  name: string;
  regionId: string | null;
  regionName: string | null;
  memberNames: string[];
  boardNames: string[];
};

export async function getGroupsDetail(): Promise<GroupDetail[]> {
  const groups = await prisma.group.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      region: { select: { name: true } },
      members: { select: { name: true } },
      boards: { select: { name: true } },
    },
  });
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    regionId: g.regionId,
    regionName: g.region?.name ?? null,
    memberNames: g.members.map((m) => m.name),
    boardNames: g.boards.map((b) => b.name),
  }));
}
