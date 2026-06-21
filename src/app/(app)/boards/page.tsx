import Link from "next/link";
import { AvatarStack } from "@/components/Avatar";
import { visibleBoardWhere } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { getBoardSummaries } from "@/lib/board-data";
import { pluralBoards, pluralTasks } from "@/lib/format";
import { listManageableRegions } from "@/lib/org-data";
import { prisma } from "@/lib/prisma";
import { tint } from "@/lib/tints";
import type { BoardSummary } from "@/lib/types";
import { BoardRestoreButton } from "./BoardRestoreButton";
import { CreateBoard } from "./CreateBoard";

export const dynamic = "force-dynamic";

export default async function BoardsPage() {
  const user = await requireUser();
  const [boards, regions, archived] = await Promise.all([
    getBoardSummaries(user),
    listManageableRegions(user),
    prisma.board.findMany({
      where: { AND: [await visibleBoardWhere(user), { archivedAt: { not: null } }] },
      orderBy: { archivedAt: "desc" },
      select: { id: true, name: true, color: true },
    }),
  ]);
  // Everyone can create a board (staff get personal, region-less boards).
  return (
    <div className="mx-auto max-w-[1100px] px-5 py-7 sm:px-9">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[25px] font-bold tracking-[-0.03em]">Доски</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">{pluralBoards(boards.length)}</p>
        </div>
        <CreateBoard variant="button" regions={regions} />
      </div>

      <div className="mt-7 grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
        {boards.map((b) => (
          <BoardCard key={b.id} board={b} />
        ))}
        <CreateBoard variant="tile" regions={regions} />
      </div>

      {archived.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-faint)]">
            Архив ({archived.length})
          </h2>
          <div className="space-y-2">
            {archived.map((b) => {
              const c = tint(b.color);
              return (
                <div
                  key={b.id}
                  className="flex items-center gap-3 rounded-[12px] border border-[var(--color-border-card)] bg-[var(--color-surface)] px-3.5 py-2.5"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-[9px] text-[13px] font-bold" style={{ background: c.bg, color: c.text }}>
                    {b.name.charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-muted)]">{b.name}</span>
                  <BoardRestoreButton boardId={b.id} />
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function BoardCard({ board }: { board: BoardSummary }) {
  const c = tint(board.color);
  return (
    <Link
      href={`/board/${board.id}`}
      className="block rounded-[15px] border border-[var(--color-border-card)] bg-[var(--color-surface)] p-5 shadow-[0_1px_2px_rgba(20,20,20,0.03)] transition hover:border-[var(--color-accent)]/40 hover:shadow-[0_4px_16px_rgba(20,20,20,0.06)]"
    >
      <div className="mb-4 flex items-center justify-between">
        <span
          className="grid h-[38px] w-[38px] place-items-center rounded-[11px] text-base font-bold"
          style={{ background: c.bg, color: c.text }}
        >
          {board.name.charAt(0)}
        </span>
      </div>
      <div className="mb-1 truncate text-base font-semibold tracking-[-0.01em] text-[var(--color-ink)]">
        {board.name}
      </div>
      <div className="mb-[18px] text-[13px] text-[var(--color-muted)]">{board.updatedLabel}</div>

      <div className="mb-3 flex h-[6px] overflow-hidden rounded-full bg-[#F2F1ED]">
        <span style={{ width: `${board.doneRatio * 100}%`, background: "var(--color-success)" }} />
        <span style={{ width: `${board.reviewRatio * 100}%`, background: "var(--color-high-dot)" }} />
        <span style={{ width: `${board.progressRatio * 100}%`, background: "var(--color-accent)" }} />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[12.5px] text-[var(--color-muted)]">{pluralTasks(board.taskCount)}</span>
        {board.memberNames.length > 0 && <AvatarStack names={board.memberNames} size={24} max={3} />}
      </div>
    </Link>
  );
}
