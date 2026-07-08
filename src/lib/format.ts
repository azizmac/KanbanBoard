// Pure formatting helpers — safe to import from client components
// (no Prisma / server-only deps).

/** Current epoch ms. Wrapped so server components can pass a request-time
 *  timestamp to client components without tripping the react purity lint. */
export function nowMs() {
  return Date.now();
}

/** Russian plural: e.g. plural(3, "задача","задачи","задач") -> "3 задачи". */
export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} ${few}`;
  return `${n} ${many}`;
}

export function pluralTasks(n: number) {
  return plural(n, "задача", "задачи", "задач");
}

export function pluralBoards(n: number) {
  return plural(n, "доска", "доски", "досок");
}

/** Human-readable system-note text for a task activity (actor rendered separately). */
export function activityText(kind: string, detail: string | null): string {
  switch (kind) {
    case "CREATED":
      return "создал(а) задачу";
    case "STATUS_CHANGED":
      return `перенёс(ла): ${detail ?? ""}`;
    case "ASSIGNED":
      return `назначил(а) исполнителя: ${detail ?? ""}`;
    case "UNASSIGNED":
      return "убрал(а) исполнителя";
    case "PRIORITY_CHANGED":
      return `сменил(а) приоритет: ${detail ?? ""}`;
    case "DUE_CHANGED":
      return `поставил(а) дедлайн: ${detail ?? ""}`;
    case "DUE_CLEARED":
      return "убрал(а) дедлайн";
    case "TITLE_CHANGED":
      return "изменил(а) название";
    case "DESCRIPTION_CHANGED":
      return "изменил(а) описание";
    case "TAG_ADDED":
      return `добавил(а) тег «${detail ?? ""}»`;
    case "TAG_REMOVED":
      return `убрал(а) тег «${detail ?? ""}»`;
    case "ATTACHMENT_ADDED":
      return `прикрепил(а) файл: ${detail ?? ""}`;
    default:
      return "изменил(а) задачу";
  }
}

export function relativeUpdated(date: Date | null): string {
  if (!date) return "ещё нет задач";
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "Обновлено сегодня";
  if (days === 1) return "Обновлено вчера";
  if (days < 7) return `Обновлено ${days} дн. назад`;
  if (days < 30) return `Обновлено ${Math.floor(days / 7)} нед. назад`;
  return `Обновлено ${Math.floor(days / 30)} мес. назад`;
}

// ---- Messenger («Чат») time & size helpers ----

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Bubble timestamp: "14:32". */
export function chatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

/** Chat-list timestamp: today → "14:32", yesterday → "вчера", else "3 июл". */
export function chatListTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (sameDay(d, now)) return chatTime(iso);
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (sameDay(d, yesterday)) return "вчера";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

/** Day-separator label inside a dialog: "Сегодня" | "Вчера" | "3 июля". */
export function chatDayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (sameDay(d, now)) return "Сегодня";
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (sameDay(d, yesterday)) return "Вчера";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

/** File size: "240 КБ", "1,2 МБ". */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} Б`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} КБ`;
  return `${(n / (1024 * 1024)).toFixed(1).replace(".", ",")} МБ`;
}
