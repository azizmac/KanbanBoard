"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function setNotifyPaused(paused: boolean) {
  const user = await requireUser();
  await prisma.user.update({ where: { id: user.id }, data: { notifyPaused: paused } });
  revalidatePath("/profile");
  return { ok: true as const };
}

/** Set (or clear) the do-not-disturb window. Both hours, or neither. */
export async function setQuietHours(start: number | null, end: number | null) {
  const user = await requireUser();
  const norm = (h: number | null) => (h != null && h >= 0 && h <= 23 ? Math.floor(h) : null);
  const s = norm(start);
  const e = norm(end);
  const both = s != null && e != null;
  await prisma.user.update({
    where: { id: user.id },
    data: { quietStart: both ? s : null, quietEnd: both ? e : null },
  });
  revalidatePath("/profile");
  return { ok: true as const };
}

/** Mute/unmute a board's external pings for the current user (personal). */
export async function toggleBoardMute(boardId: string) {
  const user = await requireUser();
  const isMuted = await prisma.user.count({
    where: { id: user.id, mutedBoards: { some: { id: boardId } } },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: isMuted
      ? { mutedBoards: { disconnect: { id: boardId } } }
      : { mutedBoards: { connect: { id: boardId } } },
  });
  revalidatePath("/board/[boardId]", "page");
  return { ok: true as const, muted: !isMuted };
}
