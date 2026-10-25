import { test, expect } from "@playwright/test";
test("settings survive idle, notices, page tabs, navigation and reload", async ({
  page,
}) => {
  await page.goto("/#fretboard");
  await page.getByLabel("Тоника", { exact: true }).selectOption("11");
  await page.getByRole("button", { name: "Бокс 4", exact: true }).click();
  await page.getByLabel("Подписи", { exact: true }).selectOption("fingers");
  await page.getByRole("tab", { name: "Гаммы", exact: true }).click();
  await page
    .getByRole("tab", { name: "Гитарная практика", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Бокс 4", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Лики и движения", exact: true })
    .click();
  await page.getByLabel("Учебная фраза", { exact: true }).selectOption("6");
  await page.getByLabel("Темп гитарной практики").fill("95");
  await page
    .getByRole("button", { name: "Сохранить текстовый разбор в блокнот" })
    .click();
  await page.waitForTimeout(5100);
  await expect(page.getByLabel("Учебная фраза", { exact: true })).toHaveValue(
    "6",
  );
  await page.goto("/#chords");
  await page.goto("/#fretboard");
  await expect(page.getByLabel("Тоника", { exact: true })).toHaveValue("11");
  await expect(page.getByLabel("Учебная фраза", { exact: true })).toHaveValue(
    "6",
  );
  await page.reload();
  await expect(page.getByLabel("Темп гитарной практики")).toHaveValue("95");
  await expect(
    page.getByRole("button", { name: "▶ Играть", exact: true }),
  ).toBeVisible();
});
test("full neck has frets zero through 24; all-notes fingers are numeric", async ({
  page,
}) => {
  await page.goto("/#fretboard");
  await page.getByRole("button", { name: "Весь гриф", exact: true }).click();
  await page.getByLabel("Подписи", { exact: true }).selectOption("fingers");
  const neck = page.getByRole("img", {
    name: "Гриф: ноты, ступени и движения",
  });
  await expect(neck.locator("text").filter({ hasText: /^24$/ })).toHaveCount(1);
  await expect(neck.locator("[data-position]")).not.toHaveCount(0);
  const digits = await neck
    .locator("[data-position]")
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("data-finger")));
  expect(digits.every((n) => n !== null && /^[0-4]$/.test(n))).toBe(true);
  await page
    .getByRole("button", { name: "Лики и движения", exact: true })
    .click();
  await expect(neck.locator("text").filter({ hasText: /^24$/ })).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
test("finished playback holds last note and hidden tab pauses without changing choices", async ({
  page,
}) => {
  await page.goto("/#fretboard");
  await page
    .getByRole("button", { name: "Лики и движения", exact: true })
    .click();
  await page.getByLabel("Темп гитарной практики").fill("160");
  await page.getByRole("button", { name: "▶ Играть", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Ⅱ Пауза", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "▶ Играть", exact: true }),
  ).toBeVisible({ timeout: 5000 });
  await expect(page.locator(".gl-tab-active")).toHaveCount(1);
  expect(
    await page
      .locator(".gl-tab-active")
      .evaluate((n) => n.parentElement?.getAttribute("aria-label")),
  ).toContain("Нота 4");
  await page.getByRole("button", { name: "▶ Играть", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Ⅱ Пауза", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Гаммы", exact: true }).click();
  await page
    .getByRole("tab", { name: "Гитарная практика", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "▶ Играть", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Темп гитарной практики")).toHaveValue("160");
});
