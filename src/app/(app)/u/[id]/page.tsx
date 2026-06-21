import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { requireUser } from "@/lib/auth";
import { roleLabels } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const roleBadge: Record<string, string> = {
  ADMIN: "bg-rose-50 text-rose-600",
  MANAGER: "bg-amber-50 text-amber-600",
  MEMBER: "bg-[var(--color-accent-soft)] text-[var(--color-accent)]",
};

export default async function ColleaguePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const u = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, username: true, avatarUrl: true, phone: true,
      position: true, role: true, telegramId: true, active: true, createdAt: true,
      manager: { select: { id: true, name: true } },
    },
  });
  if (!u || !u.active) notFound();

  const [open, done] = await Promise.all([
    prisma.task.count({ where: { assigneeId: u.id, archivedAt: null, column: { name: { not: "Готово" } } } }),
    prisma.task.count({ where: { assigneeId: u.id, archivedAt: null, column: { name: "Готово" } } }),
  ]);

  const stats = [
    { label: "Активных", value: open },
    { label: "Завершено", value: done },
  ];

  return (
    <div className="mx-auto max-w-2xl px-5 py-7">
      <Link href="/team" className="text-[13px] text-[var(--color-accent)] hover:underline">← Команда</Link>

      <div className="mt-4 flex items-center gap-4">
        <Avatar name={u.name} src={u.avatarUrl} size={84} className="!rounded-[22px]" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[22px] font-bold tracking-[-0.02em]">{u.name}</h1>
            <span className={`rounded-md px-2 py-0.5 text-[11.5px] font-medium ${roleBadge[u.role]}`}>
              {roleLabels[u.role]}
            </span>
          </div>
          {u.username && (
            <a
              href={`https://t.me/${u.username}`}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 inline-block font-mono text-[13px] text-[var(--color-accent)] hover:underline"
            >
              @{u.username}
            </a>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[13px] border border-[var(--color-border-card)] bg-[var(--color-surface)] p-4">
            <div className="font-mono text-2xl font-bold text-[var(--color-ink)]">{s.value}</div>
            <div className="mt-0.5 text-xs text-[var(--color-muted)]">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 divide-y divide-[var(--color-line)] rounded-[13px] border border-[var(--color-border-card)] bg-[var(--color-surface)]">
        <Row label="Должность" value={u.position ?? "—"} />
        <Row
          label="Руководитель"
          value={u.manager ? <Link href={`/u/${u.manager.id}`} className="text-[var(--color-accent)] hover:underline">{u.manager.name}</Link> : "—"}
        />
        <Row
          label="Телефон"
          value={u.phone ? <a href={`tel:${u.phone}`} className="font-mono text-[var(--color-accent)] hover:underline">{u.phone}</a> : <span className="text-[var(--color-faint)]">не указан</span>}
        />
        <Row
          label="Telegram"
          value={u.telegramId ? <span className="text-[var(--color-success)]">подключён</span> : "не подключён"}
        />
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
