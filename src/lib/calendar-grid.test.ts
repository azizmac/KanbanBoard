import { describe, expect, it } from "vitest";
import { addMonths, mondayIndex, monthGrid, toIsoDate, weekGrid } from "./calendar-grid";

describe("mondayIndex", () => {
  it("treats Monday as 0 and Sunday as 6", () => {
    // 2026-08-17 is a Monday, 2026-08-23 is a Sunday.
    expect(mondayIndex(new Date(2026, 7, 17))).toBe(0);
    expect(mondayIndex(new Date(2026, 7, 23))).toBe(6);
  });
});

describe("monthGrid", () => {
  it("returns 42 cells starting on Monday", () => {
    const today = new Date(2026, 7, 20);
    const cells = monthGrid(2026, 7, today);
    expect(cells).toHaveLength(42);
    expect(mondayIndex(new Date(cells[0].iso + "T12:00:00"))).toBe(0);
    expect(cells.filter((c) => c.inMonth).length).toBe(31);
    expect(cells.find((c) => c.iso === "2026-08-20")?.isToday).toBe(true);
  });
});

describe("weekGrid", () => {
  it("returns Mon–Sun around the anchor", () => {
    const cells = weekGrid(new Date(2026, 7, 20), new Date(2026, 7, 20));
    expect(cells).toHaveLength(7);
    expect(cells[0].iso).toBe("2026-08-17");
    expect(cells[6].iso).toBe("2026-08-23");
    expect(cells[3].isToday).toBe(true);
  });
});

describe("addMonths / toIsoDate", () => {
  it("wraps the year", () => {
    expect(addMonths(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(toIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
