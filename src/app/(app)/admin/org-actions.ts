"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canManageGroup, canManageOrg, canManageRegion } from "@/lib/access";
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

// ----- Positions (справочник должностей) -----

export async function createPosition(name: string) {
  if (!(await director())) return { ok: false as const, error: "Недостаточно прав" };
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message };
  const exists = await prisma.position.findFirst({ where: { name: { equals: parsed.data, mode: "insensitive" } } });
  if (exists) return { ok: false as const, error: "Такая должность уже есть" };
  await prisma.position.create({ data: { name: parsed.data } });
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
  return { ok: true as const, url: `${base}/join/${token}` };
}
