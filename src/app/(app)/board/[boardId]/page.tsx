import { notFound } from "next/navigation";
import { isDirector, isRegional } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { makeBoardLinkCode } from "@/lib/board-link";
import { getBoard, getBoardOptions } from "@/lib/board-data";
import { listManageableRegions } from "@/lib/org-data";
import { BoardView } from "../BoardView";

export const dynamic = "force-dynamic";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  const user = await requireUser();
  const canCreate = isDirector(user) || isRegional(user);
  const [board, boards, regions] = await Promise.all([
    getBoard(user, boardId),
    getBoardOptions(user),
    canCreate ? listManageableRegions(user) : Promise.resolve([]),
  ]);

  if (!board) notFound();

  // Board participants = distinct assignees across the board.
  const memberNames = [
    ...new Set(
      board.columns.flatMap((c) => c.tasks.map((t) => t.assignee?.name).filter(Boolean) as string[]),
    ),
  ];

  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  const tgLink =
    canCreate && botUsername
      ? { code: makeBoardLinkCode(board.id), botUsername, linked: Boolean(board.telegramChatId) }
      : null;

  return (
    <BoardView
      board={board}
      boards={boards}
      regions={regions}
      memberNames={memberNames}
      canCreate={canCreate}
      tgLink={tgLink}
    />
  );
}
