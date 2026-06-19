import { Avatar } from "@/components/Avatar";
import { requireUser } from "@/lib/auth";
import { logoutAction } from "@/lib/auth-actions";
import { roleLabels } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function timeAgo(iso: Date) {
  return iso.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function ProfilePage() {
  const me = await requireUser();

  const [active, completed, boards, commentCount, recentComments, manager] = await Promise.all([
    prisma.task.count({ where: { assigneeId: me.id, column: { name: { not: "Готово" } } } }),
    prisma.task.count({ where: { assigneeId: me.id, column: { name: "Готово" } } }),
    prisma.board.count(),
    prisma.comment.count({ where: { authorId: me.id } }),
    prisma.comment.findMany({
      where: { authorId: me.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { task: { select: { id: true, title: true } } },
    }),
    me.managerId ? prisma.user.findUnique({ where: { id: me.managerId }, select: { name: true } }) : null,
  ]);

  const stats = [
    { label: "Активных", value: active },
    { label: "Завершено", value: completed },
    { label: "Досок", value: boards },
    { label: "Комментариев", value: commentCount },
  ];

  return (
    <div className="pb-10">
      {/* Cover */}
      <div className="h-[120px] bg-[linear-gradient(120deg,#5546E0,#7B5CE6_60%,#A78BFA)] sm:h-[120px]" />

      <div className="mx-auto max-w-4xl px-5">
        {/* Header — avatar overlaps the cover; name stays below it */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-end sm:gap-5">
          <div className="-mt-14 rounded-[26px] bg-[var(--color-surface)] p-1 shadow-[0_1px_3px_rgba(20,20,20,0.08)]">
            <Avatar name={me.name} size={96} className="!rounded-[22px]" />
          </div>
          <div className="flex-1 pt-1 text-center sm:pt-0 sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="text-[25px] font-bold tracking-[-0.03em]">{me.name}</h1>
              <span className="rounded-full bg-[var(--color-accent-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-accent)]">
                {roleLabels[me.role]}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-[var(--color-muted)]">
              {me.position ?? "—"}
              {me.username && <span className="ml-2 font-mono text-[var(--color-faint)]">@{me.username}</span>}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-[13px] border border-[var(--color-border-card)] bg-[var(--color-surface)] p-4"
            >
              <div className="font-mono text-2xl font-bold text-[var(--color-ink)]">{s.value}</div>
              <div className="mt-0.5 text-xs text-[var(--color-muted)]">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Activity */}
          <section>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-faint)]">
              Активность
            </h2>
            <div className="space-y-3">
              {recentComments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                  <div className="text-sm">
                    <span className="text-[var(--color-body)]">Комментарий в задаче </span>
                    <a
                      href={`/task/${c.task.id}`}
                      className="font-medium text-[var(--color-ink)] hover:text-[var(--color-accent)]"
                    >
                      «{c.task.title}»
                    </a>
                    <div className="font-mono text-xs text-[var(--color-faint)]">{timeAgo(c.createdAt)}</div>
                  </div>
                </div>
              ))}
              {recentComments.length === 0 && (
                <p className="text-sm text-[var(--color-muted)]">Пока нет активности.</p>
              )}
            </div>
          </section>

          {/* Info */}
          <aside className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-faint)]">
              Информация
            </h2>
            <div className="divide-y divide-[var(--color-line)] rounded-[13px] border border-[var(--color-border-card)] bg-[var(--color-surface)]">
              <Row label="Должность" value={me.position ?? "—"} />
              <Row label="Руководитель" value={manager?.name ?? "—"} />
              <Row
                label="Telegram"
                value={
                  me.telegramId ? (
                    <span className="font-mono text-[var(--color-accent)]">подключён</span>
                  ) : (
                    "не подключён"
                  )
                }
              />
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="w-full rounded-[10px] border border-[#FECDCA] bg-[#FEF3F2] px-3 py-2 text-sm font-medium text-[var(--color-urgent)] transition hover:brightness-95"
              >
                Выйти
              </button>
            </form>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <span className="text-[var(--color-muted)]">{label}</span>
      <span className="text-right font-medium text-[var(--color-ink)]">{value}</span>
    </div>
  );
}
