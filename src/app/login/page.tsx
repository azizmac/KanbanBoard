import { redirect } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { LogoLockup } from "@/components/Logo";
import { getCurrentUser } from "@/lib/auth";
import { roleLabels, telegramEnabled } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { devLoginAction } from "./actions";
import TelegramLogin from "./TelegramLogin";

const ERRORS: Record<string, string> = {
  telegram: "Не удалось проверить вход через Telegram.",
  notlinked: "Вас ещё нет в команде — попросите у администратора ссылку-приглашение.",
  badinvite: "Ссылка-приглашение недействительна или истекла — попросите новую.",
  disabled: "Аккаунт отключён.",
};

function TelegramIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff">
      <path d="M21.94 4.58a1.4 1.4 0 0 0-1.45-.2L3.4 11.1c-1.06.43-1.04 1.95.03 2.35l4.13 1.54 1.6 5.02a1 1 0 0 0 1.62.45l2.42-2.18 4.43 3.26a1.4 1.4 0 0 0 2.2-.86l3.07-14.6a1.4 1.4 0 0 0-.49-1.5zM9.4 14.3l-.6 3.78-.9-2.96 8.9-7.42L9.4 14.3z" />
    </svg>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getCurrentUser()) redirect("/board");

  const { error } = await searchParams;
  const errorMsg = error ? ERRORS[error] : null;

  const showTelegram = telegramEnabled();
  const showDev = process.env.NODE_ENV !== "production";

  const [boardCount, closedCount, teamCount, users] = await Promise.all([
    prisma.board.count(),
    prisma.task.count({ where: { column: { name: "Готово" } } }),
    prisma.user.count({ where: { active: true } }),
    showDev
      ? prisma.user.findMany({ where: { active: true }, orderBy: [{ role: "asc" }, { name: "asc" }] })
      : Promise.resolve([]),
  ]);

  const stats = [
    { value: boardCount, label: "досок" },
    { value: closedCount, label: "задач закрыто" },
    { value: teamCount, label: "в команде" },
  ];

  return (
    <main className="min-h-screen md:grid md:grid-cols-2">
      {/* Brand panel */}
      <div className="relative flex flex-col justify-between overflow-hidden bg-[var(--color-sidebar)] px-7 py-10 md:px-12 md:py-12">
        <div
          className="pointer-events-none absolute -right-24 -top-20 h-[360px] w-[360px] rounded-full opacity-50 [animation:floatA_9s_ease-in-out_infinite]"
          style={{ background: "radial-gradient(circle, #D97757, transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -left-20 bottom-[-60px] h-[300px] w-[300px] rounded-full opacity-40 [animation:floatB_11s_ease-in-out_infinite]"
          style={{ background: "radial-gradient(circle, #7B5CE6, transparent 70%)" }}
        />
        <div className="relative">
          <LogoLockup tone="dark" size={30} />
        </div>
        <div className="relative mt-10 md:mt-0">
          <h2 className="max-w-[420px] text-[28px] font-bold leading-[1.15] tracking-[-0.03em] text-white md:text-[32px]">
            Доски, задачи и команда — в одном потоке.
          </h2>
          <p className="mt-3.5 max-w-[420px] text-[15px] leading-relaxed text-[#9A988F]">
            Канбан для команд, которые ценят ясность. Перетаскивайте задачи, обсуждайте в комментариях,
            держите дедлайны под контролем.
          </p>
        </div>
        <div className="relative mt-10 flex gap-6">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-[22px] font-bold text-white">{s.value}</div>
              <div className="text-[12.5px] text-[#86847E]">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-col justify-center bg-[var(--color-surface)] px-7 py-10 md:px-12">
        <div className="mx-auto w-full max-w-[400px]">
          <LogoLockup tone="light" size={30} />
          <h1 className="mt-7 text-[26px] font-bold tracking-[-0.03em]">Вход в Поток</h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--color-muted)]">
            Используйте свой Telegram-аккаунт — никаких паролей. Мы получим только имя и аватар.
          </p>

          {errorMsg && (
            <div className="mt-5 rounded-[10px] border border-[#FECDCA] bg-[#FEF3F2] px-3 py-2 text-sm text-[var(--color-urgent)]">
              {errorMsg}
            </div>
          )}

          {showTelegram && (
            <div className="mt-6">
              {showDev ? (
                <>
                  <div className="flex h-[54px] w-full items-center justify-center gap-2.5 rounded-[14px] bg-[#229ED9] text-base font-semibold text-white opacity-60">
                    <TelegramIcon />
                    Войти через Telegram
                  </div>
                  <p className="mt-2 text-center text-[12px] text-[var(--color-faint)]">
                    Telegram-вход активен в production (с настроенным ботом)
                  </p>
                </>
              ) : (
                <TelegramLogin />
              )}
            </div>
          )}

          {showDev && (
            <div className="mt-6">
              <div className="mb-3 flex items-center gap-2.5">
                <div className="h-px flex-1 bg-[var(--color-line)]" />
                <span className="text-[12px] text-[var(--color-faint)]">демо-вход · выберите пользователя</span>
                <div className="h-px flex-1 bg-[var(--color-line)]" />
              </div>
              <div className="max-h-[280px] space-y-1 overflow-y-auto pr-1">
                {users.map((u) => (
                  <form key={u.id} action={devLoginAction}>
                    <input type="hidden" name="userId" value={u.id} />
                    <button
                      type="submit"
                      className="flex w-full items-center gap-3 rounded-[12px] px-2 py-2 text-left transition hover:bg-[var(--color-surface-warm)]"
                    >
                      <Avatar name={u.name} size={36} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{u.name}</span>
                        <span className="block truncate text-xs text-[var(--color-muted)]">
                          {u.position ?? roleLabels[u.role]}
                        </span>
                      </span>
                      <span className="rounded-md bg-[var(--color-accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-accent)]">
                        {roleLabels[u.role]}
                      </span>
                    </button>
                  </form>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-start gap-2.5 rounded-[12px] border border-[var(--color-border-card)] bg-[var(--color-surface-warm)] px-3.5 py-3">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" className="mt-0.5 shrink-0">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="text-[12.5px] leading-relaxed text-[var(--color-muted)]">
              После входа у вас появятся личные доски. Командные открывает администратор.
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
