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

  const total = board.columns.reduce((n, c) => n + c.tasks.length, 0);
  const inProgress = board.columns.find((c) => c.name.includes("работе"))?.tasks.length ?? 0;

  return (
    <div className="mx-auto max-w-[1400px] px-5 pt-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-[var(--color-accent)] text-sm font-bold text-white">
          {board.name.charAt(0)}
        </span>
        <div>
          <h1 className="text-[25px] font-bold leading-none tracking-[-0.03em]">{board.name}</h1>
          <p className="mt-1 font-mono text-xs text-[var(--color-muted)]">
            {total} задач · {inProgress} в работе
          </p>
        </div>
      </div>
      <BoardView board={board} />
    </div>
  );
}
