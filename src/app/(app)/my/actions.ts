"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function markNotificationRead(id: string) {
  const user = await requireUser();
  await prisma.notification.updateMany({ where: { id, userId: user.id }, data: { read: true } });
  revalidatePath("/my");
  return { ok: true as const };
}

export async function markAllNotificationsRead() {
  const user = await requireUser();
  await prisma.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
  revalidatePath("/my");
  return { ok: true as const };
}
