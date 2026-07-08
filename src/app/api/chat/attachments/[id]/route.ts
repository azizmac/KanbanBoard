import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/lib/storage";

// Download a chat attachment — chat members only.
export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const { id } = await ctx.params;
  const att = await prisma.chatAttachment.findUnique({
    where: { id },
    include: { message: { select: { chatId: true } } },
  });
  if (!att) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  const member = await prisma.chatMember.findUnique({
    where: { chatId_userId: { chatId: att.message.chatId, userId: user.id } },
  });
  if (!member) return NextResponse.json({ error: "Нет доступа" }, { status: 403 });

  try {
    const data = await readStoredFile(att.storedName);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": att.mimeType,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(att.filename)}`,
        "Content-Length": String(att.size),
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Файл отсутствует в хранилище" }, { status: 410 });
  }
}
