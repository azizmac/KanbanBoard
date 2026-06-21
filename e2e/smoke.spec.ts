import { expect, test } from "@playwright/test";

// Pages every signed-in director should be able to open. The demo seed makes the
// first demo user an ADMIN (role sorts first), so all of these are reachable.
const PAGES = [
  { path: "/home", text: /Добр/ },
  { path: "/boards", text: /Доски/ },
  { path: "/search", text: /Поиск/ },
  { path: "/team", text: /Команда/ },
  { path: "/dashboard", text: /Сводка/ },
  { path: "/templates", text: /Шаблон/ },
  { path: "/profile", text: /Оформление|Выйти/ },
];

test("demo login → key pages render without crashing", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  // Dev-only demo login: the first user in the list is a director.
  await page.goto("/login");
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForURL(/\/(home|board)/, { timeout: 30_000 });

  for (const p of PAGES) {
    const res = await page.goto(p.path);
    expect(res?.status() ?? 200, `GET ${p.path}`).toBeLessThan(500);
    await expect(page.locator("body"), `content of ${p.path}`).toContainText(p.text);
    await expect(page.getByText("Application error"), `error overlay on ${p.path}`).toHaveCount(0);
  }

  // Open a real board and confirm the kanban columns render.
  await page.goto("/boards");
  await page.locator('a[href^="/board/"]').first().click();
  await page.waitForURL(/\/board\//, { timeout: 30_000 });
  await expect(page.locator("body")).toContainText(/Бэклог|В работе|Готово/);

  expect(pageErrors, `uncaught page errors:\n${pageErrors.join("\n")}`).toEqual([]);
});
