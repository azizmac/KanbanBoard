import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const { id } = await ctx.params;
  const att = await prisma.attachment.findUnique({ where: { id } });
  if (!att) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  try {
    const data = await readStoredFile(att.storedName);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": att.mimeType,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(att.filename)}`,
        "Content-Length": String(att.size),
      },
    });
  } catch {
    return NextResponse.json({ error: "Файл отсутствует на диске" }, { status: 410 });
  }
}
