import { expect, test } from "@playwright/test";

const openSong = async (page: import("@playwright/test").Page) => {
  await page.goto("/#song/morning");
  await expect(
    page.getByRole("heading", { name: "House of the Rising Sun", exact: true }),
  ).toBeVisible();
};

test("catalog, navigation, search and favorites work without browser errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".band-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Показать списком" }).click();
  await expect(page.locator(".band-grid")).toHaveClass(/band-list/);
  await page.getByRole("button", { name: "Показать сеткой" }).click();
  await page.getByRole("button", { name: "Классика", exact: true }).click();
  await expect(page.locator(".band-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Все группы", exact: true }).click();
  await page
    .locator(".band-card")
    .filter({ hasText: "Народные напевы" })
    .click();
  await expect(page.locator(".song-row")).toHaveCount(2);
  await page
    .locator(".song-row-title")
    .filter({ hasText: "House of the Rising Sun" })
    .click();
  await expect(page.locator(".song-chord")).toHaveCount(5);
  await expect(page.locator(".lyrics")).toContainText("gambling");
  await page
    .getByRole("button", { name: "Убрать из избранного", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "В избранное", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Поиск групп и песен" })
    .fill("Scarborough");
  await expect(page.locator(".song-row")).toHaveCount(1);
  await page.locator(".song-row-title").click();
  await expect(
    page.getByRole("heading", { name: "Scarborough Fair", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "House of the Rising Sun", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("groups and songs can be created, edited and restored after reload", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Добавить группу", exact: true })
    .click();
  await page
    .getByLabel("Название группы или исполнителя")
    .fill("Проверочная группа");
  await page.getByLabel("Жанр", { exact: true }).fill("Джаз");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Добавить группу" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Проверочная группа", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Редактировать группу" }).click();
  await page
    .getByLabel("Название группы или исполнителя")
    .fill("Новый ансамбль");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await page
    .getByRole("button", { name: "Добавить песню", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Название песни", { exact: true })
    .fill("Новая мелодия");
  await page.getByLabel("Темп, BPM").fill("108");
  await page.getByLabel("Каподастр, лад").fill("2");
  await page
    .locator(".lyrics-editor")
    .fill("{Куплет}\n[Am]Тестовый [F]куплет\n\n{Припев}\n[C]Играем [G]вместе");
  await page.getByRole("button", { name: "Сохранить песню" }).click();
  await expect(
    page.getByRole("heading", { name: "Новая мелодия", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".lyric-line")
      .first()
      .locator(".lyric-chunk > span:last-child"),
  ).toHaveText(["Тестовый", "куплет"]);
  await expect(page.locator(".song-chord")).toHaveCount(4);
  await expect(page.locator(".song-meta")).toContainText("108 BPM");
  await page
    .getByRole("button", { name: "Редактировать", exact: true })
    .click();
  await page
    .getByLabel("Название песни", { exact: true })
    .fill("Сохранённая мелодия");
  await page.getByRole("button", { name: "Сохранить песню" }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Сохранённая мелодия", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".song-meta")).toContainText("Каподастр: 2 лад");
});

test("manual instrument tabs support creation, editing, persistence and confirmed removal", async ({
  page,
}) => {
  await openSong(page);
  await page.getByRole("tab", { name: /Табулатуры/ }).click();
  await page.getByRole("button", { name: "Партия", exact: true }).click();
  await page.getByLabel("Название партии").fill("Новое соло");
  await page
    .getByRole("button", { name: "Обычный текст", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Инструмент", exact: true })
    .selectOption("Соло-гитара");
  await page
    .getByRole("textbox", { name: "Табулатура", exact: true })
    .fill("e |--5h7--8/10--|\nB |------------|");
  await page.getByRole("button", { name: "Добавить такт" }).click();
  await expect(
    page.getByRole("textbox", { name: "Табулатура", exact: true }),
  ).toHaveValue(/5h7--8\/10/);
  await page.getByRole("button", { name: "Сохранить партию" }).click();
  await expect(page.locator(".part-card")).toHaveCount(3);
  await page.getByRole("button", { name: "Редактировать Новое соло" }).click();
  await page.getByLabel("Название партии").fill("Соло на повторе");
  await page.getByRole("button", { name: "Сохранить партию" }).click();
  await page.getByRole("button", { name: "Партия", exact: true }).click();
  await page.getByLabel("Название партии").fill("Барабанный рисунок");
  await page
    .getByRole("button", { name: "Обычный текст", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Инструмент", exact: true })
    .selectOption("Барабаны");
  await expect(
    page.getByRole("textbox", { name: "Табулатура", exact: true }),
  ).toHaveValue(/^CC /);
  await page.getByRole("button", { name: "Сохранить партию" }).click();
  await page.reload();
  await page.getByRole("tab", { name: /Табулатуры/ }).click();
  await expect(page.locator(".part-card")).toHaveCount(4);
  await expect(
    page.locator(".tab-content").filter({ hasText: "5h7--8/10" }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Удалить Соло на повторе" }).click();
  await expect(page.locator(".part-card")).toHaveCount(4);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Удалить Соло на повторе" }).click();
  await expect(page.locator(".part-card")).toHaveCount(3);
});

test("custom chord positions are validated, rendered, edited and saved", async ({
  page,
}) => {
  await page.goto("/#chords");
  await page
    .getByRole("button", { name: "Добавить аккорд", exact: true })
    .click();
  await page.getByLabel("Название аккорда", { exact: true }).fill("Bm (VII)");
  await page.getByLabel("Начальный лад", { exact: true }).fill("7");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Добавить аккорд" })
    .click();
  await expect(page.getByRole("alert")).toContainText("7–11");
  for (const [index, fret] of [7, 9, 9, 7, 7, 7].entries())
    await page
      .getByRole("spinbutton", { name: new RegExp(`^${6 - index}-я струна`) })
      .fill(String(fret));
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Добавить аккорд" })
    .click();
  await page
    .getByRole("searchbox", { name: "Поиск аккорда по названию" })
    .fill("Bm (VII)");
  await expect(page.locator(".chord-card")).toHaveCount(1);
  await expect(page.locator(".chord-card .chord-dot")).toHaveCount(6);
  // Click card to open chord detail page
  await page.locator(".chord-card").click();
  await expect(
    page.getByRole("heading", { name: "Bm (VII)", exact: true }),
  ).toBeVisible();
  // Click the voicing card to edit
  await page.locator(".chord-card").first().click();
  await page.getByLabel("Название аккорда", { exact: true }).fill("Bm VII");
  await page.getByRole("button", { name: "Сохранить изменения" }).click();
  // Navigate back to library and verify
  await page.goto("/#chords");
  await page
    .getByRole("searchbox", { name: "Поиск аккорда по названию" })
    .fill("Bm VII");
  await expect(page.locator(".chord-card")).toHaveCount(1);
});

test("JSON export and confirmed import preserve the complete library; malformed imports do not replace it", async ({
  page,
}) => {
  await page.goto("/");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Экспорт", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^lad-backup-.*\.json$/);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const backup = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  expect(backup.version).toBe(1);
  expect(backup.songs).toHaveLength(4);
  // Built-in chords are generated at runtime; only user-added chords are persisted
  expect(backup.chords).toEqual([]);
  const replacement = {
    version: 1,
    bands: [
      {
        id: "imported",
        name: "Из копии",
        genre: "Акустика",
        color: "sage",
        initials: "ИК",
      },
    ],
    songs: [],
    chords: backup.chords,
  };
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("input[type=file]").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(replacement)),
  });
  await expect(page.locator(".band-card")).toHaveCount(1);
  await expect(page.locator(".band-card")).toContainText("Из копии");
  await page.reload();
  await expect(page.locator(".band-card")).toHaveCount(1);
  await page.locator("input[type=file]").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":1}'),
  });
  await expect(page.getByRole("status")).toContainText("Ошибка импорта");
  await expect(page.locator(".band-card")).toHaveCount(1);
});

test("phone and tablet layouts do not overflow and mobile navigation works", async ({
  page,
}) => {
  for (const width of [390, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.locator(".band-card")).toHaveCount(2);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await openSong(page);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await expect(page.locator(".song-chord")).toHaveCount(5);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Открыть меню" }).click();
  await page.locator(".nav-item").filter({ hasText: "Аккорды" }).click();
  await expect(
    page.getByRole("heading", { name: "Библиотека аккордов", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test("corrupted browser data is not overwritten and a storage failure is visible", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("lad-library-v1", "{broken"),
  );
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText(
    "Исходные данные не перезаписаны",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("lad-library-v1")),
  ).toBe("{broken");
});

test("chord library shows grouped cards and detail page lists all voicings", async ({
  page,
}) => {
  await page.goto("/#chords");
  // C major should exist as a grouped card
  await page
    .getByRole("searchbox", { name: "Поиск аккорда по названию" })
    .fill("C");
  await expect(page.locator(".chord-card-name").first()).toContainText("C");
  // Click the C card (exact match) to navigate to detail page
  await page.getByRole("button", { name: /^C, \d+ аппликатур/ }).click();
  await expect(
    page.getByRole("heading", { name: "C", exact: true }),
  ).toBeVisible();
  // Detail page should show multiple voicings
  const voicingCount = await page.locator(".chord-card").count();
  expect(voicingCount).toBeGreaterThan(1);
  // Back button returns to library
  await page.getByRole("button", { name: "Библиотека аккордов" }).click();
  await expect(
    page.getByRole("heading", { name: "Библиотека аккордов", exact: true }),
  ).toBeVisible();
});

test("song page voicing arrows cycle through variants and persist selection", async ({
  page,
}) => {
  await openSong(page);
  // The song has chords with multiple voicings
  const switcher = page.locator(".song-chord-switcher").first();
  await expect(switcher).toBeVisible();
  // Check position indicator shows 1/N
  await expect(switcher.locator(".song-chord-position")).toContainText(
    /1\/\d+/,
  );
  // Click next arrow
  const nextBtn = switcher.getByRole("button", {
    name: /Следующая аппликатура/,
  });
  await nextBtn.click();
  await expect(switcher.locator(".song-chord-position")).toContainText(
    /2\/\d+/,
  );
  // Reload — selection should persist
  await page.reload();
  await expect(
    page
      .locator(".song-chord-switcher")
      .first()
      .locator(".song-chord-position"),
  ).toContainText(/2\/\d+/);
});
