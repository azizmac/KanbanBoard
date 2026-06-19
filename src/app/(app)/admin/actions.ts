"use server";

import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
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

/** Generate a shareable invite link. Opening it lets the next Telegram login
 *  self-provision with the given role (default MEMBER = basic access). */
export async function createInviteLink(role: "MEMBER" | "MANAGER" = "MEMBER") {
  const admin = await currentAdmin();
  if (!admin) return { ok: false as const, error: "Недостаточно прав" };

  const token = makeInviteToken(role, 7);
  const base = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
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

  // Lockout protection: can't strip your own admin or deactivate yourself.
  if (userId === admin.id) {
    if ((data.role && data.role !== "ADMIN") || data.active === false) {
      return { ok: false as const, error: "Нельзя снять права или деактивировать себя" };
    }
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

  // Revoke sessions on deactivation so access is cut immediately.
  if (data.active === false) {
    await prisma.session.deleteMany({ where: { userId } });
  }

  revalidatePath("/admin");
  revalidatePath("/team");
  return { ok: true as const };
}
