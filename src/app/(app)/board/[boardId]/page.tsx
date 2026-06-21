import { notFound } from "next/navigation";
import { canManageBoard } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { makeBoardLinkCode } from "@/lib/board-link";
import { getBoard, getBoardOptions } from "@/lib/board-data";
import { listManageableRegions } from "@/lib/org-data";
import { prisma } from "@/lib/prisma";
import { BoardView } from "../BoardView";

export const dynamic = "force-dynamic";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  const user = await requireUser();
  const [board, boards, regions, meta, mutedCount] = await Promise.all([
    getBoard(user, boardId),
    getBoardOptions(user),
    listManageableRegions(user), // [] for staff → they create personal (region-less) boards
    prisma.board.findUnique({ where: { id: boardId }, select: { regionId: true, ownerId: true } }),
    prisma.user.count({ where: { id: user.id, mutedBoards: { some: { id: boardId } } } }),
  ]);

  if (!board) notFound();

  // Everyone can create a board (staff → personal). Telegram linking is gated to
  // whoever can manage THIS board.
  const canCreate = true;
  const canManage = meta ? await canManageBoard(user, meta) : false;

  // Board participants = distinct assignees across the board.
  const memberNames = [
    ...new Set(
      board.columns.flatMap((c) => c.tasks.map((t) => t.assignee?.name).filter(Boolean) as string[]),
    ),
  ];

  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  const tgLink =
    canManage && botUsername
      ? { code: makeBoardLinkCode(board.id), botUsername, linked: Boolean(board.telegramChatId) }
      : null;

  return (
    <BoardView
      board={board}
      boards={boards}
      regions={regions}
      memberNames={memberNames}
      canCreate={canCreate}
      canManage={canManage}
      muted={mutedCount > 0}
      tgLink={tgLink}
    />
  );
}
