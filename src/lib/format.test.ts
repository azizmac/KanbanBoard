import { describe, expect, it } from "vitest";
import { activityText, plural, pluralTasks } from "./format";

describe("Russian pluralization", () => {
  it("picks the right form", () => {
    expect(pluralTasks(1)).toBe("1 задача");
    expect(pluralTasks(2)).toBe("2 задачи");
    expect(pluralTasks(5)).toBe("5 задач");
    expect(pluralTasks(11)).toBe("11 задач"); // 11 is special-cased
    expect(pluralTasks(21)).toBe("21 задача");
    expect(pluralTasks(22)).toBe("22 задачи");
    expect(pluralTasks(0)).toBe("0 задач");
  });

  it("is generic", () => {
    expect(plural(3, "файл", "файла", "файлов")).toBe("3 файла");
  });
});

describe("activity text", () => {
  it("covers known kinds", () => {
    expect(activityText("CREATED", null)).toBe("создал(а) задачу");
    expect(activityText("STATUS_CHANGED", "В работе → Готово")).toContain("В работе → Готово");
    expect(activityText("TAG_ADDED", "срочно")).toContain("срочно");
  });

  it("falls back for unknown kinds", () => {
    expect(activityText("WAT", null)).toBe("изменил(а) задачу");
  });
});
