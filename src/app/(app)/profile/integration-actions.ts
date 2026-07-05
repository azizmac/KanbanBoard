"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canCreateWebhookToken } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { newWebhookToken } from "@/lib/webhook-token";

const labelSchema = z.string().trim().min(1, "Введите название").max(40);
const MAX_ACTIVE_TOKENS = 10;

/** Mint a personal webhook token. Director/regional only. The plaintext is
 *  returned ONCE (never stored) — the caller must show it and let the user copy. */
export async function createWebhookToken(label: string) {
  const user = await requireUser();
  if (!canCreateWebhookToken(user)) return { ok: false as const, error: "Недостаточно прав" };
  const parsed = labelSchema.safeParse(label);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message };

  const active = await prisma.webhookToken.count({ where: { userId: user.id, revokedAt: null } });
  if (active >= MAX_ACTIVE_TOKENS) {
    return { ok: false as const, error: "Слишком много активных токенов — отзови ненужные" };
  }

  const { plain, hash } = newWebhookToken();
  await prisma.webhookToken.create({ data: { label: parsed.data, tokenHash: hash, userId: user.id } });
  revalidatePath("/profile");
  return { ok: true as const, token: plain };
}

/** Revoke one of the caller's own tokens. */
export async function revokeWebhookToken(id: string) {
  const user = await requireUser();
  const tok = await prisma.webhookToken.findUnique({ where: { id }, select: { userId: true } });
  if (!tok || tok.userId !== user.id) return { ok: false as const, error: "Токен не найден" };
  await prisma.webhookToken.update({ where: { id }, data: { revokedAt: new Date() } });
  revalidatePath("/profile");
  return { ok: true as const };
}
