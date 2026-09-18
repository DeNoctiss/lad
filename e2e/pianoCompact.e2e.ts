import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function editor(page: Page, instrument: string, name: string) {
  await page.goto("/#song/morning");
  await page.getByRole("tab", { name: /Табулатуры/ }).click();
  await page.getByRole("button", { name: "Партия", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("textbox", { name: "Название партии", exact: true })
    .fill(name);
  await dialog
    .getByRole("combobox", { name: "Инструмент", exact: true })
    .selectOption(instrument);
  return dialog;
}

test("consecutive guitar bars form one compact strip inside one accordion", async ({
  page,
}) => {
  const dialog = await editor(page, "Ритм-гитара", "Соединённые такты");
  await dialog.getByRole("button", { name: "Запись нот", exact: true }).click();
  await dialog
    .getByRole("textbox", { name: "Ритмическая запись", exact: true })
    .fill("1:5~h@1 | 1:7@1 | r@1");
  await dialog.getByRole("button", { name: "Применить запись" }).click();
  await dialog.getByRole("button", { name: "Сохранить партию" }).click();
  const card = page
    .locator(".part-card")
    .filter({ hasText: "Соединённые такты" });
  await expect(card.locator(".tab-score-strip")).toHaveCount(1);
  const bars = card.locator(".tab-score-measure");
  await expect(bars).toHaveCount(3);
  const first = await bars.nth(0).boundingBox();
  const second = await bars.nth(1).boundingBox();
  expect(Math.abs(first!.y - second!.y)).toBeLessThan(2);
  expect(Math.abs(first!.x + first!.width - second!.x)).toBeLessThan(2);
  expect(first!.height).toBeLessThan(340);
  await card.locator(".part-title").click();
  await expect(card.locator(".tab-score-view")).toHaveCount(0);
  await card.locator(".part-title").click();
  await expect(card.locator(".tab-score-strip")).toBeVisible();
});

test("dense sixteenth bars scroll horizontally inside the part block", async ({
  page,
}) => {
  const dialog = await editor(page, "Ритм-гитара", "Плотные такты");
  await dialog.getByRole("button", { name: "Запись нот", exact: true }).click();
  const notes = Array.from({ length: 16 }, (_, i) => `1:${i % 12}@16`).join(
    " ",
  );
  await dialog
    .getByRole("textbox", { name: "Ритмическая запись", exact: true })
    .fill(`${notes} | ${notes} | ${notes}`);
  await dialog.getByRole("button", { name: "Применить запись" }).click();
  await dialog.getByRole("button", { name: "Сохранить партию" }).click();
  const card = page.locator(".part-card").filter({ hasText: "Плотные такты" });
  const strip = card.locator(".tab-score-strip");
  const stripBox = await strip.boundingBox();
  const measures = card.locator(".tab-score-measure");
  const firstBox = await measures.nth(0).boundingBox();
  const thirdBox = await measures.nth(2).boundingBox();
  expect(firstBox!.width).toBeGreaterThan(stripBox!.width / 4);
  expect(thirdBox!.x + thirdBox!.width - firstBox!.x).toBeGreaterThan(
    stripBox!.width,
  );
  expect(await strip.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(
    true,
  );
});

test("piano notation switches between keys and roll without changing notes and persists", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const dialog = await editor(page, "Пианино", "Клавишная партия");
  await dialog.getByRole("button", { name: "Запись нот", exact: true }).click();
  const source = dialog.getByRole("textbox", {
    name: "Ритмическая запись",
    exact: true,
  });
  await source.fill("[C4,E4,G4]@2 C#4@4 r@4 | F4~tie@1 | F4@1");
  await dialog.getByRole("button", { name: "Применить запись" }).click();
  await dialog.getByRole("button", { name: "Клавиши", exact: true }).click();
  await dialog.getByRole("button", { name: /Такт 1, событие 1: C4/ }).click();
  await expect(dialog.locator('.piano-key[data-note="C4"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(dialog.locator('.piano-key[data-note="E4"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await dialog.getByRole("button", { name: "Пиано-ролл", exact: true }).click();
  await expect(dialog.locator(".piano-roll")).toBeVisible();
  await expect(dialog.locator(".piano-roll-note")).toHaveCount(6);
  await dialog.getByRole("button", { name: "Клавиши", exact: true }).click();
  await expect(source).toHaveValue(/\[C4,E4,G4\]@2/);
  await dialog.getByRole("button", { name: "Сохранить партию" }).click();
  await page.reload();
  await page.getByRole("tab", { name: /Табулатуры/ }).click();
  const card = page
    .locator(".part-card")
    .filter({ hasText: "Клавишная партия" });
  await expect(card.locator(".piano-notation")).toBeVisible();
  await card.getByRole("button", { name: "Пиано-ролл", exact: true }).click();
  await expect(card.locator(".piano-roll-note")).toHaveCount(6);
  const json = await page.evaluate(
    () => localStorage.getItem("lad-library-v1")!,
  );
  page.once("dialog", (prompt) => prompt.accept());
  await page.locator('input[type="file"]').setInputFiles({
    name: "piano.json",
    mimeType: "application/json",
    buffer: Buffer.from(json),
  });
  await page.reload();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("lad-library-v1")!).songs[0].parts.at(
          -1,
        ).score.kind,
    ),
  ).toBe("piano");
  expect(errors).toEqual([]);
});

test("piano keyboard enters chords with duration and supports narrow screens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const dialog = await editor(page, "Пианино", "Пианино пальцами");
  await dialog.locator('.piano-key[data-note="C4"]').click();
  await dialog.locator('.piano-key[data-note="E4"]').click();
  await dialog.locator('.piano-key[data-note="G4"]').click();
  await dialog
    .getByRole("button", { name: "Половинная, 1/2", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Сохранить партию" }),
  ).toBeEnabled();
  await dialog.getByRole("button", { name: "Пиано-ролл", exact: true }).click();
  await expect(dialog.locator(".piano-roll-note")).toHaveCount(3);
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await dialog.getByRole("button", { name: "Сохранить партию" }).click();
  const events = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("lad-library-v1")!).songs[0].parts.at(-1)
        .score.measures[0].events,
  );
  expect(events).toHaveLength(1);
  expect(events[0].duration).toBe(2);
  expect(events[0].notes.map((note: { lane: string }) => note.lane)).toEqual([
    "C4",
    "E4",
    "G4",
  ]);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});
