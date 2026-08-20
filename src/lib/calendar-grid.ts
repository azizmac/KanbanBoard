/** Monday = 0 … Sunday = 6 (ru-RU week). */
export function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type CalCell = {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
};

function cell(d: Date, month: number, today0: number): CalCell {
  return {
    iso: toIsoDate(d),
    day: d.getDate(),
    inMonth: d.getMonth() === month,
    isToday: startOfDay(d).getTime() === today0,
  };
}

/** 6×7 month grid starting on Monday. `month` is 0-indexed. */
export function monthGrid(year: number, month: number, today = new Date()): CalCell[] {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(1 - mondayIndex(first));
  const today0 = startOfDay(today).getTime();
  const cells: CalCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(cell(d, month, today0));
  }
  return cells;
}

/** 7-day week (Mon–Sun) containing `anchor`. */
export function weekGrid(anchor: Date, today = new Date()): CalCell[] {
  const a = startOfDay(anchor);
  a.setDate(a.getDate() - mondayIndex(a));
  const today0 = startOfDay(today).getTime();
  const month = anchor.getMonth();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(a);
    d.setDate(a.getDate() + i);
    return cell(d, month, today0);
  });
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
