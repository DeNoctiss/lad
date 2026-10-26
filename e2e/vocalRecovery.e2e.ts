import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
const stored = (page: Page) =>
  page.evaluate(
    () => JSON.parse(localStorage.getItem("lad-library-v1")!).vocalDraft,
  );
const standalone = async (page: Page) => {
  await page.goto("/#vocal");
  await expect(page.locator(".vocal-studio")).toBeVisible();
  await page.locator(".vocal-settings-panel > summary").click();
};
function wav(hz: number) {
  const sr = 22050,
    count = sr * 2,
    b = Buffer.alloc(44 + count * 2);
  b.write("RIFF", 0);
  b.writeUInt32LE(b.length - 8, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sr, 24);
  b.writeUInt32LE(sr * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i++)
    b.writeInt16LE(
      Math.round(12000 * Math.sin((i * hz * 2 * Math.PI) / sr)),
      44 + i * 2,
    );
  return b;
}
async function midi(page: Page) {
  const t = [0, 0x90, 69, 100, 0x83, 0x60, 0x80, 69, 0, 0, 0xff, 0x2f, 0],
    b = Buffer.from([
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
    ]);
  await page.getByLabel("Импорт MIDI-файла", { exact: true }).setInputFiles({
    name: "reference.mid",
    mimeType: "audio/midi",
    buffer: b,
  });
  await page
    .getByRole("button", { name: "Создать вокальную партию", exact: true })
    .click();
  await expect.poll(async () => (await stored(page))?.notes[0]?.midi).toBe(69);
}
async function recognize(page: Page, hz: number, hidden = false) {
  await page.getByLabel("Распознать акапеллу", { exact: true }).setInputFiles({
    name: "same.wav",
    mimeType: "audio/wav",
    buffer: wav(hz),
  });
  await page
    .getByRole("button", { name: "Распознать ноты", exact: true })
    .click();
  if (hidden)
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
  await expect(page.locator(".vocal-source-caption")).toContainText(
    "Распознано из акапеллы",
  );
  await expect(page.locator(".vocal-progress")).toHaveCount(0);
  if (hidden)
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: false,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
  expect(
    (await stored(page)).notes.every(
      (n: { midi: number }) =>
        n.midi === Math.round(69 + 12 * Math.log2(hz / 440)),
    ),
  ).toBe(true);
}
test("standalone workspace: editable BPM, octave undo, zoom and persistence", async ({
  page,
}) => {
  await standalone(page);
  await midi(page);
  const bpm = page.getByRole("spinbutton", { name: "Сетка, BPM", exact: true });
  await bpm.fill("");
  await expect(bpm).toHaveValue("");
  await bpm.fill("135");
  await bpm.press("Enter");
  const p = await stored(page);
  expect(p.bpm).toBe(135);
  expect((p.notes[0].duration * 60) / p.bpm).toBe(0.5);
  await page
    .getByRole("button", { name: "На октаву ниже", exact: true })
    .click();
  expect((await stored(page)).notes[0].midi).toBe(57);
  expect((await stored(page)).settings.transpose).toBe(0);
  await page
    .getByRole("button", { name: "Отменить изменение нот", exact: true })
    .click();
  expect((await stored(page)).notes[0].midi).toBe(69);
  await page
    .getByRole("button", { name: "Увеличить масштаб", exact: true })
    .click();
  await expect(page.locator(".vocal-roll-toolbar")).toContainText("140%");
  await page.getByRole("button", { name: "Вся мелодия", exact: true }).click();
  const roll = page.locator(".vocal-roll-scroll");
  await roll.scrollIntoViewIfNeeded();
  const before = await page.locator(".vocal-roll-svg").getAttribute("width");
  await roll.dispatchEvent("wheel", {
    ctrlKey: true,
    deltaY: 200,
    clientX: 500,
  });
  await expect
    .poll(() => page.locator(".vocal-roll-svg").getAttribute("width"))
    .not.toBe(before);
  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("button", { name: "Библиотека", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("button", { name: "Вокальный тренажёр", exact: true })
    .click();
  await page.reload();
  await expect(page.locator(".vocal-note")).toHaveCount(1);
  expect((await stored(page)).bpm).toBe(135);
});
test("first import survives hidden tab; same-name audio replacements and MIDI keep speed", async ({
  page,
}) => {
  await standalone(page);
  const bpm = page.getByLabel("Сетка, BPM", { exact: true });
  await bpm.fill("84");
  await bpm.press("Enter");
  await recognize(page, 220, true);
  await page.getByLabel("Скорость воспроизведения").selectOption("1.25");
  await midi(page);
  let p = await stored(page);
  expect(p.bpm).toBe(120);
  expect(p.audio.acapella.originalBpm).toBe(120);
  expect(p.settings.speed).toBe(1);
  await page
    .getByLabel("Загрузить аудио: Акапелла", { exact: true })
    .setInputFiles({
      name: "same.wav",
      mimeType: "audio/wav",
      buffer: wav(330),
    });
  await expect(page.locator(".vocal-progress")).toHaveCount(0);
  await expect(page.locator(".vocal-success")).toContainText("same.wav");
  await expect(page.locator(".vocal-success")).toContainText("Ноты сохранены");
  expect((await stored(page)).notes[0].midi).toBe(69);
  await recognize(page, 220);
  await midi(page);
  await page.evaluate(() => {
    const w = window as unknown as {
      audioDurations: number[];
      frequencies: number[];
    };
    w.audioDurations = [];
    w.frequencies = [];
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (
      ...args: Parameters<typeof start>
    ) {
      w.audioDurations.push(this.buffer?.duration ?? 0);
      return start.apply(this, args);
    };
    const osc = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (
      ...args: Parameters<typeof osc>
    ) {
      w.frequencies.push(this.frequency.value);
      return osc.apply(this, args);
    };
  });
  await page.getByLabel("Отсчёт в один такт", { exact: true }).uncheck();
  await page
    .getByRole("button", {
      name: "Воспроизвести вокальную партию",
      exact: true,
    })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { audioDurations: number[] }).audioDurations
            .length,
      ),
    )
    .toBeGreaterThan(0);
  const actual = await page.evaluate(() => ({
    durations: (window as unknown as { audioDurations: number[] })
      .audioDurations,
    frequencies: (window as unknown as { frequencies: number[] }).frequencies,
  }));
  expect(actual.durations.some((d) => Math.abs(d - 2) < 0.02)).toBe(true);
  expect(actual.frequencies).toContain(440);
  p = await stored(page);
  expect(p.settings.transpose).toBe(0);
});
test("Osen template plays the full recording from the chorus offset", async ({
  page,
}) => {
  const file = process.env.LAD_ACAPELLA_PATH;
  test.skip(!file, "Set LAD_ACAPELLA_PATH to the private recording");
  await standalone(page);
  await page.locator(".vocal-examples > summary").click();
  await page
    .getByRole("button", { name: "Открыть шаблон «Осень»", exact: true })
    .click();
  await expect(page.locator(".vocal-note")).toHaveCount(58);
  await page
    .getByLabel("Загрузить аудио: Акапелла", { exact: true })
    .setInputFiles(file!);
  await expect(page.locator(".vocal-progress")).toHaveCount(0);
  await expect(
    page.getByRole("switch", { name: "Звук: Акапелла", exact: true }),
  ).toBeEnabled();
  const p = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("lad-library-v1")!).songs.find(
        (s: { id: string }) => s.id === "wildways-tritia-osen-chorus",
      ).vocal,
  );
  expect(p.audio.acapella.offset).toBe(-129.2625);
  expect(p.notes).toHaveLength(58);
  await page.evaluate(() => {
    const w = window as unknown as { offsets: number[] };
    w.offsets = [];
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (
      ...args: Parameters<typeof start>
    ) {
      w.offsets.push(args[1] ?? 0);
      return start.apply(this, args);
    };
  });
  await page.getByLabel("Отсчёт в один такт", { exact: true }).uncheck();
  await page
    .getByRole("button", {
      name: "Воспроизвести вокальную партию",
      exact: true,
    })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { offsets: number[] }).offsets.some(
          (n) => Math.abs(n - 57.45) < 0.01,
        ),
      ),
    )
    .toBe(true);
  expect(
    ((p.settings.loopEnd - p.settings.loopStart) * 60) / p.bpm,
  ).toBeCloseTo(29.7);
});
test("real acapella fixes the observed false upper octave", async ({
  page,
}) => {
  test.setTimeout(180000);
  const file = process.env.LAD_ACAPELLA_PATH;
  test.skip(!file, "Set LAD_ACAPELLA_PATH to the private recording");
  await standalone(page);
  await page
    .getByLabel("Распознать акапеллу", { exact: true })
    .setInputFiles(file!);
  await page
    .getByRole("button", { name: "Распознать ноты", exact: true })
    .click();
  await expect(page.locator(".vocal-source-caption")).toContainText(
    "Распознано из акапеллы",
    { timeout: 150000 },
  );
  const p = await stored(page);
  const n = p.notes.find(
    (n: { start: number; duration: number }) =>
      (n.start * 60) / p.bpm <= 12 &&
      ((n.start + n.duration) * 60) / p.bpm > 12,
  );
  expect(n?.midi).toBe(66);
  await page.getByRole("button", { name: "Вся мелодия", exact: true }).click();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(1441);
});
