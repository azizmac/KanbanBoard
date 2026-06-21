import Link from "next/link";
import { isDirector } from "@/lib/access";
import { AUDIT_LABELS, listAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { AdminUnlock } from "../AdminUnlock";

export const dynamic = "force-dynamic";

function when(d: Date) {
  return d.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function AuditPage() {
  const user = await requireUser();
  if (!isDirector(user)) return <AdminUnlock />;

  const entries = await listAudit();

  return (
    <div className="mx-auto max-w-[860px] px-5 py-7 sm:px-9">
      <div className="mb-1 flex items-center gap-2.5">
        <h1 className="text-[24px] font-bold tracking-[-0.03em]">Журнал действий</h1>
        <Link href="/admin" className="text-sm text-[var(--color-accent)] hover:underline">
          ← к доступу
        </Link>
      </div>
      <p className="mb-6 text-sm text-[var(--color-muted)]">
        Изменения ролей, активности и приглашения. Последние {entries.length}.
      </p>

      <div className="divide-y divide-[var(--color-line)] rounded-[13px] border border-[var(--color-border-card)] bg-[var(--color-surface)]">
        {entries.map((e) => (
          <div key={e.id} className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 px-4 py-3 text-sm">
            <Link href={`/u/${e.actor.id}`} className="font-medium text-[var(--color-ink)] hover:text-[var(--color-accent)]">
              {e.actor.name}
            </Link>
            <span className="text-[var(--color-muted)]">{AUDIT_LABELS[e.action] ?? e.action}</span>
            {e.targetUser && (
              <Link href={`/u/${e.targetUser.id}`} className="font-medium text-[var(--color-ink)] hover:text-[var(--color-accent)]">
                {e.targetUser.name}
              </Link>
            )}
            {e.detail && <span className="text-[var(--color-muted)]">· {e.detail}</span>}
            <span className="ml-auto whitespace-nowrap pl-3 font-mono text-xs text-[var(--color-faint)]">{when(e.createdAt)}</span>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-[var(--color-muted)]">Пока пусто.</p>
        )}
      </div>
    </div>
  );
}
