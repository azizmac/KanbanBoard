import type { Prisma, Role } from "@/generated/prisma/client";
import { prisma } from "./prisma";

// ---- Role tiers ----
// The Role enum is reused but relabeled as the org hierarchy:
//   ADMIN   → Директор  (sees ALL boards, manages regions/roles)
//   MANAGER → Регионал   (runs assigned region(s): boards, groups, invites)
//   MEMBER  → Линейный   (sees boards via group membership only)
// See prisma/schema.prisma and docs/ACCESS.md.

export type Actor = { id: string; role: Role; superAdmin?: boolean };

export function isDirector(u: Actor) {
  return u.role === "ADMIN";
}
export function isRegional(u: Actor) {
  return u.role === "MANAGER";
}

// ---- Management hierarchy (who may deactivate / re-role whom) ----
// Strict tiers: superadmin (3) > директор (2) > регионал (1) > линейный (0).
// You may only manage — and only assign roles — strictly BELOW your own tier.
// So directors can't touch each other or the owner, and the owner can be
// deactivated/demoted by no one (not even themselves).

export function roleTier(role: Role): number {
  return role === "ADMIN" ? 2 : role === "MANAGER" ? 1 : 0;
}

export function actorTier(u: Actor): number {
  return u.superAdmin ? 3 : roleTier(u.role);
}

/** Can `actor` change `target`'s role / active state at all? */
export function canManageUser(actor: Actor, target: Actor): boolean {
  return actorTier(actor) > actorTier(target);
}

/** May `actor` assign/create/invite at this role? (strictly below their tier) */
export function canAssignRole(actor: Actor, role: Role): boolean {
  return roleTier(role) < actorTier(actor);
}

export function canManageOrg(u: Actor) {
  // create/edit regions, assign managers, manage all users
  return isDirector(u);
}

/** Prisma `where` fragment selecting the boards a user may see. */
export async function visibleBoardWhere(user: Actor): Promise<Prisma.BoardWhereInput> {
  if (isDirector(user)) return {}; // everything

  // own (personal) boards + boards shared via a group the user belongs to
  const base: Prisma.BoardWhereInput[] = [
    { ownerId: user.id },
    { groups: { some: { members: { some: { id: user.id } } } } },
  ];

  if (isRegional(user)) {
    const regions = await prisma.region.findMany({
      where: { managers: { some: { id: user.id } } },
      select: { id: true },
    });
    return { OR: [{ regionId: { in: regions.map((r) => r.id) } }, ...base] };
  }

  // staff: only their own boards + boards they've been added to
  return { OR: base };
}

export async function canAccessBoard(user: Actor, boardId: string): Promise<boolean> {
  if (isDirector(user)) return true;
  const where = await visibleBoardWhere(user);
  const found = await prisma.board.findFirst({
    where: { AND: [{ id: boardId }, where] },
    select: { id: true },
  });
  return Boolean(found);
}

/** Region ids a user may create boards / groups in. Directors → all (null = any). */
export async function manageableRegionIds(user: Actor): Promise<string[] | null> {
  if (isDirector(user)) return null; // any
  if (isRegional(user)) {
    const regions = await prisma.region.findMany({
      where: { managers: { some: { id: user.id } } },
      select: { id: true },
    });
    return regions.map((r) => r.id);
  }
  return [];
}

/** Can the user manage a region (its groups, invites)? Director, or its regional. */
export async function canManageRegion(user: Actor, regionId: string | null): Promise<boolean> {
  if (isDirector(user)) return true;
  if (!isRegional(user) || !regionId) return false;
  const ids = await manageableRegionIds(user);
  return Boolean(ids && ids.includes(regionId));
}

/** Can the user manage a group (its members, boards, invites)? */
export async function canManageGroup(user: Actor, group: { regionId: string | null }): Promise<boolean> {
  return canManageRegion(user, group.regionId);
}

export async function canCreateBoardInRegion(user: Actor, regionId: string | null): Promise<boolean> {
  if (isDirector(user)) return true;
  if (!isRegional(user) || !regionId) return false;
  const ids = await manageableRegionIds(user);
  return Boolean(ids && ids.includes(regionId));
}

/** Can the user manage a given board (settings, delete, groups)? */
export async function canManageBoard(
  user: Actor,
  board: { regionId: string | null; ownerId?: string | null },
): Promise<boolean> {
  if (isDirector(user)) return true;
  if (board.ownerId && board.ownerId === user.id) return true; // own personal board
  if (!isRegional(user)) return false;
  return canCreateBoardInRegion(user, board.regionId);
}
