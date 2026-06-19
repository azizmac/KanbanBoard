import { randomUUID } from "node:crypto";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { recordActivity } from "@/lib/activity";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveFile } from "@/lib/storage";

export const runtime = "nodejs";

const MAX = 20 * 1024 * 1024; // 20 MB

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ taskId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const { taskId } = await ctx.params;
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
  }
  if (file.size > MAX) {
    return NextResponse.json({ error: "Файл больше 20 МБ" }, { status: 413 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name).slice(0, 12);
  const storedName = `${randomUUID()}${ext}`;
  await saveFile(storedName, buf, file.type || "application/octet-stream");

  const att = await prisma.attachment.create({
    data: {
      taskId,
      filename: file.name.slice(0, 255),
      storedName,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      uploaderId: user.id,
    },
  });
  await recordActivity(taskId, user.id, "ATTACHMENT_ADDED", att.filename);

  return NextResponse.json({
    ok: true,
    attachment: {
      id: att.id,
      filename: att.filename,
      size: att.size,
      mimeType: att.mimeType,
      createdAt: att.createdAt.toISOString(),
      uploader: { id: user.id, name: user.name },
    },
  });
}
