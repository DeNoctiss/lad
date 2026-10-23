import { test, expect, type Page } from "@playwright/test";
import { createVocalProject } from "../src/lib/vocal/model";
const notes = [
  { id: "main", midi: 60, start: 2, duration: 2 },
  { id: "short", midi: 64, start: 8.137, duration: 0.087 },
];
const stored = (page: Page) =>
  page.evaluate(
    () => JSON.parse(localStorage.getItem("lad-library-v1")!).vocalDraft.notes,
  );
const part = (page: Page, action: string, id = "main") =>
  page.locator(`[data-vocal-note="${id}"] [data-note-action="${action}"]`);
const undo = (page: Page) =>
  page.getByRole("button", { name: "Отменить изменение нот", exact: true });
async function open(page: Page) {
  await page.goto("/#vocal");
  const project = createVocalProject(120);
  project.length = 16;
  project.settings.loopEnd = 16;
  project.notes = notes;
  await page
    .getByLabel("Импорт JSON-файла вокала", { exact: true })
    .setInputFiles({
      name: "roll.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(project)),
    });
  await expect(page.locator(".vocal-note")).toHaveCount(2);
  await page.locator(".vocal-roll-scroll").scrollIntoViewIfNeeded();
}
async function drag(
  page: Page,
  action: string,
  dx: number,
  dy = 0,
  finish = true,
) {
  const box = (await part(page, action).boundingBox())!;
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 6 });
  if (finish) await page.mouse.up();
}
test("both edges resize both ways; middle moves; cursors and undo agree", async ({
  page,
}) => {
  await open(page);
  await part(page, "move").click();
  await expect(undo(page)).toBeDisabled();
  for (const [action, hint] of [
    ["resize-start", "Левый край"],
    ["resize-end", "Правый край"],
  ]) {
    await part(page, action).hover();
    await expect(part(page, action)).toHaveCSS("cursor", "ew-resize");
    await expect(page.locator(".vocal-drag-hint")).toContainText(hint);
  }
  for (const [action, dx, start, duration] of [
    ["resize-start", -24, 1.5, 2.5],
    ["resize-start", 24, 2.5, 1.5],
    ["resize-end", 24, 2, 2.5],
    ["resize-end", -24, 2, 1.5],
  ] as const) {
    await drag(page, action, dx);
    expect((await stored(page))[0]).toMatchObject({
      start,
      duration,
      midi: 60,
    });
    await undo(page).click();
  }
  await part(page, "move").hover();
  await expect(part(page, "move")).toHaveCSS("cursor", "grab");
  await drag(page, "move", 48, -24);
  expect((await stored(page))[0]).toMatchObject({
    start: 3,
    duration: 2,
    midi: 61,
  });
  await undo(page).click();
  expect(await stored(page)).toEqual(notes);
});
test("Escape and cancelled pointer do not save unfinished gestures", async ({
  page,
}) => {
  await open(page);
  await drag(page, "resize-start", -24, 0, false);
  await page.locator(".vocal-roll-svg").press("Escape");
  await page.mouse.up();
  expect(await stored(page)).toEqual(notes);
  await expect(undo(page)).toBeDisabled();
  await drag(page, "resize-end", 24, 0, false);
  await page
    .locator(".vocal-roll-svg")
    .dispatchEvent("pointercancel", { pointerId: 1 });
  await page.mouse.up();
  expect(await stored(page)).toEqual(notes);
});
test("grid selection changes visible subdivision and drag snap without quantizing existing notes", async ({
  page,
}) => {
  await open(page);
  const select = page.getByLabel("Шаг сетки", { exact: true });
  for (const [step, width] of [
    [1, 48],
    [0.5, 24],
    [0.25, 12],
    [1 / 3, 16],
  ]) {
    await select.selectOption(String(step));
    await expect(page.locator('pattern[id$="-step"]')).toHaveAttribute(
      "width",
      String(width),
    );
    await expect(page.locator("[data-grid-step]")).toHaveCount(1);
    expect(await stored(page)).toEqual(notes);
  }
  await select.selectOption(".5".replace(/^\./, "0."));
  await drag(page, "resize-end", 20);
  expect((await stored(page))[0].duration).toBe(2.5);
  await undo(page).click();
  await select.selectOption("1");
  await drag(page, "resize-end", 20);
  expect((await stored(page))[0].duration).toBe(2);
  await select.selectOption("0.25");
  for (let i = 0; i < 5; i++)
    await page
      .getByRole("button", { name: "Уменьшить масштаб", exact: true })
      .click();
  await expect(page.locator(".vocal-grid-zoom-hint")).toBeVisible();
  await expect(page.locator("[data-grid-step]")).toHaveCount(0);
});
test("click and keyboard pitch editing preserve short off-grid MIDI timings", async ({
  page,
}) => {
  await open(page);
  await part(page, "move", "short").click();
  expect(await stored(page)).toEqual(notes);
  await page.locator(".vocal-roll-svg").press("ArrowUp");
  expect((await stored(page))[1]).toEqual({ ...notes[1], midi: 65 });
});
