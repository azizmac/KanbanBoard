"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canManageOrg } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function director() {
  const user = await requireUser();
  return canManageOrg(user) ? user : null;
}

const nameSchema = z.string().trim().min(1, "Введите название").max(80);

function ok() {
  revalidatePath("/admin/org");
  revalidatePath("/boards");
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
  if (!(await director())) return { ok: false as const, error: "Недостаточно прав" };
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message };
  await prisma.group.create({ data: { name: parsed.data, regionId: regionId || null } });
  return ok();
}

export async function renameGroup(id: string, name: string) {
  if (!(await director())) return { ok: false as const, error: "Недостаточно прав" };
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message };
  await prisma.group.update({ where: { id }, data: { name: parsed.data } });
  return ok();
}

export async function deleteGroup(id: string) {
  if (!(await director())) return { ok: false as const, error: "Недостаточно прав" };
  await prisma.group.delete({ where: { id } });
  return ok();
}

export async function setGroupMembers(groupId: string, userIds: string[]) {
  if (!(await director())) return { ok: false as const, error: "Недостаточно прав" };
  await prisma.group.update({
    where: { id: groupId },
    data: { members: { set: userIds.map((id) => ({ id })) } },
  });
  return ok();
}

export async function setGroupBoards(groupId: string, boardIds: string[]) {
  if (!(await director())) return { ok: false as const, error: "Недостаточно прав" };
  await prisma.group.update({
    where: { id: groupId },
    data: { boards: { set: boardIds.map((id) => ({ id })) } },
  });
  return ok();
}
