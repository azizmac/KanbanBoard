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

export function relativeUpdated(date: Date | null): string {
  if (!date) return "ещё нет задач";
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "Обновлено сегодня";
  if (days === 1) return "Обновлено вчера";
  if (days < 7) return `Обновлено ${days} дн. назад`;
  if (days < 30) return `Обновлено ${Math.floor(days / 7)} нед. назад`;
  return `Обновлено ${Math.floor(days / 30)} мес. назад`;
}
