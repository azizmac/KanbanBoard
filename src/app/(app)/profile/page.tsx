import { Avatar } from "@/components/Avatar";
import { PushToggle } from "@/components/PushToggle";
import { ThemeSegment } from "@/components/ThemeToggle";
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
      {/* Identity hero — avatar + name live ON the dark cover (white text reads in
          both themes), so the header scrolls as one cohesive block instead of
          leaving the avatar clipped above a thin cover strip when scrolled. */}
      <div className="relative overflow-hidden bg-[linear-gradient(120deg,#262320,#3A332D_55%,#4A3F38)]">
        <div
          className="pointer-events-none absolute -right-8 -top-10 h-52 w-52 rounded-full opacity-[0.38]"
          style={{ background: "radial-gradient(circle, #D97757, transparent 70%)" }}
        />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-4 px-5 py-8 text-center sm:flex-row sm:gap-5 sm:text-left">
          <div className="shrink-0 rounded-[24px] bg-white/10 p-1 ring-1 ring-white/15">
            <Avatar name={me.name} src={me.avatarUrl} size={88} className="!rounded-[20px]" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="text-[25px] font-bold tracking-[-0.03em] text-white">{me.name}</h1>
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white">
                {roleLabels[me.role]}
              </span>
            </div>
            <p className="mt-1 text-sm text-white/70">
              {me.position ?? "—"}
              {me.username && <span className="ml-2 font-mono text-white/55">@{me.username}</span>}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-5">

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
                label="Телефон"
                value={
                  me.phone ? (
                    <a href={`tel:${me.phone}`} className="font-mono text-[var(--color-accent)] hover:underline">{me.phone}</a>
                  ) : (
                    <span className="text-[var(--color-faint)]">в боте: /phone</span>
                  )
                }
              />
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
            <div className="rounded-[13px] border border-[var(--color-border-card)] bg-[var(--color-surface)] p-4">
              <div className="mb-2.5 text-sm font-medium text-[var(--color-ink)]">Оформление</div>
              <ThemeSegment />
            </div>
            <PushToggle />
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
