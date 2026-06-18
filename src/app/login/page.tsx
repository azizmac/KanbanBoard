import { redirect } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { getCurrentUser } from "@/lib/auth";
import { roleLabels, telegramEnabled } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { devLoginAction } from "./actions";
import TelegramLoginButton from "./TelegramLoginButton";

const ERRORS: Record<string, string> = {
  telegram: "Не удалось проверить вход через Telegram.",
  notlinked: "Ваш Telegram не привязан к команде — обратитесь к администратору.",
  disabled: "Аккаунт отключён.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getCurrentUser()) redirect("/board");

  const { error } = await searchParams;
  const errorMsg = error ? ERRORS[error] : null;

  const showTelegram = telegramEnabled();
  // Demo login stays available in development so localhost is always usable
  // (the Telegram widget only works on a public HTTPS domain).
  const showDev = process.env.NODE_ENV !== "production";

  const users = showDev
    ? await prisma.user.findMany({
        where: { active: true },
        orderBy: [{ role: "asc" }, { name: "asc" }],
      })
    : [];

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-[var(--color-accent)] text-lg font-bold text-white">
            K
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Kanban Tracker</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Задачи команды и канбан-доска</p>
        </div>

        {errorMsg && (
          <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-center text-sm text-rose-600">
            {errorMsg}
          </div>
        )}

        <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-sm">
          {showTelegram && !showDev && (
            <div className="space-y-3">
              <p className="text-center text-sm text-[var(--color-muted)]">Войдите через Telegram</p>
              <TelegramLoginButton botUsername={process.env.TELEGRAM_BOT_USERNAME ?? ""} />
            </div>
          )}

          {showTelegram && showDev && (
            <div className="mb-4 rounded-lg bg-[var(--color-accent-soft)] px-3 py-2 text-center text-xs text-[var(--color-accent)]">
              Telegram-вход подключён · активен в production (с настроенным доменом бота)
            </div>
          )}

          {showDev && (
            <div className="space-y-1">
              {!showTelegram && (
                <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
                  Демо-вход · выберите пользователя
                </p>
              )}
              {users.map((u) => (
                <form key={u.id} action={devLoginAction}>
                  <input type="hidden" name="userId" value={u.id} />
                  <button
                    type="submit"
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-[var(--color-accent-soft)]"
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
          )}
        </div>
      </div>
    </main>
  );
}
