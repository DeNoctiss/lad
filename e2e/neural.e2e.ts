import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import { createVocalProject } from "../src/lib/vocal/model";
const draft = (page: Page) =>
  page.evaluate(
    () => JSON.parse(localStorage.getItem("lad-library-v1")!).vocalDraft,
  );
function toneWav() {
  const sr = 22050,
    frames = sr * 3,
    b = Buffer.alloc(44 + frames * 2);
  b.write("RIFF");
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
  b.writeUInt32LE(frames * 2, 40);
  for (let i = 0; i < frames; i++) {
    const t = i / sr,
      f = t < 1.5 ? 220 : 440,
      v =
        t > 0.2 && t < 2.7
          ? 0.25 * Math.sin(2 * Math.PI * f * t) +
            0.12 * Math.sin(4 * Math.PI * f * t) +
            0.06 * Math.sin(6 * Math.PI * f * t)
          : 0;
    b.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  return b;
}
async function choose(page: Page) {
  await page.getByLabel("Распознать акапеллу", { exact: true }).setInputFiles({
    name: "octaves.wav",
    mimeType: "audio/wav",
    buffer: toneWav(),
  });
  await expect(page.getByLabel("Алгоритм распознавания")).toHaveValue(
    "basic-pitch",
  );
}
async function seed(page: Page) {
  await page.goto("/#vocal");
  const p = createVocalProject(120);
  p.notes = [{ id: "keep", midi: 60, start: 1, duration: 2 }];
  await page
    .getByLabel("Импорт JSON-файла вокала", { exact: true })
    .setInputFiles({
      name: "keep.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(p)),
    });
  return draft(page);
}
test("first neural import preserves real octaves and supports classic rerun", async ({
  page,
}) => {
  await page.goto("/#vocal");
  await choose(page);
  await page
    .getByRole("button", { name: "Распознать ноты", exact: true })
    .click();
  await expect(page.locator(".vocal-success")).toContainText("octaves.wav", {
    timeout: 90000,
  });
  const p = await draft(page);
  expect(p.source).toContain("Basic Pitch");
  expect(p.notes.some((n: { midi: number }) => n.midi === 57)).toBe(true);
  expect(p.notes.some((n: { midi: number }) => n.midi === 69)).toBe(true);
  expect(
    p.notes.every(
      (n: { start: number; duration: number }) =>
        n.start >= 0 && ((n.start + n.duration) * 60) / p.bpm <= 3.01,
    ),
  ).toBe(true);
  await choose(page);
  await page.getByLabel("Алгоритм распознавания").selectOption("classic");
  await page
    .getByRole("button", { name: "Распознать ноты", exact: true })
    .click();
  await expect(page.locator(".vocal-source-caption")).toContainText(
    "классический",
    { timeout: 30000 },
  );
});
test("failed model download preserves an existing melody", async ({ page }) => {
  const before = await seed(page);
  await page.route("**/models/basic-pitch/model.json", (r) => r.abort());
  await choose(page);
  await page
    .getByRole("button", { name: "Распознать ноты", exact: true })
    .click();
  await expect(page.getByText(/Попробуйте прежний алгоритм/)).toBeVisible({
    timeout: 60000,
  });
  expect((await draft(page)).notes).toEqual(before.notes);
});
test("cancelling model loading preserves notes and allows another import", async ({
  page,
}) => {
  const before = await seed(page);
  let release!: () => void,
    requested = false;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/models/basic-pitch/model.json", async (r) => {
    requested = true;
    await gate;
    await r.abort().catch(() => {});
  });
  await choose(page);
  await page
    .getByRole("button", { name: "Распознать ноты", exact: true })
    .click();
  await expect.poll(() => requested).toBe(true);
  await page.getByRole("button", { name: "Отменить", exact: true }).click();
  release();
  expect((await draft(page)).notes).toEqual(before.notes);
  await choose(page);
  await page.getByLabel("Алгоритм распознавания").selectOption("classic");
  await page
    .getByRole("button", { name: "Распознать ноты", exact: true })
    .click();
  await expect(page.locator(".vocal-source-caption")).toContainText(
    "классический",
    { timeout: 30000 },
  );
});
test("compare real recording: classic, raw model and processed melody", async ({
  page,
}) => {
  test.skip(
    !process.env.VOCAL_BENCHMARK_WAV,
    "Set VOCAL_BENCHMARK_WAV to a private recording",
  );
  await page.goto("/#vocal");
  await page.route("**/qa-voice.wav", (r) =>
    r.fulfill({
      body: fs.readFileSync(process.env.VOCAL_BENCHMARK_WAV!),
      contentType: "audio/wav",
    }),
  );
  const report = await page.evaluate(async () => {
    // @ts-expect-error Vite development import for real worker testing.
    const { audioJob, analysisSamples } = await import(
      "/src/lib/vocal/jobs.ts"
    );
    const ctx = new AudioContext(),
      buffer = await ctx.decodeAudioData(
        await (await fetch("/qa-voice.wav")).arrayBuffer(),
      );
    const run = async (neural: boolean) => {
      const samples = await analysisSamples(buffer, neural ? 22050 : 11025),
        t = performance.now();
      const r = await audioJob(
        {
          samples,
          sampleRate: neural ? 22050 : 11025,
          bpm: 120,
          range: "auto",
          benchmark: true,
          assetBase: location.origin + "/models/",
        },
        [samples.buffer],
        () => {},
        neural,
      ).promise;
      return { elapsedMs: performance.now() - t, ...r };
    };
    const neural = await run(true),
      classic = await run(false);
    await ctx.close();
    return { duration: buffer.duration, neural, classic };
  });
  if (process.env.VOCAL_BENCHMARK_REPORT)
    fs.writeFileSync(
      process.env.VOCAL_BENCHMARK_REPORT,
      JSON.stringify(report),
    );
  expect(report.neural.notes.length).toBeGreaterThan(10);
  expect(
    report.neural.notes.every(
      (n: { start: number; duration: number }) =>
        n.start + n.duration <= report.duration * 2 + 0.001,
    ),
  ).toBe(true);
});
