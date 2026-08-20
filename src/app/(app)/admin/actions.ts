"use server";

import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canAssignRole, canManageUser, canRunRegion } from "@/lib/access";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { roleLabels } from "@/lib/constants";
import { makeInviteToken } from "@/lib/invite";
import { prisma } from "@/lib/prisma";

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** "Secret door": promote the current user to ADMIN with the shared secret. */
export async function unlockAdmin(secret: string) {
  const user = await requireUser();
  const expected = process.env.ADMIN_SECRET;
  if (!expected || !safeEqual(secret, expected)) {
    return { ok: false as const, error: "Неверный секрет" };
  }
  if (user.role !== "ADMIN") {
    await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  }
  revalidatePath("/admin");
  return { ok: true as const };
}

async function currentAdmin() {
  const user = await requireUser();
  return user.role === "ADMIN" ? user : null;
}

/** Director or regional who may invite below their tier. */
async function currentInviter() {
  const user = await requireUser();
  return canRunRegion(user) ? user : null;
}

/** Generate a shareable invite link. Opening it lets the next Telegram login
 *  self-provision with the given role (default MEMBER = basic access).
 *  Regionals may only mint «Линейный» links. */
export async function createInviteLink(role: "MEMBER" | "MANAGER" | "ADMIN" = "MEMBER") {
  const admin = await currentInviter();
  if (!admin) return { ok: false as const, error: "Недостаточно прав" };
  if (!canAssignRole(admin, role)) {
    return { ok: false as const, error: "Нельзя выдавать роль на своём уровне или выше" };
  }

  const token = makeInviteToken(role, 7);
  const base = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  await recordAudit({ actorId: admin.id, action: "INVITE_CREATED", detail: roleLabels[role] });
  return { ok: true as const, url: `${base}/join/${token}`, role, days: 7 };
}

const roleEnum = z.enum(["ADMIN", "MANAGER", "MEMBER"]);
const handle = z
  .string()
  .trim()
  .regex(/^[a-zA-Z0-9_]{2,32}$/, "Логин: 2–32 символа (латиница, цифры, _)");

const addSchema = z.object({
  name: z.string().trim().min(1, "Укажите имя").max(120),
  username: z.union([handle, z.literal("")]).optional(),
  role: roleEnum,
  position: z.string().trim().max(120).optional(),
  managerId: z.string().optional(),
});

export async function addUser(input: z.input<typeof addSchema>) {
  const admin = await currentAdmin();
  if (!admin) return { ok: false as const, error: "Недостаточно прав" };

  const parsed = addSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Ошибка" };
  }
  const { name, username, role, position, managerId } = parsed.data;

  if (!canAssignRole(admin, role)) {
    return { ok: false as const, error: "Нельзя создавать пользователя с ролью на своём уровне или выше" };
  }

  if (username) {
    const exists = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
    });
    if (exists) return { ok: false as const, error: "Такой @username уже есть" };
  }

  const created = await prisma.user.create({
    data: {
      name,
      username: username || null,
      role,
      position: position || null,
      managerId: managerId || null,
    },
  });
  await recordAudit({
    actorId: admin.id,
    action: "USER_CREATED",
    targetUserId: created.id,
    detail: `${created.name} · ${roleLabels[created.role]}`,
  });

  revalidatePath("/admin");
  revalidatePath("/team");
  return {
    ok: true as const,
    user: {
      id: created.id,
      name: created.name,
      username: created.username,
      role: created.role,
      position: created.position,
      managerId: created.managerId,
      active: created.active,
      telegramLinked: Boolean(created.telegramId),
    },
  };
}

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  role: roleEnum.optional(),
  position: z.string().trim().max(120).nullable().optional(),
  managerId: z.string().nullable().optional(),
  active: z.boolean().optional(),
});

export async function updateUser(userId: string, input: z.input<typeof updateSchema>) {
  const admin = await currentAdmin();
  if (!admin) return { ok: false as const, error: "Недостаточно прав" };

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Некорректные данные" };
  const data = parsed.data;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, superAdmin: true, active: true },
  });
  if (!target) return { ok: false as const, error: "Пользователь не найден" };

  // Strict hierarchy: you may only change someone strictly below your tier. This
  // covers yourself, your peers, and the owner — none of which you can manage.
  if (!canManageUser(admin, target)) {
    return {
      ok: false as const,
      error: target.superAdmin
        ? "Владельца нельзя деактивировать или менять"
        : userId === admin.id
          ? "Нельзя менять собственные права или статус"
          : "Этого пользователя может менять только вышестоящий",
    };
  }
  // Promotion ceiling: never assign a role at your level or above.
  if (data.role !== undefined && !canAssignRole(admin, data.role)) {
    return { ok: false as const, error: "Нельзя назначить роль на своём уровне или выше" };
  }
  if (data.managerId && data.managerId === userId) {
    return { ok: false as const, error: "Пользователь не может быть своим руководителем" };
  }

  const patch: Record<string, unknown> = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.role !== undefined) patch.role = data.role;
  if (data.position !== undefined) patch.position = data.position || null;
  if (data.managerId !== undefined) patch.managerId = data.managerId || null;
  if (data.active !== undefined) patch.active = data.active;

  await prisma.user.update({ where: { id: userId }, data: patch });

  // Audit the sensitive changes (role / activation).
  if (data.role !== undefined && data.role !== target.role) {
    await recordAudit({
      actorId: admin.id,
      action: "USER_ROLE_CHANGED",
      targetUserId: userId,
      detail: `${roleLabels[target.role]} → ${roleLabels[data.role]}`,
    });
  }
  if (data.active !== undefined && data.active !== target.active) {
    await recordAudit({
      actorId: admin.id,
      action: data.active ? "USER_ACTIVATED" : "USER_DEACTIVATED",
      targetUserId: userId,
    });
  }

  // Revoke sessions on deactivation so access is cut immediately.
  if (data.active === false) {
    await prisma.session.deleteMany({ where: { userId } });
  }

  revalidatePath("/admin");
  revalidatePath("/team");
  return { ok: true as const };
}
