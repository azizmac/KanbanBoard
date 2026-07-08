import { randomUUID } from "node:crypto";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyChatUsers } from "@/lib/realtime";
import { saveFile } from "@/lib/storage";

// Send a message with file attachments (multipart). Text-only messages go
// through the sendMessage server action; this route exists because files
// upload as FormData.
export const runtime = "nodejs";

const MAX_FILE = 20 * 1024 * 1024; // 20 MB, same as task attachments
const MAX_FILES = 10;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ chatId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const { chatId } = await ctx.params;
  const member = await prisma.chatMember.findUnique({
    where: { chatId_userId: { chatId, userId: user.id } },
  });
  if (!member) return NextResponse.json({ error: "Нет доступа" }, { status: 403 });

  const form = await req.formData();
  const body = String(form.get("body") ?? "").trim().slice(0, 4000);
  const replyToId = String(form.get("replyToId") ?? "") || null;
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length === 0 && !body) {
    return NextResponse.json({ error: "Пустое сообщение" }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Не больше ${MAX_FILES} файлов за раз` }, { status: 400 });
  }
  for (const f of files) {
    if (f.size > MAX_FILE) {
      return NextResponse.json({ error: `«${f.name}» больше 20 МБ` }, { status: 413 });
    }
  }

  if (replyToId) {
    const target = await prisma.chatMessage.findUnique({ where: { id: replyToId } });
    if (!target || target.chatId !== chatId) {
      return NextResponse.json({ error: "Сообщение не найдено" }, { status: 400 });
    }
  }

  const stored: { filename: string; storedName: string; mimeType: string; size: number }[] = [];
  for (const f of files) {
    const ext = path.extname(f.name).slice(0, 12);
    // flat key: the local-disk backend writes storedName directly into UPLOAD_DIR
    const storedName = `chat-${randomUUID()}${ext}`;
    await saveFile(storedName, Buffer.from(await f.arrayBuffer()), f.type || "application/octet-stream");
    stored.push({
      filename: f.name.slice(0, 255),
      storedName,
      mimeType: f.type || "application/octet-stream",
      size: f.size,
    });
  }

  const msg = await prisma.chatMessage.create({
    data: {
      chatId,
      authorId: user.id,
      body,
      replyToId,
      attachments: { create: stored },
    },
  });
  await prisma.chatMember.update({
    where: { chatId_userId: { chatId, userId: user.id } },
    data: { lastReadAt: new Date() },
  });

  const members = await prisma.chatMember.findMany({ where: { chatId }, select: { userId: true } });
  await notifyChatUsers(members.map((m) => m.userId), "change");

  return NextResponse.json({ ok: true, id: msg.id });
}
