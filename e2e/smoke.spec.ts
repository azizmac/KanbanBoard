import { expect, test } from "@playwright/test";

const DIRECTOR_PAGES = [
  { path: "/home", text: /Добр/ },
  { path: "/boards", text: /Доски/ },
  { path: "/search", text: /Поиск/ },
  { path: "/team", text: /Команда/ },
  { path: "/dashboard", text: /Сводка/ },
  { path: "/templates", text: /Шаблон/ },
  { path: "/my", text: /Моё/ },
  { path: "/chat", text: /Чаты/ },
  { path: "/profile", text: /Оформление|Выйти/ },
];

test("demo login as director → key pages render without crashing", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  await page.goto("/login");
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForURL(/\/(home|board)/, { timeout: 30_000 });

  for (const p of DIRECTOR_PAGES) {
    const res = await page.goto(p.path);
    expect(res?.status() ?? 200, `GET ${p.path}`).toBeLessThan(500);
    await expect(page.locator("body"), `content of ${p.path}`).toContainText(p.text);
    await expect(page.getByText("Application error"), `error overlay on ${p.path}`).toHaveCount(0);
  }

  await page.goto("/boards");
  await page.locator('a[href^="/board/"]').first().click();
  await page.waitForURL(/\/board\//, { timeout: 30_000 });
  await expect(page.locator("body")).toContainText(/Бэклог|В работе|Готово/);

  await page.goto("/my?tab=inbox");
  await expect(page.locator("body")).toContainText(/Уведомлен/);

  await page.goto("/my?tab=calendar");
  await expect(page.locator("body")).toContainText(/Календарь|Месяц|Неделя/);

  expect(pageErrors, `uncaught page errors:\n${pageErrors.join("\n")}`).toEqual([]);
});

test("demo login as linear staff → Моё works, сводка redirects", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /Линейный/ }).first().click();
  await page.waitForURL(/\/(home|board)/, { timeout: 30_000 });

  const my = await page.goto("/my");
  expect(my?.status() ?? 200).toBeLessThan(500);
  await expect(page.locator("body")).toContainText(/Моё/);

  const chat = await page.goto("/chat");
  expect(chat?.status() ?? 200).toBeLessThan(500);
  await expect(page.locator("body")).toContainText(/Чаты/);

  await page.goto("/dashboard");
  await page.waitForURL(/\/boards/, { timeout: 15_000 });
});
