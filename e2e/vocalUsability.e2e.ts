import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
const draft = (page: Page) =>
  page.evaluate(
    () => JSON.parse(localStorage.getItem("lad-library-v1")!).vocalDraft,
  );
const open = async (page: Page) => {
  await page.goto("/#vocal");
  await expect(page.locator(".vocal-studio")).toBeVisible();
};
const generatedMidi = (pitch = 69) => {
  const t = [0, 0x90, pitch, 100, 0x83, 0x60, 0x80, pitch, 0, 0, 0xff, 0x2f, 0];
  return {
    name: "replacement.mid",
    mimeType: "audio/midi",
    buffer: Buffer.from([
      77,
      84,
      104,
      100,
      0,
      0,
      0,
      6,
      0,
      0,
      0,
      1,
      1,
      224,
      77,
      84,
      114,
      107,
      0,
      0,
      0,
      t.length,
      ...t,
    ]),
  };
};
const finishMidi = async (page: Page) =>
  page
    .getByRole("button", { name: "Создать вокальную партию", exact: true })
    .click();

test("home overview and visible trainer tutorial expand without the home promotion", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Услышьте свой прогресс", { exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".vocal-demo-shelf")).toHaveCount(0);
  await expect(page.locator(".hero-features")).not.toHaveAttribute("open", "");
  await page.locator(".hero-features > summary").click();
  await expect(page.locator(".hero-features")).toContainText(
    "Личная библиотека.",
  );
  await expect(page.locator(".hero-features li")).toHaveCount(4);
  await open(page);
  await page.locator(".vocal-help > summary").click();
  await expect(page.locator(".vocal-help li")).toHaveCount(6);
  await page.locator(".vocal-help > summary").click();
  await expect(page.locator(".vocal-help ol")).toBeHidden();
});

test("MIDI replacement resets edits; repeated imports announce success and failed imports preserve notes", async ({
  page,
}) => {
  await open(page);
  const input = page.getByLabel("Импорт MIDI-файла", { exact: true });
  await input.setInputFiles(generatedMidi());
  await finishMidi(page);
  await expect(page.locator(".vocal-success")).toContainText("replacement.mid");
  await page
    .getByRole("button", { name: "На октаву ниже", exact: true })
    .click();
  await page.getByLabel("Скорость воспроизведения").selectOption("1.25");
  await page
    .getByRole("button", { name: "На полтона ниже", exact: true })
    .click();
  await input.setInputFiles(generatedMidi());
  await finishMidi(page);
  await expect.poll(async () => (await draft(page)).notes[0].midi).toBe(69);
  expect((await draft(page)).settings).toMatchObject({
    speed: 1,
    transpose: 0,
    loop: false,
  });
  await expect(
    page.getByRole("button", { name: "Отменить изменение нот", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".vocal-success")).toContainText("1 нота");
  await input.setInputFiles({
    name: "broken.mid",
    mimeType: "audio/midi",
    buffer: Buffer.from("not a midi"),
  });
  await expect(page.locator(".vocal-error")).toBeVisible();
  await expect(page.locator(".vocal-success")).toHaveCount(0);
  expect((await draft(page)).notes[0].midi).toBe(69);
  await input.setInputFiles(generatedMidi(57));
  await finishMidi(page);
  await expect(page.locator(".vocal-error")).toHaveCount(0);
  await expect(page.locator(".vocal-success")).toContainText("Загружен MIDI");
  expect((await draft(page)).notes[0].midi).toBe(57);
});

test("the supplied MIDI exposes its F1 outlier; explicit exclusion is undoable and reimport restores the original", async ({
  page,
}) => {
  const path = process.env.LAD_MIDI_PATH;
  test.skip(!path, "Set LAD_MIDI_PATH to the supplied private MIDI");
  await open(page);
  const input = page.getByLabel("Импорт MIDI-файла", { exact: true });
  await input.setInputFiles(generatedMidi());
  await finishMidi(page);
  await page
    .getByRole("button", { name: "На октаву ниже", exact: true })
    .click();
  await input.setInputFiles(path!);
  await finishMidi(page);
  await expect(page.locator(".vocal-success")).toContainText("995 нот");
  const original = await draft(page);
  expect(Math.min(...original.notes.map((n: { midi: number }) => n.midi))).toBe(
    29,
  );
  const down = page.getByRole("button", {
    name: "На октаву ниже",
    exact: true,
  });
  await down.click();
  const issue = page.getByRole("dialog", {
    name: "Некоторые ноты мешают сдвигу",
  });
  await expect(issue).toContainText("2:57");
  await expect(issue).toContainText("F0");
  expect((await draft(page)).notes).toEqual(original.notes);
  await issue
    .getByRole("button", { name: "Показать ноту F1", exact: true })
    .click();
  await expect(page.locator(".vocal-note-inspector")).toContainText("F1");
  const selected = page.locator(".vocal-note.active rect");
  const rect = await selected.boundingBox(),
    roll = await page.locator(".vocal-roll-scroll").boundingBox();
  expect(rect!.x).toBeGreaterThan(roll!.x);
  expect(rect!.x).toBeLessThan(roll!.x + roll!.width);
  expect(rect!.y).toBeGreaterThan(roll!.y);
  expect(rect!.y).toBeLessThan(roll!.y + roll!.height);
  await down.click();
  await issue
    .getByRole("button", {
      name: "Удалить 1 ноту и сдвинуть",
      exact: true,
    })
    .click();
  expect((await draft(page)).notes).toHaveLength(994);
  expect(
    (await draft(page)).notes.map((n: { midi: number }) => n.midi),
  ).toEqual(
    original.notes
      .filter((n: { midi: number }) => n.midi >= 33)
      .map((n: { midi: number }) => n.midi - 12),
  );
  await page
    .getByRole("button", { name: "Отменить изменение нот", exact: true })
    .click();
  expect((await draft(page)).notes).toEqual(original.notes);
  await input.setInputFiles(path!);
  await finishMidi(page);
  await expect(page.locator(".vocal-note.active")).toHaveCount(0);
  expect(
    (await draft(page)).notes.map((n: { midi: number }) => n.midi),
  ).toEqual(original.notes.map((n: { midi: number }) => n.midi));
  expect(
    await page.locator(".vocal-roll-scroll").evaluate((e) => e.scrollLeft),
  ).toBe(0);
});

for (const width of [1920, 1366, 1024, 390])
  test(`song tabs to vocal uses full width at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/#song/morning");
    await page.getByRole("tab", { name: /Табулатуры/ }).click();
    await page
      .getByRole("tab", { name: "Вокальный тренажёр", exact: true })
      .click();
    await expect(page.locator(".vocal-studio")).toBeVisible();
    for (const mode of ["Редактор", "Тренировка"]) {
      await page.getByRole("button", { name: mode, exact: true }).click();
      const outer = await page.locator(".song-layout-vocal").boundingBox(),
        inner = await page.locator(".song-sheet").boundingBox();
      expect(Math.abs(outer!.width - inner!.width)).toBeLessThan(2);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width + 1);
    }
    await page
      .getByRole("tab", { name: "Текст и аккорды", exact: true })
      .click();
    await expect(page.locator(".song-aside")).toBeVisible();
    await page
      .getByRole("tab", { name: "Вокальный тренажёр", exact: true })
      .click();
    await expect(page.locator(".song-aside")).toHaveCount(0);
  });
