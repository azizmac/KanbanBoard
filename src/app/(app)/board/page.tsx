import { getBoard } from "@/lib/board-data";
import { BoardView } from "./BoardView";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const board = await getBoard();

  if (!board) {
    return (
      <div className="grid place-items-center p-16 text-center text-sm text-[var(--color-muted)]">
        Доска не найдена. Запустите <code className="mx-1 rounded bg-[var(--color-line)] px-1">npm run db:seed</code>.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="flex items-center justify-between px-4 pt-4">
        <h1 className="text-lg font-semibold tracking-tight">{board.name}</h1>
      </div>
      <BoardView board={board} />
    </div>
  );
}
