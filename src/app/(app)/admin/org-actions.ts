"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Role } from "@/generated/prisma/client";
import { canAssignRole, canManageGroup, canManageOrg, canManageRegion } from "@/lib/access";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { makeInviteToken } from "@/lib/invite";
import { prisma } from "@/lib/prisma";

async function director() {
  const user = await requireUser();
  return canManageOrg(user) ? user : null;
}

async function groupRegion(groupId: string) {
  return prisma.group.findUnique({ where: { id: groupId }, select: { regionId: true } });
}

const nameSchema = z.string().trim().min(1, "Введите название").max(80);

function ok() {
  revalidatePath("/admin/org");
  revalidatePath("/boards");
  return { ok: true as const };
}

/** Set the regions a board belongs to (replaces the set; empty = no region).
 *  Director only. A board may span several regions (shared boards). */
export async function setBoardRegions(boardId: string, regionIds: string[]) {
  if (!(await director())) return { ok: false as const, error: "Недостаточно прав" };
  await prisma.board.update({
    where: { id: boardId },
    data: { regions: { set: [...new Set(regionIds)].map((id) => ({ id })) } },
  });
  revalidatePath("/admin/org");
  revalidatePath("/boards");
  return { ok: true as const };
}

// ----- Positions (справочник должностей) -----

export async function createPosition(name: string, role: Role = "MEMBER", color = "gray") {
  const actor = await director();
  if (!actor) return { ok: false as const, error: "Недостаточно прав" };
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message };
  // A position's level can't exceed what the actor may assign (so a director
  // can't mint a «Директор»-level position; only the owner can).
  if (!canAssignRole(actor, role)) {
    return { ok: false as const, error: "Нельзя задать уровень на своём ранге или выше" };
  }
  const exists = await prisma.position.findFirst({ where: { name: { equals: parsed.data, mode: "insensitive" } } });
  if (exists) return { ok: false as const, error: "Такая должность уже есть" };
  await prisma.position.create({ data: { name: parsed.data, role, color } });
  revalidatePath("/admin/org");
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function deletePosition(id: string) {
  if (!(await director())) return { ok: false as const, error: "Недостаточно прав" };
  await prisma.position.delete({ where: { id } });
  revalidatePath("/admin/org");
  revalidatePath("/admin");
  return { ok: true as const };
}

// ----- Regions -----

export async function createRegion(name: string, color = "iris") {
  if (!(await director())) return { ok: false as const, error: "Недостаточно прав" };
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message };
  await prisma.region.create({ data: { name: parsed.data, color } });
  return ok();
}

export async function renameRegion(id: string, name: string) {
  if (!(await director())) return { ok: false as const, error: "Недостаточно прав" };
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message };
  await prisma.region.update({ where: { id }, data: { name: parsed.data } });
  return ok();
}

export async function deleteRegion(id: string) {
  if (!(await director())) return { ok: false as const, error: "Недостаточно прав" };
  await prisma.region.delete({ where: { id } });
  return ok();
}

export async function setRegionManagers(regionId: string, userIds: string[]) {
  if (!(await director())) return { ok: false as const, error: "Недостаточно прав" };
  await prisma.region.update({
    where: { id: regionId },
    data: { managers: { set: userIds.map((id) => ({ id })) } },
  });
  return ok();
}

// ----- Groups -----

export async function createGroup(name: string, regionId: string | null) {
  const user = await requireUser();
  if (!(await canManageRegion(user, regionId))) return { ok: false as const, error: "Недостаточно прав" };
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message };
  await prisma.group.create({ data: { name: parsed.data, regionId: regionId || null } });
  return ok();
}

export async function renameGroup(id: string, name: string) {
  const user = await requireUser();
  const g = await groupRegion(id);
  if (!g || !(await canManageGroup(user, g))) return { ok: false as const, error: "Недостаточно прав" };
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message };
  await prisma.group.update({ where: { id }, data: { name: parsed.data } });
  return ok();
}

export async function deleteGroup(id: string) {
  const user = await requireUser();
  const g = await groupRegion(id);
  if (!g || !(await canManageGroup(user, g))) return { ok: false as const, error: "Недостаточно прав" };
  await prisma.group.delete({ where: { id } });
  return ok();
}

export async function setGroupMembers(groupId: string, userIds: string[]) {
  const user = await requireUser();
  const g = await groupRegion(groupId);
  if (!g || !(await canManageGroup(user, g))) return { ok: false as const, error: "Недостаточно прав" };
  await prisma.group.update({
    where: { id: groupId },
    data: { members: { set: userIds.map((id) => ({ id })) } },
  });
  return ok();
}

export async function setGroupBoards(groupId: string, boardIds: string[]) {
  const user = await requireUser();
  const g = await groupRegion(groupId);
  if (!g || !(await canManageGroup(user, g))) return { ok: false as const, error: "Недостаточно прав" };
  await prisma.group.update({
    where: { id: groupId },
    data: { boards: { set: boardIds.map((id) => ({ id })) } },
  });
  return ok();
}

/** Invite link that grants «Линейный» + adds the joiner to this group. */
export async function createGroupInvite(groupId: string) {
  const user = await requireUser();
  const g = await groupRegion(groupId);
  if (!g || !(await canManageGroup(user, g))) return { ok: false as const, error: "Недостаточно прав" };
  const token = makeInviteToken("MEMBER", 7, groupId);
  const base = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { name: true } });
  await recordAudit({ actorId: user.id, action: "GROUP_INVITE_CREATED", detail: group?.name ?? null });
  return { ok: true as const, url: `${base}/join/${token}` };
}

// ----- iiko sales points (Restaurant) — director-configured -----

const deptSchema = z.string().trim().min(1, "Укажите ID точки iiko").max(120);

export async function createRestaurant(name: string, regionId: string, iikoDepartmentId: string) {
  if (!(await director())) return { ok: false as const, error: "Недостаточно прав" };
  const n = nameSchema.safeParse(name);
  if (!n.success) return { ok: false as const, error: n.error.issues[0]?.message };
  const d = deptSchema.safeParse(iikoDepartmentId);
  if (!d.success) return { ok: false as const, error: d.error.issues[0]?.message };
  if (!regionId) return { ok: false as const, error: "Выберите регион" };
  try {
    await prisma.restaurant.create({ data: { name: n.data, regionId, iikoDepartmentId: d.data } });
  } catch {
    return { ok: false as const, error: "Эта точка iiko уже привязана" };
  }
  return ok();
}

export async function updateRestaurant(
  id: string,
  data: { name?: string; regionId?: string; iikoDepartmentId?: string; active?: boolean },
) {
  if (!(await director())) return { ok: false as const, error: "Недостаточно прав" };
  const patch: Record<string, unknown> = {};
  if (data.name !== undefined) {
    const n = nameSchema.safeParse(data.name);
    if (!n.success) return { ok: false as const, error: n.error.issues[0]?.message };
    patch.name = n.data;
  }
  if (data.iikoDepartmentId !== undefined) {
    const d = deptSchema.safeParse(data.iikoDepartmentId);
    if (!d.success) return { ok: false as const, error: d.error.issues[0]?.message };
    patch.iikoDepartmentId = d.data;
  }
  if (data.regionId !== undefined) patch.regionId = data.regionId;
  if (data.active !== undefined) patch.active = data.active;
  try {
    await prisma.restaurant.update({ where: { id }, data: patch });
  } catch {
    return { ok: false as const, error: "Эта точка iiko уже привязана к другой точке" };
  }
  return ok();
}

export async function deleteRestaurant(id: string) {
  if (!(await director())) return { ok: false as const, error: "Недостаточно прав" };
  await prisma.restaurant.delete({ where: { id } });
  return ok();
}
