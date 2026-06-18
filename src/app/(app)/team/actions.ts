"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegram } from "@/lib/telegram";

export async function unlinkTelegram() {
  const user = await requireUser();
  await prisma.user.update({ where: { id: user.id }, data: { telegramId: null } });
  revalidatePath("/team");
  return { ok: true as const };
}

export async function sendTestNotification() {
  const user = await requireUser();
  if (!user.telegramId) return { ok: false as const, error: "Telegram не подключён" };
  const ok = await sendTelegram(
    user.telegramId,
    "🔔 Тестовое уведомление из <b>Kanban Tracker</b>. Связь работает!",
  );
  return ok
    ? { ok: true as const }
    : { ok: false as const, error: "Не удалось отправить сообщение" };
}
