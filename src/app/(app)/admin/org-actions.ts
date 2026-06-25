"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Role } from "@/generated/prisma/client";
import { canAssignRole, canManageGroup, canManageOrg, canManageRegion } from "@/lib/access";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { listSalesPoints, parseIikoPoint } from "@/lib/iiko/client";
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

// Colours cycled across auto-created regions, for visual variety.
const REGION_PALETTE = ["iris", "blue", "green", "amber", "pink", "purple", "gray"];

/** Bulk-onboard iiko sales points as restaurants. The region is derived from the
 *  city embedded in each point's name (see parseIikoPoint), auto-creating regions
 *  as needed. `jurFilter` restricts to one legal entity so a shared/franchise iiko
 *  doesn't pull in other tenants' points; falls back to IIKO_JURPERSON_FILTER.
 *  Idempotent: points already linked (by iikoDepartmentId) are skipped, so it
 *  doubles as a "sync" — re-running only adds what's new. Director only. */
export async function importRestaurantsFromIiko(jurFilterRaw: string) {
  const actor = await director();
  if (!actor) return { ok: false as const, error: "Недостаточно прав" };
  const filter = (jurFilterRaw || process.env.IIKO_JURPERSON_FILTER || "").trim();
  if (!filter) {
    return { ok: false as const, error: "Укажите юрлицо (напр. «ФРЕШ ДВ») — иначе подтянутся чужие точки франшизы" };
  }

  let points;
  try {
    points = await listSalesPoints();
  } catch (e) {
    return { ok: false as const, error: "iiko недоступна: " + (e as Error).message };
  }

  const needle = filter.toLowerCase();
  const mine = points.filter((p) => !p.disabled && p.jur && p.jur.toLowerCase().includes(needle));
  if (mine.length === 0) return { ok: false as const, error: `Активных точек под «${filter}» не найдено` };

  const existing = new Set(
    (await prisma.restaurant.findMany({ select: { iikoDepartmentId: true } })).map((r) => r.iikoDepartmentId),
  );
  const regionByName = new Map(
    (await prisma.region.findMany({ select: { id: true, name: true } })).map((r) => [r.name.trim().toLowerCase(), r.id]),
  );

  let added = 0;
  let skipped = 0;
  let newRegions = 0;
  for (const p of mine) {
    if (existing.has(p.name)) {
      skipped++;
      continue;
    }
    const { city, point } = parseIikoPoint(p.name);
    const regionLabel = city ?? "Прочее"; // Restaurant.regionId is required — unparsed points land in «Прочее»
    let regionId = regionByName.get(regionLabel.toLowerCase());
    if (!regionId) {
      const created = await prisma.region.create({
        data: { name: regionLabel, color: REGION_PALETTE[newRegions % REGION_PALETTE.length] },
      });
      regionId = created.id;
      regionByName.set(regionLabel.toLowerCase(), regionId);
      newRegions++;
    }
    const displayName = (city ? `${city} · ${point}` : point).slice(0, 80);
    try {
      await prisma.restaurant.create({ data: { name: displayName, regionId, iikoDepartmentId: p.name } });
      existing.add(p.name);
      added++;
    } catch {
      skipped++; // unique-constraint race or bad row — don't abort the whole import
    }
  }

  await recordAudit({
    actorId: actor.id,
    action: "IIKO_IMPORT",
    detail: `+${added} точек, +${newRegions} регионов (фильтр: ${filter})`,
  });
  revalidatePath("/admin/org");
  revalidatePath("/boards");
  return { ok: true as const, summary: { added, skipped, newRegions, total: mine.length } };
}
