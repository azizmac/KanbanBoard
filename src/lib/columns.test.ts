import { describe, expect, it } from "vitest";
import { DEFAULT_BOARD_COLUMNS, defaultBoardColumnsCreate, doneColumnWhere, openColumnWhere } from "./columns";

describe("default board columns", () => {
  it("marks only the last column as done", () => {
    const done = DEFAULT_BOARD_COLUMNS.filter((c) => c.done);
    expect(done).toHaveLength(1);
    expect(done[0].name).toBe("Готово");
    expect(DEFAULT_BOARD_COLUMNS.at(-1)?.done).toBe(true);
  });

  it("builds Prisma create rows with positions", () => {
    const rows = defaultBoardColumnsCreate();
    expect(rows.map((r) => r.position)).toEqual([0, 1, 2, 3]);
    expect(rows.filter((r) => r.done)).toHaveLength(1);
  });
});

describe("column where fragments", () => {
  it("key off the done flag, not the name", () => {
    expect(doneColumnWhere).toEqual({ done: true });
    expect(openColumnWhere).toEqual({ done: false });
  });
});
