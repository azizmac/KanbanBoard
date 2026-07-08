// Data layer for the messenger («Чат»). Server-only: fetches via Prisma and
// serializes to plain DTOs (dates → ISO strings) for client components.
import { prisma } from "./prisma";

export type ChatPeer = {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  position: string | null;
};

export type ChatMemberDTO = ChatPeer & {
  role: "OWNER" | "ADMIN" | "MEMBER";
};

export type ChatListItem = {
  id: string;
  type: "DIRECT" | "GROUP";
  title: string; // group name or the peer's name
  color: string; // tint key for the group avatar
  peer: ChatPeer | null; // direct chats only
  memberCount: number;
  pinned: boolean; // pinned at the top of my list
  unread: number;
  lastMessage: {
    authorId: string;
    authorName: string;
    mine: boolean;
    read: boolean; // my message seen by someone else
    body: string; // preview text (attachment-only → file name)
    hasAttachment: boolean;
    createdAt: string;
  } | null;
};

export type ChatAttachmentDTO = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
};

export type ChatMessageDTO = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  body: string;
  createdAt: string;
  editedAt: string | null;
  forwardedFrom: string | null;
  replyTo: { id: string; authorName: string; body: string } | null;
  reactions: { emoji: string; count: number; mine: boolean; names: string[] }[];
  attachments: ChatAttachmentDTO[];
  mine: boolean;
  read: boolean; // for my messages: seen by at least one other member
};

export type ConversationDTO = {
  id: string;
  type: "DIRECT" | "GROUP";
  title: string;
  color: string;
  peer: ChatPeer | null;
  myRole: "OWNER" | "ADMIN" | "MEMBER";
  pinnedByMe: boolean;
  memberCount: number;
  members: ChatMemberDTO[];
  pinnedMessage: { id: string; authorName: string; body: string } | null;
  messages: ChatMessageDTO[];
  sharedFiles: (ChatAttachmentDTO & { authorName: string; createdAt: string })[];
};

/** Compact target for the forward dialog / new-message pickers. */
export type ChatTarget = {
  id: string;
  type: "DIRECT" | "GROUP";
  title: string;
  color: string;
  peer: ChatPeer | null;
};

function peerOf(
  members: { user: ChatPeer }[],
  meId: string,
): ChatPeer | null {
  const other = members.find((m) => m.user.id !== meId);
  return other ? other.user : null;
}

const USER_SELECT = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
  position: true,
} as const;

/** Per-chat unread counts for one user (messages after my lastReadAt, not mine). */
async function unreadByChat(userId: string): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<{ chatId: string; count: number }[]>`
    SELECT m."chatId" as "chatId", COUNT(*)::int as count
    FROM "ChatMessage" m
    JOIN "ChatMember" cm ON cm."chatId" = m."chatId" AND cm."userId" = ${userId}
    WHERE m."createdAt" > cm."lastReadAt" AND m."authorId" <> ${userId}
    GROUP BY m."chatId"`;
  return new Map(rows.map((r) => [r.chatId, r.count]));
}

/** Number of chats with unread messages — the nav badge. */
export async function getUnreadChatCount(userId: string): Promise<number> {
  const map = await unreadByChat(userId);
  return map.size;
}

export async function getChatList(userId: string): Promise<ChatListItem[]> {
  const [memberships, unread] = await Promise.all([
    prisma.chatMember.findMany({
      where: { userId },
      include: {
        chat: {
          include: {
            members: { select: { userId: true, lastReadAt: true, user: { select: USER_SELECT } } },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: {
                author: { select: { id: true, name: true } },
                attachments: { select: { id: true, filename: true }, take: 1 },
              },
            },
          },
        },
      },
    }),
    unreadByChat(userId),
  ]);

  const items = memberships.map((mem): ChatListItem => {
    const chat = mem.chat;
    const peer = chat.type === "DIRECT" ? peerOf(chat.members, userId) : null;
    const last = chat.messages[0] ?? null;
    let lastMessage: ChatListItem["lastMessage"] = null;
    if (last) {
      const mine = last.authorId === userId;
      const othersRead = chat.members.some(
        (m) => m.userId !== userId && m.lastReadAt >= last.createdAt,
      );
      lastMessage = {
        authorId: last.authorId,
        authorName: last.author.name.split(/\s+/)[0] ?? last.author.name,
        mine,
        read: mine && othersRead,
        body: last.body || (last.attachments[0] ? last.attachments[0].filename : ""),
        hasAttachment: last.attachments.length > 0,
        createdAt: last.createdAt.toISOString(),
      };
    }
    return {
      id: chat.id,
      type: chat.type,
      title: chat.type === "GROUP" ? (chat.name ?? "Группа") : (peer?.name ?? "Диалог"),
      color: chat.color,
      peer,
      memberCount: chat.members.length,
      pinned: mem.pinned,
      unread: unread.get(chat.id) ?? 0,
      lastMessage,
    };
  });

  // pinned first, then by last activity (chats without messages last)
  return items.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const ta = a.lastMessage?.createdAt ?? "";
    const tb = b.lastMessage?.createdAt ?? "";
    return tb.localeCompare(ta);
  });
}

/** Full conversation for /chat/[chatId]. Returns null unless the user is a member. */
export async function getConversation(
  chatId: string,
  userId: string,
): Promise<ConversationDTO | null> {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: {
      members: {
        orderBy: { joinedAt: "asc" },
        select: { userId: true, role: true, pinned: true, lastReadAt: true, user: { select: USER_SELECT } },
      },
      pinnedMessage: { include: { author: { select: { name: true } } } },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 300,
        include: {
          author: { select: USER_SELECT },
          replyTo: { include: { author: { select: { name: true } } } },
          reactions: { select: { emoji: true, userId: true, user: { select: { name: true } } } },
          attachments: { select: { id: true, filename: true, mimeType: true, size: true } },
        },
      },
    },
  });
  if (!chat) return null;
  const me = chat.members.find((m) => m.userId === userId);
  if (!me) return null;

  const maxOtherRead = chat.members.reduce<Date | null>((acc, m) => {
    if (m.userId === userId) return acc;
    return !acc || m.lastReadAt > acc ? m.lastReadAt : acc;
  }, null);

  const messages = chat.messages.map((msg): ChatMessageDTO => {
    // group reactions by emoji
    const byEmoji = new Map<string, { count: number; mine: boolean; names: string[] }>();
    for (const r of msg.reactions) {
      let g = byEmoji.get(r.emoji);
      if (!g) {
        g = { count: 0, mine: false, names: [] };
        byEmoji.set(r.emoji, g);
      }
      g.count++;
      if (r.userId === userId) g.mine = true;
      if (g.names.length < 6) g.names.push(r.user.name);
    }
    return {
      id: msg.id,
      authorId: msg.authorId,
      authorName: msg.author.name,
      authorAvatarUrl: msg.author.avatarUrl,
      body: msg.body,
      createdAt: msg.createdAt.toISOString(),
      editedAt: msg.editedAt ? msg.editedAt.toISOString() : null,
      forwardedFrom: msg.forwardedFrom,
      replyTo: msg.replyTo
        ? {
            id: msg.replyTo.id,
            authorName: msg.replyTo.author.name,
            body: msg.replyTo.body || "Вложение",
          }
        : null,
      reactions: [...byEmoji.entries()].map(([emoji, g]) => ({ emoji, ...g })),
      attachments: msg.attachments,
      mine: msg.authorId === userId,
      read: msg.authorId === userId && !!maxOtherRead && msg.createdAt <= maxOtherRead,
    };
  });

  const sharedFiles = await prisma.chatAttachment.findMany({
    where: { message: { chatId } },
    orderBy: { createdAt: "desc" },
    take: 12,
    include: { message: { select: { author: { select: { name: true } } } } },
  });

  const peer = chat.type === "DIRECT" ? peerOf(chat.members, userId) : null;

  return {
    id: chat.id,
    type: chat.type,
    title: chat.type === "GROUP" ? (chat.name ?? "Группа") : (peer?.name ?? "Диалог"),
    color: chat.color,
    peer,
    myRole: me.role,
    pinnedByMe: me.pinned,
    memberCount: chat.members.length,
    members: chat.members.map((m) => ({ ...m.user, role: m.role })),
    pinnedMessage: chat.pinnedMessage
      ? {
          id: chat.pinnedMessage.id,
          authorName: chat.pinnedMessage.author.name,
          body: chat.pinnedMessage.body || "Вложение",
        }
      : null,
    messages,
    sharedFiles: sharedFiles.map((f) => ({
      id: f.id,
      filename: f.filename,
      mimeType: f.mimeType,
      size: f.size,
      authorName: f.message.author.name.split(/\s+/)[0] ?? "",
      createdAt: f.createdAt.toISOString(),
    })),
  };
}

/** Active teammates (everyone except me) for new-chat / add-member pickers. */
export async function getChatPeople(userId: string): Promise<ChatPeer[]> {
  return prisma.user.findMany({
    where: { active: true, id: { not: userId } },
    orderBy: { name: "asc" },
    select: USER_SELECT,
  });
}

/** My chats as forward targets (compact). */
export async function getChatTargets(userId: string): Promise<ChatTarget[]> {
  const memberships = await prisma.chatMember.findMany({
    where: { userId },
    include: {
      chat: {
        include: { members: { select: { userId: true, user: { select: USER_SELECT } } } },
      },
    },
  });
  return memberships.map((mem) => {
    const peer = mem.chat.type === "DIRECT" ? peerOf(mem.chat.members, userId) : null;
    return {
      id: mem.chat.id,
      type: mem.chat.type,
      title: mem.chat.type === "GROUP" ? (mem.chat.name ?? "Группа") : (peer?.name ?? "Диалог"),
      color: mem.chat.color,
      peer,
    };
  });
}
