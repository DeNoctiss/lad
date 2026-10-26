import { test, expect } from "@playwright/test";
test("all techniques load local samples, transpose, pause and save", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#fretboard");
  if (!(await page.locator(".gl-lab > details").first().getAttribute("open"))) {
    if (
      !(await page
        .locator(".gl-lab > details")
        .first()
        .evaluate((el) => (el as HTMLDetailsElement).open))
    )
      await page.locator(".gl-lab > details > summary").first().click();
  }
  await page.getByLabel("Тоника", { exact: true }).selectOption("11");
  await page
    .getByRole("button", { name: "Лики и движения", exact: true })
    .click();
  const lick = page.getByLabel("Учебная фраза", { exact: true });
  await expect(lick.locator("option")).toHaveCount(20);
  for (const id of ["1", "2", "3", "4", "5", "6", "7"]) {
    await lick.selectOption(id);
    await page.getByRole("button", { name: "▶ Играть", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Ⅱ Пауза", exact: true }),
    ).toBeVisible();
    await page.waitForTimeout(150);
    await page.getByRole("button", { name: "Ⅱ Пауза", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveCount(0);
  }
  await page
    .getByRole("button", { name: "Сохранить текстовый разбор в блокнот" })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem("lad-library-v1")!).songs.some(
          (s: any) => s.bandId === "guitar-practice",
        ),
      ),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Прогрессии", exact: true }).click();
  await page.getByText(/^Выбрать прогрессию ·/).click();
  await expect(page.locator(".gl-catalog button")).toHaveCount(21);
  await page.getByRole("button", { name: "Блюз", exact: true }).click();
  await page.locator(".gl-catalog button").click();
  await expect(page.locator(".gl-chords>span")).toHaveCount(12);
  await page
    .getByRole("button", { name: "Длительности аккордов", exact: true })
    .click();
  await page
    .getByLabel("Длительность аккорда 1", { exact: true })
    .selectOption("2");
  await page.getByRole("button", { name: "▶ Играть", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Ⅱ Пауза", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("keyboard construction checks correct pitches and clears next answer", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await page.goto("/#solfege/chordBuild");
  await expect(
    page.getByRole("group", { name: "Ответ на пианино" }),
  ).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Варианты ответа" }),
  ).toHaveCount(0);
  // Deterministic first task is C major, basic position.
  for (const name of ["C4", "E4", "G4"])
    await page.getByRole("button", { name, exact: true }).click();
  await page.getByRole("button", { name: "Проверить", exact: true }).click();
  await expect(page.locator(".sf-result")).toContainText("Верно!");
  await expect(page.locator(".ak-key.expected")).toHaveCount(3);
  await page.getByRole("button", { name: "Следующее задание →" }).click();
  await expect(page.locator(".ak-key.selected")).toHaveCount(0);
});
test("key matches sorted by shown percent with top5 and expand20", async ({
  page,
}) => {
  await page.goto("/#fretboard");
  if (!(await page.locator(".gl-lab > details").first().getAttribute("open"))) {
    if (
      !(await page
        .locator(".gl-lab > details")
        .first()
        .evaluate((el) => (el as HTMLDetailsElement).open))
    )
      await page.locator(".gl-lab > details > summary").first().click();
  }
  await page
    .getByRole("tab", { name: "Определитель тональности", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Струна 1, лад 1, нота F", exact: true })
    .click();
  await expect(page.locator(".key-match-item")).toHaveCount(5);
  await page.getByRole("button", { name: "Показать больше вариантов" }).click();
  await expect(page.locator(".key-match-item")).toHaveCount(20);
  const values = (await page.locator(".key-match-score").allTextContents()).map(
    (s) => Number(s.match(/\d+/)![0]),
  );
  expect(values).toEqual([...values].sort((a, b) => b - a));
});
test("practice fits desktop and phone, light and dark", async ({ page }) => {
  for (const theme of ["light", "dark"])
    for (const width of [1366, 1024, 390]) {
      await page.setViewportSize({ width, height: 850 });
      await page.goto("/");
      await page.evaluate(
        (t) => localStorage.setItem("lad-theme-v1", t),
        theme,
      );
      await page.goto("/#fretboard");
      if (
        !(await page.locator(".gl-lab > details").first().getAttribute("open"))
      ) {
        if (
          !(await page
            .locator(".gl-lab > details")
            .first()
            .evaluate((el) => (el as HTMLDetailsElement).open))
        )
          await page.locator(".gl-lab > details > summary").first().click();
      }
      await page.reload();
      await page
        .getByRole("button", { name: "Лики и движения", exact: true })
        .click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      if (width === 1366 && theme === "light")
        await page.screenshot({
          path: test.info().outputPath("guitar.png"),
          fullPage: true,
        });
      await page
        .getByRole("button", { name: "Прогрессии", exact: true })
        .click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      if (width === 390 && theme === "dark")
        await page.screenshot({
          path: test.info().outputPath("mobile.png"),
          fullPage: true,
        });
    }
});
