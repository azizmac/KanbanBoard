/** Default kanban columns. The last one is the terminal (done) column. */
export const DEFAULT_BOARD_COLUMNS = [
  { name: "Бэклог", done: false },
  { name: "В работе", done: false },
  { name: "На ревью", done: false },
  { name: "Готово", done: true },
] as const;

export function defaultBoardColumnsCreate() {
  return DEFAULT_BOARD_COLUMNS.map((c, position) => ({
    name: c.name,
    position,
    done: c.done,
  }));
}

/** Prisma `where` for the terminal column of a board. */
export const doneColumnWhere = { done: true } as const;
export const openColumnWhere = { done: false } as const;
