import { notFound } from "next/navigation";
import { can, requireUser } from "@/lib/auth";
import { getBoard, getBoardOptions } from "@/lib/board-data";
import { BoardView } from "../BoardView";

export const dynamic = "force-dynamic";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  const [user, board, boards] = await Promise.all([
    requireUser(),
    getBoard(boardId),
    getBoardOptions(),
  ]);

  if (!board) notFound();

  // Board participants = distinct assignees across the board.
  const memberNames = [
    ...new Set(
      board.columns.flatMap((c) => c.tasks.map((t) => t.assignee?.name).filter(Boolean) as string[]),
    ),
  ];

  return (
    <BoardView
      board={board}
      boards={boards}
      memberNames={memberNames}
      canCreate={can(user, "manageBoard")}
    />
  );
}
