import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { UserLink } from "@/components/UserLink";
import { requireUser } from "@/lib/auth";
import { getActivityFeed, type FeedEvent } from "@/lib/home-data";
import { getBoardOptions } from "@/lib/board-data";
import { getMyWork } from "@/lib/task-data";
import { tint } from "@/lib/tints";
import { MyTasksCard } from "./MyTasksCard";

export const dynamic = "force-dynamic";

function greeting(name: string) {
  const h = new Date().getHours();
  const part = h < 5 ? "Доброй ночи" : h < 12 ? "Доброе утро" : h < 18 ? "Добрый день" : "Добрый вечер";
  return `${part}, ${name.split(" ")[0]}`;
}

function verbFor(kind: FeedEvent["kind"], detail: string | null): { verb: string; suffix?: string; done?: boolean } {
  switch (kind) {
    case "CREATED": return { verb: "создал(а) задачу" };
    case "STATUS_CHANGED":
      return detail?.endsWith("Готово")
        ? { verb: "завершил(а)", done: true }
        : { verb: "переместил(а)", suffix: detail ?? undefined };
    case "ASSIGNED": return { verb: "назначил(а)", suffix: detail ? `→ ${detail}` : undefined };
    case "UNASSIGNED": return { verb: "снял(а) исполнителя с" };
    case "PRIORITY_CHANGED": return { verb: "сменил(а) приоритет", suffix: detail ?? undefined };
    case "DUE_CHANGED": return { verb: "поставил(а) срок", suffix: detail ?? undefined };
    case "DUE_CLEARED": return { verb: "убрал(а) срок" };
    case "TITLE_CHANGED": return { verb: "переименовал(а) задачу" };
    case "DESCRIPTION_CHANGED": return { verb: "обновил(а) описание" };
    case "TAG_ADDED": return { verb: "добавил(а) тег", suffix: detail ?? undefined };
    case "TAG_REMOVED": return { verb: "убрал(а) тег", suffix: detail ?? undefined };
    case "ATTACHMENT_ADDED": return { verb: "вложил(а) файл в" };
    default: return { verb: "обновил(а)" };
  }
}

function dayBucket(iso: string): string {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const t = new Date(iso).getTime();
  if (t >= start.getTime()) return "Сегодня";
  if (t >= start.getTime() - 86_400_000) return "Вчера";
  return "Ранее";
}

function FeedRow({ e }: { e: FeedEvent }) {
  const v = verbFor(e.kind, e.detail);
  const c = tint(e.board.color);
  const time = new Date(e.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="flex gap-3">
      <UserLink id={e.actor.id} className="shrink-0">
        <Avatar name={e.actor.name} src={e.actor.avatarUrl} size={34} />
      </UserLink>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] leading-snug text-[var(--color-body)]">
          {v.done && <span className="mr-1 text-[var(--color-success)]">✓</span>}
          <UserLink id={e.actor.id} className="font-semibold text-[var(--color-ink)] hover:underline">{e.actor.name}</UserLink>{" "}
          {v.verb}{" "}
          <Link href={`/task/${e.task.id}`} className="font-semibold text-[var(--color-ink)] hover:underline">«{e.task.title}»</Link>
          {v.suffix && <span className="text-[var(--color-muted)]"> {v.suffix}</span>}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[var(--color-faint)]">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.text }} />
          <span>{e.board.name}</span>
          <span>·</span>
          <span className="font-mono">{time}</span>
        </div>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const user = await requireUser();
  const [feed, work, boards] = await Promise.all([
    getActivityFeed(user),
    getMyWork(user.id),
    getBoardOptions(user),
  ]);

  const openCount = work.assigned.filter((t) => !t.done).length;
  const groups = ["Сегодня", "Вчера", "Ранее"]
    .map((label) => ({ label, items: feed.filter((e) => dayBucket(e.createdAt) === label) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-[24px] font-bold tracking-[-0.03em] text-[var(--color-ink)]">{greeting(user.name)}</h1>
      <p className="mt-1 text-[13.5px] text-[var(--color-muted)]">
        {openCount} задач на вас · {boards.length} {boards.length === 1 ? "доска" : "досок"}
      </p>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* Activity feed */}
        <section>
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-faint)]">
            Активность команды
          </h2>
          {groups.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--color-line)] py-12 text-center text-[13.5px] text-[var(--color-muted)]">
              Пока тихо — событий на досках ещё нет.
            </p>
          ) : (
            <div className="space-y-5">
              {groups.map((g) => (
                <div key={g.label}>
                  <div className="mb-2.5 text-[12px] font-medium text-[var(--color-muted)]">{g.label}</div>
                  <div className="space-y-3.5">
                    {g.items.map((e) => (
                      <FeedRow key={e.id} e={e} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* My tasks */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <MyTasksCard tasks={work.assigned} />
        </aside>
      </div>
    </div>
  );
}
