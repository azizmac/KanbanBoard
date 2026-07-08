"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyChatUsers } from "@/lib/realtime";
import { deleteStoredFile } from "@/lib/storage";
import type { ChatMemberRole } from "@/generated/prisma/client";

// ---------- helpers ----------

async function membership(chatId: string, userId: string) {
  return prisma.chatMember.findUnique({
    where: { chatId_userId: { chatId, userId } },
    include: { chat: { select: { id: true, type: true, name: true } } },
  });
}

async function chatMemberIds(chatId: string): Promise<string[]> {
  const rows = await prisma.chatMember.findMany({ where: { chatId }, select: { userId: true } });
  return rows.map((r) => r.userId);
}

async function broadcast(chatId: string) {
  await notifyChatUsers(await chatMemberIds(chatId), "change");
  revalidatePath("/chat", "layout");
}

const canManageGroup = (role: ChatMemberRole) => role === "OWNER" || role === "ADMIN";

// ---------- chats ----------

/** Open (or create) the direct chat with another user. */
export async function openDirectChat(otherUserId: string) {
  const user = await requireUser();
  if (!otherUserId || otherUserId === user.id) return { ok: false as const, error: "Ошибка" };
  const other = await prisma.user.findUnique({ where: { id: otherUserId } });
  if (!other || !other.active) return { ok: false as const, error: "Пользователь не найден" };

  const directKey = [user.id, other.id].sort().join(":");
  const existing = await prisma.chat.findUnique({ where: { directKey } });
  if (existing) return { ok: true as const, id: existing.id };

  const chat = await prisma.chat.create({
    data: {
      type: "DIRECT",
      directKey,
      members: {
        create: [
          { userId: user.id, role: "MEMBER" },
          { userId: other.id, role: "MEMBER" },
        ],
      },
    },
  });
  await broadcast(chat.id);
  return { ok: true as const, id: chat.id };
}

const groupSchema = z.object({
  name: z.string().trim().min(1, "Введите название").max(120),
  memberIds: z.array(z.string().min(1)).min(1, "Добавьте хотя бы одного участника"),
});

export async function createGroup(input: z.input<typeof groupSchema>) {
  const user = await requireUser();
  const parsed = groupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Ошибка" };
  }
  const ids = [...new Set(parsed.data.memberIds)].filter((id) => id !== user.id);
  const users = await prisma.user.findMany({ where: { id: { in: ids }, active: true } });
  if (users.length === 0) return { ok: false as const, error: "Добавьте хотя бы одного участника" };

  const chat = await prisma.chat.create({
    data: {
      type: "GROUP",
      name: parsed.data.name,
      members: {
        create: [
          { userId: user.id, role: "OWNER" },
          ...users.map((u) => ({ userId: u.id, role: "MEMBER" as const })),
        ],
      },
    },
  });
  await broadcast(chat.id);
  return { ok: true as const, id: chat.id };
}

export async function addGroupMembers(input: { chatId: string; userIds: string[] }) {
  const user = await requireUser();
  const me = await membership(input.chatId, user.id);
  if (!me || me.chat.type !== "GROUP" || !canManageGroup(me.role)) {
    return { ok: false as const, error: "Нет прав" };
  }
  const ids = [...new Set(input.userIds)].filter(Boolean);
  const users = await prisma.user.findMany({ where: { id: { in: ids }, active: true } });
  if (users.length === 0) return { ok: false as const, error: "Никого не выбрано" };

  await prisma.chatMember.createMany({
    data: users.map((u) => ({ chatId: input.chatId, userId: u.id })),
    skipDuplicates: true,
  });
  await broadcast(input.chatId);
  return { ok: true as const };
}

export async function leaveGroup(chatId: string) {
  const user = await requireUser();
  const me = await membership(chatId, user.id);
  if (!me || me.chat.type !== "GROUP") return { ok: false as const, error: "Ошибка" };
  if (me.role === "OWNER") {
    return { ok: false as const, error: "Владелец не может покинуть группу" };
  }
  const others = (await chatMemberIds(chatId)).filter((id) => id !== user.id);
  await prisma.chatMember.delete({ where: { chatId_userId: { chatId, userId: user.id } } });
  await notifyChatUsers([...others, user.id], "change");
  revalidatePath("/chat", "layout");
  return { ok: true as const };
}

/** Pin/unpin the chat at the top of my list. */
export async function toggleChatPinned(chatId: string) {
  const user = await requireUser();
  const me = await membership(chatId, user.id);
  if (!me) return { ok: false as const };
  await prisma.chatMember.update({
    where: { chatId_userId: { chatId, userId: user.id } },
    data: { pinned: !me.pinned },
  });
  await notifyChatUsers([user.id], "change");
  revalidatePath("/chat", "layout");
  return { ok: true as const };
}

/** Mark the whole chat as read (updates read receipts for others). */
export async function markChatRead(chatId: string) {
  const user = await requireUser();
  const me = await membership(chatId, user.id);
  if (!me) return { ok: false as const };
  await prisma.chatMember.update({
    where: { chatId_userId: { chatId, userId: user.id } },
    data: { lastReadAt: new Date() },
  });
  // others refresh so «✓» flips to «✓✓»; skip self to avoid a refresh loop
  await notifyChatUsers((await chatMemberIds(chatId)).filter((id) => id !== user.id), "change");
  return { ok: true as const };
}

/** Ephemeral typing signal — no DB write. */
export async function notifyTyping(chatId: string) {
  const user = await requireUser();
  const me = await membership(chatId, user.id);
  if (!me) return { ok: false as const };
  const firstName = user.name.split(/\s+/)[0] ?? user.name;
  const others = (await chatMemberIds(chatId)).filter((id) => id !== user.id);
  await notifyChatUsers(others, `typing:${chatId}:${firstName}`);
  return { ok: true as const };
}

// ---------- messages ----------

const sendSchema = z.object({
  chatId: z.string().min(1),
  body: z.string().trim().min(1).max(4000),
  replyToId: z.string().min(1).optional(),
});

export async function sendMessage(input: z.input<typeof sendSchema>) {
  const user = await requireUser();
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Пустое сообщение" };
  const me = await membership(parsed.data.chatId, user.id);
  if (!me) return { ok: false as const, error: "Нет доступа" };

  if (parsed.data.replyToId) {
    const target = await prisma.chatMessage.findUnique({ where: { id: parsed.data.replyToId } });
    if (!target || target.chatId !== parsed.data.chatId) {
      return { ok: false as const, error: "Сообщение не найдено" };
    }
  }

  const msg = await prisma.chatMessage.create({
    data: {
      chatId: parsed.data.chatId,
      authorId: user.id,
      body: parsed.data.body,
      replyToId: parsed.data.replyToId,
    },
  });
  await prisma.chatMember.update({
    where: { chatId_userId: { chatId: parsed.data.chatId, userId: user.id } },
    data: { lastReadAt: new Date() },
  });
  await broadcast(parsed.data.chatId);
  return { ok: true as const, id: msg.id };
}

const editSchema = z.object({
  messageId: z.string().min(1),
  body: z.string().trim().min(1).max(4000),
});

export async function editMessage(input: z.input<typeof editSchema>) {
  const user = await requireUser();
  const parsed = editSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Пустое сообщение" };
  const msg = await prisma.chatMessage.findUnique({ where: { id: parsed.data.messageId } });
  if (!msg || msg.authorId !== user.id) return { ok: false as const, error: "Нет прав" };

  await prisma.chatMessage.update({
    where: { id: msg.id },
    data: { body: parsed.data.body, editedAt: new Date() },
  });
  await broadcast(msg.chatId);
  return { ok: true as const };
}

export async function deleteMessage(messageId: string) {
  const user = await requireUser();
  const msg = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    include: { attachments: true },
  });
  if (!msg) return { ok: false as const };
  const me = await membership(msg.chatId, user.id);
  if (!me) return { ok: false as const };
  const allowed = msg.authorId === user.id || (me.chat.type === "GROUP" && canManageGroup(me.role));
  if (!allowed) return { ok: false as const, error: "Нет прав" };

  await prisma.chatMessage.delete({ where: { id: messageId } });
  for (const att of msg.attachments) await deleteStoredFile(att.storedName);
  await broadcast(msg.chatId);
  return { ok: true as const };
}

export async function pinMessage(messageId: string) {
  const user = await requireUser();
  const msg = await prisma.chatMessage.findUnique({ where: { id: messageId } });
  if (!msg) return { ok: false as const };
  const me = await membership(msg.chatId, user.id);
  if (!me) return { ok: false as const };

  await prisma.chat.update({ where: { id: msg.chatId }, data: { pinnedMessageId: messageId } });
  await broadcast(msg.chatId);
  return { ok: true as const };
}

export async function unpinMessage(chatId: string) {
  const user = await requireUser();
  const me = await membership(chatId, user.id);
  if (!me) return { ok: false as const };
  await prisma.chat.update({ where: { id: chatId }, data: { pinnedMessageId: null } });
  await broadcast(chatId);
  return { ok: true as const };
}

const REACTIONS = ["👍", "❤️", "🔥", "😂", "😮", "🙏"];

export async function toggleReaction(input: { messageId: string; emoji: string }) {
  const user = await requireUser();
  if (!REACTIONS.includes(input.emoji)) return { ok: false as const };
  const msg = await prisma.chatMessage.findUnique({ where: { id: input.messageId } });
  if (!msg) return { ok: false as const };
  const me = await membership(msg.chatId, user.id);
  if (!me) return { ok: false as const };

  const existing = await prisma.chatReaction.findUnique({
    where: {
      messageId_userId_emoji: { messageId: input.messageId, userId: user.id, emoji: input.emoji },
    },
  });
  if (existing) {
    await prisma.chatReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.chatReaction.create({
      data: { messageId: input.messageId, userId: user.id, emoji: input.emoji },
    });
  }
  await broadcast(msg.chatId);
  return { ok: true as const };
}

const forwardSchema = z.object({
  messageId: z.string().min(1),
  chatIds: z.array(z.string().min(1)).min(1),
});

/** Forward a message into one or more of my chats (label keeps the source). */
export async function forwardMessage(input: z.input<typeof forwardSchema>) {
  const user = await requireUser();
  const parsed = forwardSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Выберите чат" };

  const msg = await prisma.chatMessage.findUnique({
    where: { id: parsed.data.messageId },
    include: {
      author: { select: { name: true } },
      chat: { select: { id: true, type: true, name: true } },
    },
  });
  if (!msg) return { ok: false as const, error: "Сообщение не найдено" };
  if (!(await membership(msg.chatId, user.id))) return { ok: false as const, error: "Нет доступа" };

  const sourceLabel = msg.chat.type === "GROUP" ? `«${msg.chat.name ?? "Группа"}»` : msg.author.name;

  let sent = 0;
  for (const chatId of [...new Set(parsed.data.chatIds)]) {
    const me = await membership(chatId, user.id);
    if (!me) continue;
    await prisma.chatMessage.create({
      data: {
        chatId,
        authorId: user.id,
        body: msg.body,
        forwardedFrom: sourceLabel,
      },
    });
    await prisma.chatMember.update({
      where: { chatId_userId: { chatId, userId: user.id } },
      data: { lastReadAt: new Date() },
    });
    await broadcast(chatId);
    sent++;
  }
  if (sent === 0) return { ok: false as const, error: "Нет доступа к выбранным чатам" };
  return { ok: true as const, sent };
}
