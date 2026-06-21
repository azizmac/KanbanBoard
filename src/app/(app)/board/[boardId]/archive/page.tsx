import Link from "next/link";
import { notFound } from "next/navigation";
import { canAccessBoard } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ArchiveTaskButton } from "../../ArchiveTaskButton";

export const dynamic = "force-dynamic";

export default async function BoardArchivePage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  const user = await requireUser();
  if (!(await canAccessBoard(user, boardId))) notFound();

  const board = await prisma.board.findUnique({ where: { id: boardId }, select: { name: true } });
  if (!board) notFound();

  const tasks = await prisma.task.findMany({
    where: { archivedAt: { not: null }, column: { boardId } },
    orderBy: { archivedAt: "desc" },
    select: {
      id: true,
      title: true,
      column: { select: { name: true } },
      assignee: { select: { name: true } },
    },
  });

  return (
    <div className="mx-auto max-w-[760px] px-5 py-7 sm:px-9">
      <div className="mb-1 flex flex-wrap items-center gap-2.5">
        <h1 className="text-[22px] font-bold tracking-[-0.03em]">Архив · {board.name}</h1>
        <Link href={`/board/${boardId}`} className="text-sm text-[var(--color-accent)] hover:underline">
          ← к доске
        </Link>
      </div>
      <p className="mb-5 text-sm text-[var(--color-muted)]">
        {tasks.length} в архиве. Восстановление вернёт задачу в её колонку.
      </p>

      <div className="space-y-2">
        {tasks.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 rounded-[12px] border border-[var(--color-border-card)] bg-[var(--color-surface)] px-3.5 py-3"
          >
            <div className="min-w-0 flex-1">
              <Link href={`/task/${t.id}`} className="block truncate text-[14.5px] font-medium text-[var(--color-ink)] hover:text-[var(--color-accent)]">
                {t.title}
              </Link>
              <div className="text-[12px] text-[var(--color-muted)]">
                {t.column.name}
                {t.assignee ? ` · ${t.assignee.name}` : ""}
              </div>
            </div>
            <ArchiveTaskButton taskId={t.id} archived />
          </div>
        ))}
        {tasks.length === 0 && (
          <p className="py-12 text-center text-sm text-[var(--color-muted)]">Архив пуст.</p>
        )}
      </div>
    </div>
  );
}
