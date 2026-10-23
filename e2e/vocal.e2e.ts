import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
const open = async (page: Page) => {
  await page.goto("/#vocal");
  await page.locator(".vocal-examples > summary").click();
  await page
    .locator(".vocal-demo-shelf")
    .getByRole("button", { name: /Плавная фраза/ })
    .click();
  await expect(
    page.getByRole("tab", { name: "Вокальный тренажёр", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".vocal-note")).toHaveCount(14);
};
const stored = (page: Page) =>
  page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("lad-library-v1")!).songs.find(
        (s: { id: string }) => s.id === "lad-vocal-study-0",
      ).vocal,
  );
function wav(hz: number) {
  const sr = 22050,
    frames = sr * 2,
    buffer = Buffer.alloc(44 + frames * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sr, 24);
  buffer.writeUInt32LE(sr * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(frames * 2, 40);
  for (let i = 0; i < frames; i++)
    buffer.writeInt16LE(
      Math.round(12000 * Math.sin((i * hz * 2 * Math.PI) / sr)),
      44 + i * 2,
    );
  return buffer;
}
test("edit notes, undo, theme switch, reload and song metadata editing preserve vocal work", async ({
  page,
}) => {
  await open(page);
  const original = await stored(page);
  await page.locator('[data-vocal-note="study-0-0"] rect').click();
  await page.locator(".vocal-roll-svg").press("ArrowUp");
  expect((await stored(page)).notes[0].midi).toBe(original.notes[0].midi + 1);
  await page
    .getByRole("button", { name: "Отменить изменение нот", exact: true })
    .click();
  expect((await stored(page)).notes).toEqual(original.notes);
  await page
    .getByRole("button", { name: "Повторить изменение нот", exact: true })
    .click();
  const edited = await stored(page);
  await page.getByRole("button", { name: "Включить тёмную тему" }).click();
  expect(await stored(page)).toEqual(edited);
  await page.reload();
  expect(await stored(page)).toEqual(edited);
  await page
    .getByRole("button", { name: "Редактировать", exact: true })
    .click();
  await page
    .getByLabel("Название песни", { exact: true })
    .fill("Моя учебная фраза");
  await page
    .getByRole("button", { name: "Сохранить песню", exact: true })
    .click();
  expect(await stored(page)).toEqual(edited);
});
test("draw, resize and erase a note using the actual piano roll", async ({
  page,
}) => {
  await open(page);
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /Создать вручную/ }).click();
  await page
    .getByRole("button", { name: "Заменить ноты", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Рисовать ноты", exact: true })
    .click();
  await page.locator(".vocal-roll-scroll").scrollIntoViewIfNeeded();
  const rect = await page.locator(".vocal-roll-svg").boundingBox();
  const viewport = await page.locator(".vocal-roll-scroll").boundingBox();
  const x = rect!.x + 20,
    y = viewport!.y + 150;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 80, y);
  await page.mouse.up();
  await expect(page.locator(".vocal-note")).toHaveCount(1);
  const value = await stored(page);
  expect(value.notes[0].duration).toBeGreaterThan(1);
  await page.getByRole("button", { name: "Удалять ноты", exact: true }).click();
  await page.locator(".vocal-note rect").click();
  await expect(page.locator(".vocal-note")).toHaveCount(0);
});
test("MIDI import lets user choose a track; corrupt JSON leaves saved notes intact", async ({
  page,
}) => {
  await open(page);
  page.on("dialog", (d) => d.accept());
  const track = [0, 0x90, 60, 100, 0x83, 0x60, 0x80, 60, 0, 0, 0xff, 0x2f, 0];
  const buffer = Buffer.from([
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
    track.length,
    ...track,
  ]);
  await page
    .getByLabel("Импорт MIDI-файла", { exact: true })
    .setInputFiles({ name: "lead.mid", mimeType: "audio/midi", buffer });
  await expect(
    page.getByRole("dialog", { name: "Выберите MIDI-дорожку" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Создать вокальную партию", exact: true })
    .click();
  expect((await stored(page)).notes).toHaveLength(1);
  const before = await stored(page);
  await page
    .getByLabel("Импорт JSON-файла вокала", { exact: true })
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":1}'),
    });
  await expect(page.getByRole("alert")).toContainText("неверный формат");
  expect(await stored(page)).toEqual(before);
});
test("waveform and acapella recognition use real decoded PCM in the worker", async ({
  page,
}) => {
  await open(page);
  page.on("dialog", (d) => d.accept());
  await page
    .getByLabel("Распознать акапеллу", { exact: true })
    .setInputFiles({ name: "a3.wav", mimeType: "audio/wav", buffer: wav(220) });
  await page.getByLabel("Алгоритм распознавания").selectOption("classic");
  await page
    .getByRole("button", { name: "Распознать ноты", exact: true })
    .click();
  await expect(page.locator(".vocal-success")).toContainText("a3.wav", {
    timeout: 20000,
  });
  await expect(page.locator(".vocal-source-caption")).toContainText(
    "Распознано из акапеллы",
    { timeout: 20000 },
  );
  expect(
    (await stored(page)).notes.every((n: { midi: number }) => n.midi === 57),
  ).toBe(true);
  await expect(page.locator(".vocal-wave-path")).toHaveCount(1);
  await page.getByLabel("Скорость воспроизведения").selectOption("0.75");
  await page
    .getByRole("button", { name: "На полтона выше", exact: true })
    .click();
  await page.getByLabel("Отсчёт в один такт", { exact: true }).uncheck();
  await page
    .getByRole("button", {
      name: "Воспроизвести вокальную партию",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Приостановить вокальную партию",
      exact: true,
    }),
  ).toBeVisible({ timeout: 20000 });
  await expect
    .poll(async () =>
      Number(
        await page
          .getByLabel("Позиция воспроизведения", { exact: true })
          .inputValue(),
      ),
    )
    .toBeGreaterThan(0.15);
  await page
    .getByRole("button", {
      name: "Приостановить вокальную партию",
      exact: true,
    })
    .click();
  await page.getByRole("tab", { name: "Текст и аккорды", exact: true }).click();
  await expect(page.locator(".vocal-studio")).toBeHidden();
  await page
    .getByRole("tab", { name: "Вокальный тренажёр", exact: true })
    .click();
  await expect(page.locator(".vocal-wave-path")).toHaveCount(1);
  await expect(
    page.getByRole("switch", { name: "Звук: Акапелла", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", {
      name: "Воспроизвести вокальную партию",
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("a3.wav · загрузите повторно", { exact: true }),
  ).toBeVisible();
});
test("microphone analysis shows a test tone and releases tracks on song tab change", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => {
        const ctx = new AudioContext(),
          oscillator = ctx.createOscillator(),
          output = ctx.createMediaStreamDestination();
        oscillator.frequency.value = 220;
        oscillator.connect(output);
        oscillator.start();
        await ctx.resume();
        (window as unknown as { testMic: MediaStream }).testMic = output.stream;
        return output.stream;
      },
    });
  });
  await open(page);
  await page.getByRole("button", { name: "Тренировка", exact: true }).click();
  await page
    .locator(".vocal-controls")
    .getByRole("button", { name: "Включить микрофон", exact: true })
    .click();
  await expect(page.locator(".vocal-current-note")).toHaveText("A3", {
    timeout: 15000,
  });
  await page.getByLabel("Отсчёт в один такт", { exact: true }).uncheck();
  await page
    .getByRole("button", {
      name: "Воспроизвести вокальную партию",
      exact: true,
    })
    .click();
  await expect
    .poll(async () => page.locator(".vocal-live-trace").getAttribute("d"))
    .toMatch(/^M/);
  await expect(page.locator(".vocal-gauge strong")).not.toHaveText("—");
  await page.getByRole("tab", { name: "Текст и аккорды", exact: true }).click();
  expect(
    await page.evaluate(() =>
      (window as unknown as { testMic: MediaStream }).testMic
        .getTracks()
        .every((t) => t.readyState === "ended"),
    ),
  ).toBe(true);
});
test("denied microphone permission gives an actionable error", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: () =>
        Promise.reject(new DOMException("denied", "NotAllowedError")),
    }),
  );
  await open(page);
  await page
    .locator(".vocal-controls")
    .getByRole("button", { name: "Включить микрофон", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Доступ к микрофону отклонён",
  );
});
for (const viewport of [
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
  { width: 768, height: 900 },
  { width: 390, height: 844 },
])
  test(`vocal layout at ${viewport.width}px has readable text and local scrolling`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await open(page);
    await page.getByRole("button", { name: "Тренировка", exact: true }).click();
    const dimensions = await page.evaluate(() => ({
      page: document.documentElement.scrollWidth,
      width: innerWidth,
      small: [
        ...document.querySelectorAll(
          ".vocal-studio button,.vocal-studio label,.vocal-studio small,.vocal-studio text",
        ),
      ].filter(
        (e) =>
          e.getBoundingClientRect().height > 0 &&
          parseFloat(getComputedStyle(e).fontSize) < 14,
      ).length,
    }));
    expect(dimensions.page).toBeLessThanOrEqual(dimensions.width + 1);
    expect(dimensions.small).toBe(0);
    const roll = await page.locator(".vocal-roll-scroll").boundingBox();
    const transport = await page.locator(".vocal-transport").boundingBox();
    expect(transport!.y).toBeGreaterThan(roll!.y + roll!.height);
    await page.getByRole("button", { name: "Включить тёмную тему" }).click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(viewport.width + 1);
  });
