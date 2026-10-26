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

async function applyNotation(page: Page, source: string) {
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Запись нот", exact: true }).click();
  await dialog
    .getByRole("textbox", { name: "Ритмическая запись", exact: true })
    .fill(source);
  await dialog
    .getByRole("button", { name: "Применить запись", exact: true })
    .click();
  await dialog.getByRole("button", { name: "На схеме", exact: true }).click();
}

for (const { instrument, source, lane, fret, blankName } of [
  {
    instrument: "Ритм-гитара",
    source: "1:5",
    lane: "1",
    fret: 7,
    blankName: "Такт 1, позиция 4.5, струна e: ввести ноту",
  },
  {
    instrument: "Бас-гитара",
    source: "1:5",
    lane: "1",
    fret: 7,
    blankName: "Такт 1, позиция 4.5, струна G: ввести ноту",
  },
  {
    instrument: "Барабаны",
    source: "HH:x",
    lane: "HH",
    fret: "x",
    blankName: "Такт 1, позиция 4.5, Хай-хэт: добавить удар",
  },
  {
    instrument: "Пианино",
    source: "C4",
    lane: "C4",
    fret: 0,
    blankName: "Такт 1, позиция 4.5: новое созвучие",
  },
]) {
  test(`last eighth remains clickable after a quarter: ${instrument}`, async ({
    page,
  }) => {
    const name = `Остаток такта · ${instrument}`;
    const dialog = await newPart(page, name);
    await dialog
      .getByRole("combobox", { name: "Инструмент", exact: true })
      .selectOption(instrument);
    await applyNotation(
      page,
      `${source}@8 ${source}@4 ${source}@4 ${source}@4`,
    );
    const lastQuarter = dialog.getByRole("button", {
      name:
        instrument === "Пианино"
          ? /^Такт 1, событие 4:/
          : /^Такт 1\. Событие 4,/,
    });
    await lastQuarter.click();
    await expect(
      dialog.getByRole("button", { name: "Четверть, 1/4", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    const tail = dialog.getByRole("button", { name: blankName, exact: true });
    await expect(tail).toBeVisible();
    if (instrument === "Пианино") await expect(tail).toContainText("1/8");
    if (instrument === "Барабаны")
      await expect(
        dialog.locator(".tab-score-drum-unused").filter({ hasText: "+ 1/8" }),
      ).toHaveCount(1);
    await tail.click();
    await expect(
      dialog.getByRole("button", { name: "Восьмая, 1/8", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    if (instrument === "Пианино")
      await dialog.locator('.piano-key[data-note="C4"]').click();
    else if (instrument !== "Барабаны")
      await dialog.locator(".visual-tab-preview").press("7");
    await expect(dialog.locator(".editor-feedback")).toHaveCount(0);
    await dialog.getByRole("button", { name: "Сохранить партию" }).click();
    const part = await savedPart(page, name);
    expect(part.score.measures).toHaveLength(1);
    const events = part.score.measures[0].events;
    expect(events.map((event: { duration: number }) => event.duration)).toEqual(
      [8, 4, 4, 4, 8],
    );
    expect(events[3].notes).toEqual([
      {
        lane,
        fret:
          instrument === "Ритм-гитара" || instrument === "Бас-гитара"
            ? 5
            : fret,
        effects: [],
      },
    ]);
    expect(events[4]).toMatchObject({
      duration: 8,
      dotted: false,
      triplet: false,
      notes: [{ lane, fret, effects: [] }],
    });
    await page.reload();
    expect((await savedPart(page, name)).score).toEqual(part.score);
  });
}

test("keyboard navigation reaches the last eighth, supports smaller notes and undo", async ({
  page,
}) => {
  const name = "Короткий остаток с клавиатуры";
  const dialog = await newPart(page, name);
  await applyNotation(page, "1:5@8 1:5@4 1:5@4 1:5@4");
  await dialog.getByRole("button", { name: /^Такт 1\. Событие 4,/ }).click();
  const surface = dialog.locator(".visual-tab-preview");
  await surface.press("ArrowRight");
  await expect(
    dialog.getByRole("button", { name: "Восьмая, 1/8", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await surface.press("7");
  await surface.press("Control+z");
  const tail = dialog.getByRole("button", {
    name: "Такт 1, позиция 4.5, струна e: ввести ноту",
    exact: true,
  });
  await expect(tail).toBeVisible();
  await surface.press("Control+Shift+z");
  await expect(tail).toHaveCount(0);
  await surface.press("Control+z");
  await dialog
    .getByRole("button", { name: "Шестнадцатая, 1/16", exact: true })
    .click();
  await surface.press("7");
  await surface.press("Enter");
  await surface.press("9");
  await dialog.getByRole("button", { name: "Сохранить партию" }).click();
  const part = await savedPart(page, name);
  expect(part.score.measures).toHaveLength(1);
  expect(
    part.score.measures[0].events.map(
      (event: { duration: number }) => event.duration,
    ),
  ).toEqual([8, 4, 4, 4, 16, 16]);
});

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
  const preview = dialog.locator(".part-editor-main > .tab-score-view");
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
  await page
    .locator(".part-navigation-item")
    .filter({ hasText: "Ритмическое соло" })
    .click();
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

test("direct guitar entry supports chords, effects, dead notes, undo and persistence", async ({
  page,
}) => {
  const dialog = await newPart(page, "Соло на схеме");
  const surface = dialog.locator(".visual-tab-preview");
  await dialog
    .getByRole("button", { name: "Восьмая, 1/8", exact: true })
    .click();
  await dialog
    .getByRole("button", {
      name: "Такт 1, позиция 1, струна e: ввести ноту",
      exact: true,
    })
    .click();
  await surface.press("5");
  await dialog
    .getByRole("button", { name: "Приёмы и параметры", exact: true })
    .click();
  await dialog
    .getByRole("combobox", { name: "Связь со следующей нотой", exact: true })
    .selectOption("h");
  await expect(
    dialog.getByRole("button", { name: "Сохранить партию" }),
  ).toBeDisabled();
  await surface.press("ArrowRight");
  await surface.press("7");
  await expect(
    dialog.getByRole("combobox", {
      name: "Связь со следующей нотой",
      exact: true,
    }),
  ).toHaveValue("");
  await surface.press("ArrowDown");
  await surface.press("1");
  await surface.press("2");
  await expect(
    dialog.locator(".tab-score-fret").filter({ hasText: /^12$/ }),
  ).toHaveCount(1);
  await surface.press("KeyX");
  await expect(
    dialog.locator(".tab-score-fret").filter({ hasText: /^x$/ }),
  ).toHaveCount(1);
  await surface.press("Control+z");
  await expect(
    dialog.locator(".tab-score-fret").filter({ hasText: /^12$/ }),
  ).toHaveCount(1);
  await surface.press("Control+Shift+z");
  await dialog.getByRole("button", { name: "Бой вниз", exact: true }).click();
  await dialog.getByRole("button", { name: "Сохранить партию" }).click();
  const part = await savedPart(page, "Соло на схеме");
  expect(part.score.measures[0].events[0].notes[0]).toMatchObject({
    fret: 5,
    link: "h",
  });
  expect(part.score.measures[0].events[1].notes).toEqual([
    { lane: "1", fret: 7, effects: [] },
    { lane: "2", fret: "x", effects: [] },
  ]);
  expect(part.score.measures[0].events[1].strum).toBe("down");
  await page.reload();
  expect((await savedPart(page, "Соло на схеме")).score).toEqual(part.score);
});

test("drum grid enters empty cells directly and preserves simultaneous hits", async ({
  page,
}) => {
  const dialog = await newPart(page, "Сетка ударных");
  await dialog
    .getByRole("combobox", { name: "Инструмент", exact: true })
    .selectOption("Барабаны");
  await dialog
    .getByRole("button", {
      name: "Такт 1, позиция 1, Хай-хэт: добавить удар",
      exact: true,
    })
    .click();
  const bass = dialog.getByRole("button", {
    name: /^Такт 1, событие 1, Бас-барабан:/,
  });
  await bass.focus();
  await bass.press("Space");
  await expect(bass).toHaveAttribute("aria-pressed", "true");
  await dialog
    .getByRole("button", {
      name: "Такт 1, позиция 1.5, Хай-хэт: добавить удар",
      exact: true,
    })
    .click();
  await dialog
    .getByRole("button", { name: "Приёмы и параметры", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Открытый хай-хэт", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: /^Такт 1, событие 2, Малый барабан:/ })
    .click();
  await dialog.getByRole("button", { name: "Акцент", exact: true }).click();
  await dialog.getByRole("button", { name: "Сохранить партию" }).click();
  const part = await savedPart(page, "Сетка ударных");
  expect(part.score.kind).toBe("drums");
  expect(
    part.score.measures[0].events[0].notes.map((n: { lane: string }) => n.lane),
  ).toEqual(["HH", "BD"]);
  expect(
    part.score.measures[0].events[1].notes.find(
      (n: { lane: string }) => n.lane === "HH",
    ).effects,
  ).toEqual(["open"]);
  expect(
    part.score.measures[0].events[1].notes.find(
      (n: { lane: string }) => n.lane === "SD",
    ).effects,
  ).toEqual(["accent"]);
  await page.reload();
  expect((await savedPart(page, "Сетка ударных")).score).toEqual(part.score);
});

test("duration dots and triplets, bar copying, wrapping rows and meter validation work", async ({
  page,
}) => {
  const dialog = await newPart(page, "Размер и длительности");
  await dialog.getByRole("button", { name: "С точкой", exact: true }).click();
  await dialog.getByRole("button", { name: "Пауза", exact: true }).click();
  await dialog
    .getByRole("button", { name: "Приёмы и параметры", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Триоль", exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: "С точкой", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await dialog.getByRole("button", { name: "Триоль", exact: true }).click();
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
  await page.locator(".part-workspace > .tab-guide > summary").click();
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
  await dialog.locator(".part-settings > summary").click();
  await dialog
    .getByRole("button", { name: "Визуальная партия", exact: true })
    .click();
  await dialog.locator(".visual-tab-preview").focus();
  await dialog.locator(".visual-tab-preview").press("0");
  await dialog.getByRole("button", { name: "Сохранить партию" }).click();
  expect((await savedPart(page, "Основной рисунок")).content).toBe(original);
  await page
    .getByRole("button", { name: "Редактировать Основной рисунок" })
    .click();
  await dialog.locator(".part-settings > summary").click();
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
  await dialog.locator(".part-sound-settings > summary").click();
  await dialog
    .getByRole("textbox", { name: /^Строй \/ обозначения дорожек/ })
    .fill("D A D G B e");
  await dialog
    .getByRole("combobox", { name: "Инструмент", exact: true })
    .selectOption("Соло-гитара");
  await expect(
    dialog.getByRole("textbox", { name: /^Строй \/ обозначения дорожек/ }),
  ).toHaveValue("D A D G B e");
  await dialog.locator(".visual-tab-preview").focus();
  await dialog.locator(".visual-tab-preview").press("0");
  page.once("dialog", (prompt) => prompt.dismiss());
  await dialog.getByRole("button", { name: "Закрыть", exact: true }).click();
  await expect(dialog).toBeVisible();
  await expect(
    dialog.locator(".tab-score-fret").filter({ hasText: /^0$/ }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Сохранить партию" }).click();
  expect((await savedPart(page, "Бережный редактор")).tuning).toBe(
    "D A D G B e",
  );
});

test("a click on a later beat creates rests, keyboard deletion keeps time, and controls stay readable", async ({
  page,
}) => {
  const dialog = await newPart(page, "Клавиатурный ввод");
  const surface = dialog.locator(".visual-tab-preview");
  await dialog
    .getByRole("button", {
      name: "Такт 1, позиция 3, струна G: ввести ноту",
      exact: true,
    })
    .click();
  await surface.press("1");
  await surface.press("2");
  await surface.press("ArrowDown");
  await surface.press("KeyX");
  await surface.press("Delete");
  await surface.press("ArrowUp");
  await expect(dialog.locator(".tab-score-fret")).toHaveText(["12"]);
  const smallText = await dialog.evaluate((root) =>
    Array.from(
      root.querySelectorAll(
        "button, input, select, summary, p, label, text, small, kbd",
      ),
    )
      .filter((el) => {
        const box = el.getBoundingClientRect();
        return (
          box.width > 0 &&
          box.height > 0 &&
          getComputedStyle(el).visibility !== "hidden" &&
          parseFloat(getComputedStyle(el).fontSize) < 14
        );
      })
      .map((el) => el.textContent?.trim().slice(0, 60)),
  );
  expect(smallText).toEqual([]);
  await dialog.getByRole("button", { name: "Сохранить партию" }).click();
  const part = await savedPart(page, "Клавиатурный ввод");
  expect(part.score.measures[0].events).toHaveLength(3);
  expect(
    part.score.measures[0].events
      .slice(0, 2)
      .every((e: { notes: unknown[] }) => !e.notes.length),
  ).toBe(true);
  expect(part.score.measures[0].events[2].notes).toEqual([
    { lane: "3", fret: 12, effects: [] },
  ]);
});

test("a full bar advances to a new bar and rejects overflowing durations", async ({
  page,
}) => {
  const dialog = await newPart(page, "Полный такт");
  const surface = dialog.locator(".visual-tab-preview");
  await dialog.getByRole("button", { name: "Целая, 1/1", exact: true }).click();
  await surface.press("5");
  await surface.press("ArrowRight");
  await surface.press("7");
  await expect(
    dialog.locator(".visual-tab-preview .tab-score-measure"),
  ).toHaveCount(2);
  await dialog.getByRole("button", { name: "С точкой", exact: true }).click();
  await expect(dialog.locator(".editor-feedback")).toContainText("переполнит");
  await dialog.getByRole("button", { name: "Сохранить партию" }).click();
  expect((await savedPart(page, "Полный такт")).score.measures).toHaveLength(2);
});
