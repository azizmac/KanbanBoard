import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { requireUser } from "@/lib/auth";
import { roleLabels, telegramEnabled } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { makeLinkToken } from "@/lib/telegram-link";
import { TelegramConnect } from "./TelegramConnect";

export const dynamic = "force-dynamic";

const roleBadge: Record<string, string> = {
  ADMIN: "bg-rose-50 text-rose-600",
  MANAGER: "bg-amber-50 text-amber-600",
  MEMBER: "bg-[var(--color-accent-soft)] text-[var(--color-accent)]",
};

export default async function TeamPage() {
  const me = await requireUser();

  const users = await prisma.user.findMany({
    where: { active: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    include: { manager: { select: { name: true } } },
  });

  const enabled = telegramEnabled();
  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? "";
  const linked = Boolean(me.telegramId);
  const deepLink =
    enabled && botUsername ? `https://t.me/${botUsername}?start=${makeLinkToken(me.id)}` : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <h1 className="mb-4 text-lg font-semibold tracking-tight">Команда</h1>

      {/* Telegram connection */}
      <section className="mb-6 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
        <h2 className="mb-1 text-sm font-semibold">Ваш Telegram</h2>
        <p className="mb-3 text-xs text-[var(--color-muted)]">
          Подключите Telegram, чтобы получать уведомления о назначениях, упоминаниях и комментариях.
        </p>
        <TelegramConnect
          enabled={enabled}
          linked={linked}
          deepLink={deepLink}
          botUsername={botUsername}
        />
      </section>

      {/* Team list */}
      <section className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)]">
        {users.map((u, i) => (
          <Link
            key={u.id}
            href={`/u/${u.id}`}
            className={`flex items-center gap-3 px-4 py-3 transition hover:bg-[var(--color-surface-warm)] ${
              i > 0 ? "border-t border-[var(--color-line)]" : ""
            }`}
          >
            <Avatar name={u.name} src={u.avatarUrl} size={40} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">{u.name}</span>
                {u.id === me.id && (
                  <span className="text-xs text-[var(--color-muted)]">(вы)</span>
                )}
                {u.telegramId && (
                  <span className="rounded bg-emerald-50 px-1.5 text-[11px] text-emerald-600">
                    TG
                  </span>
                )}
              </div>
              <div className="truncate text-xs text-[var(--color-muted)]">
                {u.username ? `@${u.username}` : (u.position ?? "—")}
                {u.position && u.username && <span> · {u.position}</span>}
                {u.manager && <span> · рук.: {u.manager.name}</span>}
              </div>
            </div>
            <span
              className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium ${roleBadge[u.role]}`}
            >
              {roleLabels[u.role]}
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
