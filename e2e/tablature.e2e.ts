import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function newPart(page: Page, name: string) {
  await page.goto("/#song/morning");
  await page.getByRole("tab", { name: /Табулатуры/ }).click();
  await page.getByRole("button", { name: "Партия", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Название партии", exact: true })
    .fill(name);
  return page.getByRole("dialog");
}
async function savedPart(page: Page, name: string) {
  return page.evaluate(
    (name) =>
      JSON.parse(localStorage.getItem("lad-library-v1")!)
        .songs.find((song: { id: string }) => song.id === "morning")
        .parts.find((part: { name: string }) => part.name === name),
    name,
  );
}

test("rhythmic notation renders links, chords and pauses; invalid changes cannot replace the saved score", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const dialog = await newPart(page, "Ритмическое соло");
  await dialog.getByRole("button", { name: "Запись нот", exact: true }).click();
  const notation = dialog.getByRole("textbox", {
    name: "Ритмическая запись",
    exact: true,
  });
  const text = "1:5~h@8 1:7~p@8 1:5@4 r@2 | [1:0,2:1,3:2]@2 1:5~b1@4 1:5~v@4";
  await notation.fill(text);
  await expect(
    dialog.getByRole("button", { name: "Сохранить партию" }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "Применить запись" }).click();
  const preview = dialog.locator(".part-editor-form > .tab-score-view");
  await expect(
    preview.locator(".tab-score-link-label").filter({ hasText: /^H$/ }),
  ).toBeVisible();
  await expect(
    preview.locator(".tab-score-link-label").filter({ hasText: /^P$/ }),
  ).toBeVisible();
  await expect(preview.locator(".tab-score-rest-label")).toContainText("пауза");
  await expect(
    dialog.getByRole("button", { name: "Сохранить партию" }),
  ).toBeEnabled();
  await notation.fill("1:5~h@1");
  await dialog.getByRole("button", { name: "Применить запись" }).click();
  await expect(dialog.locator(".part-validation")).toContainText("Такт 1");
  await expect(
    dialog.getByRole("button", { name: "Сохранить партию" }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "Отменить правки записи" }).click();
  await dialog.getByRole("button", { name: "Сохранить партию" }).click();
  const part = await savedPart(page, "Ритмическое соло");
  expect(part.format).toBe("visual");
  expect(part.score.measures).toHaveLength(2);
  expect(part.score.measures[0].events[0].notes[0].link).toBe("h");
  expect(part.score.measures[1].events[0].notes).toHaveLength(3);
  await page.reload();
  await page.getByRole("tab", { name: /Табулатуры/ }).click();
  const card = page
    .locator(".part-card")
    .filter({ hasText: "Ритмическое соло" });
  await expect(card.locator(".tab-score-measure")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Редактировать Ритмическое соло" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Запись нот", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Ритмическая запись", exact: true }),
  ).toHaveValue(/1:5~h@8/);
  expect(errors).toEqual([]);
});

test("visual guitar controls build a valid hammer without copying its outgoing link to the target", async ({
  page,
}) => {
  const dialog = await newPart(page, "Соло на схеме");
  await dialog
    .getByRole("button", { name: "Восьмая, 1/8", exact: true })
    .click();
  await dialog
    .getByRole("spinbutton", { name: "Лад · 0–24", exact: true })
    .fill("5");
  await dialog
    .getByRole("button", { name: "Добавить ноту", exact: true })
    .click();
  await dialog
    .getByRole("combobox", {
      name: "Связь со следующей нотой на этой струне",
      exact: true,
    })
    .selectOption("h");
  await expect(
    dialog.getByRole("button", { name: "Сохранить партию" }),
  ).toBeDisabled();
  await dialog
    .getByRole("button", { name: "Добавить ноту", exact: true })
    .click();
  await dialog
    .getByRole("spinbutton", { name: "Лад · 0–24", exact: true })
    .fill("7");
  await expect(
    dialog.getByRole("combobox", {
      name: "Связь со следующей нотой на этой струне",
      exact: true,
    }),
  ).toHaveValue("");
  await expect(
    dialog.getByRole("button", { name: "Сохранить партию" }),
  ).toBeEnabled();
  await dialog
    .getByRole("combobox", { name: "Струна", exact: true })
    .selectOption("2");
  await dialog
    .getByRole("spinbutton", { name: "Лад · 0–24", exact: true })
    .fill("1");
  await dialog
    .getByRole("button", { name: "Нота в этот момент", exact: true })
    .click();
  await dialog
    .getByRole("checkbox", { name: "v · вибрато", exact: true })
    .check();
  await dialog.getByRole("button", { name: "Сохранить партию" }).click();
  const part = await savedPart(page, "Соло на схеме");
  expect(part.score.measures[0].events[0].notes[0]).toMatchObject({
    fret: 5,
    link: "h",
  });
  expect(part.score.measures[0].events[1].notes).toEqual([
    { lane: "1", fret: 7, effects: [] },
    { lane: "2", fret: 1, effects: ["v"] },
  ]);
});

test("drum grid toggles simultaneous hits with keyboard and persists effects", async ({
  page,
}) => {
  const dialog = await newPart(page, "Сетка ударных");
  await dialog
    .getByRole("combobox", { name: "Инструмент", exact: true })
    .selectOption("Барабаны");
  await dialog
    .getByRole("button", { name: "Добавить удар", exact: true })
    .click();
  const bass = dialog.getByRole("button", {
    name: /^Такт 1, событие 1, Бас-барабан:/,
  });
  await bass.focus();
  await bass.press("Space");
  await expect(bass).toHaveAttribute("aria-pressed", "true");
  await dialog
    .getByRole("combobox", { name: "Дорожка", exact: true })
    .selectOption("HH");
  await dialog
    .getByRole("checkbox", { name: "Открытый хай-хэт", exact: true })
    .check();
  await dialog
    .getByRole("button", { name: "Добавить удар", exact: true })
    .click();
  await dialog
    .getByRole("combobox", { name: "Дорожка", exact: true })
    .selectOption("SD");
  await dialog
    .getByRole("button", { name: "Удар в этот момент", exact: true })
    .click();
  await dialog.getByRole("checkbox", { name: "Акцент", exact: true }).check();
  await dialog.getByRole("button", { name: "Сохранить партию" }).click();
  const part = await savedPart(page, "Сетка ударных");
  expect(part.score.kind).toBe("drums");
  expect(
    part.score.measures[0].events[0].notes.map(
      (note: { lane: string }) => note.lane,
    ),
  ).toEqual(["HH", "BD"]);
  expect(
    part.score.measures[0].events[1].notes.find(
      (note: { lane: string }) => note.lane === "SD",
    ).effects,
  ).toEqual(["accent"]);
  await page.reload();
  await page.getByRole("tab", { name: /Табулатуры/ }).click();
  await expect(
    page
      .locator(".part-card")
      .filter({ hasText: "Сетка ударных" })
      .locator(".tab-score-drum-table"),
  ).toBeVisible();
});

test("duration dots and triplets, bar copying, wrapping rows and meter validation work", async ({
  page,
}) => {
  const dialog = await newPart(page, "Размер и длительности");
  await dialog
    .getByRole("checkbox", { name: "С точкой · +½", exact: true })
    .check();
  await dialog
    .getByRole("button", { name: "Добавить паузу", exact: true })
    .click();
  await dialog
    .getByRole("checkbox", { name: "Триоль · ⅔", exact: true })
    .check();
  await expect(
    dialog.getByRole("checkbox", { name: "С точкой · +½", exact: true }),
  ).not.toBeChecked();
  await dialog
    .getByRole("checkbox", { name: "Триоль · ⅔", exact: true })
    .uncheck();
  await dialog.getByRole("button", { name: "Целая, 1/1", exact: true }).click();
  for (let i = 0; i < 4; i++)
    await dialog
      .getByRole("button", { name: "Копировать такт", exact: true })
      .click();
  await expect(
    dialog.locator(".visual-tab-preview .tab-score-measure"),
  ).toHaveCount(5);
  const bars = dialog.locator(".visual-tab-preview .tab-score-measure");
  const first = await bars.nth(0).boundingBox();
  const fourth = await bars.nth(3).boundingBox();
  expect(Math.abs(first!.y - fourth!.y)).toBeGreaterThan(10);
  await dialog
    .getByRole("combobox", { name: "Долей в такте", exact: true })
    .selectOption("3");
  await expect(
    dialog.getByRole("button", { name: "Сохранить партию" }),
  ).toBeDisabled();
  await dialog
    .getByRole("combobox", { name: "Долей в такте", exact: true })
    .selectOption("4");
  await dialog.getByRole("button", { name: "Сохранить партию" }).click();
  const part = await savedPart(page, "Размер и длительности");
  expect(
    new Set(part.score.measures.map((bar: { id: string }) => bar.id)).size,
  ).toBe(5);
  expect(
    new Set(
      part.score.measures.flatMap((bar: { events: { id: string }[] }) =>
        bar.events.map((event) => event.id),
      ),
    ).size,
  ).toBe(5);
});

test("all tutorial examples render and legacy text survives editing the visual representation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/#song/morning");
  await page.getByRole("tab", { name: /Табулатуры/ }).click();
  await page.locator(".parts-panel > .tab-guide > summary").click();
  for (let i = 0; i < 6; i++) {
    await page
      .getByRole("combobox", { name: "Пример табулатуры", exact: true })
      .selectOption(String(i));
    await expect(page.locator(".tab-guide-body .tab-score-view")).toBeVisible();
  }
  const original = (await savedPart(page, "Основной рисунок")).content;
  await page
    .getByRole("button", { name: "Редактировать Основной рисунок" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("textbox", { name: "Табулатура", exact: true }),
  ).toHaveValue(original);
  await dialog
    .getByRole("button", { name: "Визуальная партия", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Добавить ноту", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Сохранить партию" }).click();
  expect((await savedPart(page, "Основной рисунок")).content).toBe(original);
  await page
    .getByRole("button", { name: "Редактировать Основной рисунок" })
    .click();
  await dialog
    .getByRole("button", { name: "Обычный текст", exact: true })
    .click();
  await expect(
    dialog.getByRole("textbox", { name: "Табулатура", exact: true }),
  ).toHaveValue(original);
  await dialog.getByRole("button", { name: "Сохранить партию" }).click();
  expect(
    (await savedPart(page, "Основной рисунок")).score.measures[0].events,
  ).toHaveLength(1);
  expect(errors).toEqual([]);
});

test("structured backups round-trip and phone editor stays within viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const dialog = await newPart(page, "Бас на телефоне");
  await dialog
    .getByRole("combobox", { name: "Инструмент", exact: true })
    .selectOption("Бас-гитара");
  await dialog.getByRole("button", { name: "Запись нот", exact: true }).click();
  await dialog
    .getByRole("textbox", { name: "Ритмическая запись", exact: true })
    .fill("4:0~pm@4 4:3~h@8 4:5@8 r@2");
  await dialog.getByRole("button", { name: "Применить запись" }).click();
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await dialog.getByRole("button", { name: "Сохранить партию" }).click();
  const original = await savedPart(page, "Бас на телефоне");
  const json = await page.evaluate(
    () => localStorage.getItem("lad-library-v1")!,
  );
  page.once("dialog", (prompt) => prompt.accept());
  await page.locator("input[type=file]").setInputFiles({
    name: "visual.json",
    mimeType: "application/json",
    buffer: Buffer.from(json),
  });
  await page.reload();
  expect(await savedPart(page, "Бас на телефоне")).toEqual(original);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test("custom tuning survives a guitar role change and cancelled close preserves the draft", async ({
  page,
}) => {
  const dialog = await newPart(page, "Бережный редактор");
  await dialog
    .getByRole("textbox", { name: /^Строй \/ обозначения дорожек/ })
    .fill("D A D G B e");
  await dialog
    .getByRole("combobox", { name: "Инструмент", exact: true })
    .selectOption("Соло-гитара");
  await expect(
    dialog.getByRole("textbox", { name: /^Строй \/ обозначения дорожек/ }),
  ).toHaveValue("D A D G B e");
  await dialog
    .getByRole("button", { name: "Добавить ноту", exact: true })
    .click();
  page.once("dialog", (prompt) => prompt.dismiss());
  await dialog.getByRole("button", { name: "Отмена", exact: true }).click();
  await expect(dialog).toBeVisible();
  await expect(
    dialog
      .locator(".visual-tab-event-list")
      .getByRole("button", { name: "Событие 1", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Сохранить партию" }).click();
  expect((await savedPart(page, "Бережный редактор")).tuning).toBe(
    "D A D G B e",
  );
});
