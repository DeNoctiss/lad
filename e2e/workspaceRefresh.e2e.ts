import { test, expect } from "@playwright/test";
import { createVocalProject } from "../src/lib/vocal/model";
test("workspace routes fit laptop and phone in both themes", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const theme of ["light", "dark"])
    for (const width of [1366, 1280, 390]) {
      await page.setViewportSize({ width, height: 768 });
      await page.goto("/");
      await page.evaluate((t) => {
        localStorage.setItem("lad-theme-v1", t);
        document.documentElement.dataset.theme = t;
      }, theme);
      for (const route of [
        "bands",
        "band/folk",
        "songs",
        "favorites",
        "song/morning",
        "chords",
        "chord/Am",
        "caged",
        "fretboard",
        "solfege",
        "theory/notes",
        "help",
        "vocal",
      ]) {
        await page.goto("/#" + route);
        await page.waitForTimeout(100);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `${route} ${width} ${theme}`,
        ).toBe(true);
        if (
          ((width === 1366 && theme === "light") ||
            (width === 390 && theme === "dark")) &&
          ["bands", "solfege", "fretboard", "vocal"].includes(route)
        )
          await page.screenshot({
            path: test.info().outputPath(`${route}-${theme}-${width}.png`),
            fullPage: true,
          });
      }
    }
  expect(errors).toEqual([]);
});
test("focused exercise and vocal training preserve the working area", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await page.goto("/#solfege/chordBuild");
  await expect(page.locator(".sf-kind-list")).toBeHidden();
  for (const name of ["C4", "E4", "G4"])
    await page.getByRole("button", { name, exact: true }).click();
  await page.getByRole("button", { name: "Проверить", exact: true }).click();
  await expect(page.locator(".sf-result")).toContainText("Верно!");
  await page.goto("/#vocal");
  const project = createVocalProject(120);
  project.notes = [{ id: "demo", midi: 60, start: 1, duration: 2 }];
  await page
    .getByLabel("Импорт JSON-файла вокала", { exact: true })
    .setInputFiles({
      name: "demo.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(project)),
    });
  await page
    .getByRole("button", { name: "Тренироваться", exact: true })
    .click();
  await expect(
    page.getByRole("group", { name: "Инструменты редактора" }),
  ).toBeHidden();
  await expect(page.locator(".vocal-controls")).toBeHidden();
  await expect(page.locator(".vocal-mobile-mic")).toBeVisible();
  for (const width of [1366, 390]) {
    await page.setViewportSize({ width, height: 768 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath(`vocal-training-${width}.png`),
      fullPage: true,
    });
  }
  await page.locator(".vocal-settings-panel > summary").click();
  await expect(page.locator(".vocal-controls")).toBeVisible();
});
test("guitar checks actual WebAudio input, rejects octave and releases tracks", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = {
      osc: null as OscillatorNode | null,
      ctx: null as AudioContext | null,
      tracks: [] as MediaStreamTrack[],
    };
    (window as any).__instrument = state;
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        state.ctx = new AudioContext();
        await state.ctx.resume();
        state.osc = state.ctx.createOscillator();
        state.osc.frequency.value = 659.255;
        const gain = state.ctx.createGain();
        gain.gain.value = 0.15;
        const dest = state.ctx.createMediaStreamDestination();
        state.osc.connect(gain).connect(dest);
        state.osc.start();
        state.tracks.push(...dest.stream.getTracks());
        return dest.stream;
      },
    });
  });
  await page.goto("/#fretboard");
  await page
    .getByRole("button", { name: "Лики и движения", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Сыграть по шагам", exact: true })
    .click();
  const practice = page.getByRole("region", {
    name: "Практика лика с гитарой",
  });
  // First default lick starts at E4 (B string, fret 5).
  const target = await practice
    .locator(".gl-practice-readout > div")
    .first()
    .textContent();
  expect(target).toContain("E4");
  await page
    .getByRole("button", { name: "Включить проверку", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Пауза проверки", exact: true }),
  ).toBeVisible();
  await expect(practice.getByRole("status")).toContainText("Выше нужной ноты");
  await expect(practice.getByRole("progressbar")).toHaveAttribute("value", "0");
  await page.evaluate(() => {
    (window as any).__instrument.osc.frequency.value = 329.628;
  });
  await expect(practice.getByRole("progressbar")).toHaveAttribute("value", "1");
  await page
    .getByRole("button", { name: "Послушать ноту", exact: true })
    .click();
  expect(
    await page.evaluate(() =>
      (window as any).__instrument.tracks.every(
        (t: MediaStreamTrack) => t.readyState === "ended",
      ),
    ),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: "Включить проверку", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Включить проверку", exact: true })
    .click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(
    page.getByRole("button", { name: "Включить проверку", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      (window as any).__instrument.tracks.every(
        (t: MediaStreamTrack) => t.readyState === "ended",
      ),
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("guitar-practice.png"),
    fullPage: true,
  });
});
test("denied permission is actionable and pending request can be cancelled", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).__deny = true;
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: () => {
        if ((window as any).__deny)
          return Promise.reject(new DOMException("denied", "NotAllowedError"));
        return new Promise((resolve) => {
          (window as any).__resolveInput = resolve;
        });
      },
    });
  });
  await page.goto("/#fretboard");
  await page
    .getByRole("button", { name: "Лики и движения", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Сыграть по шагам", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Включить проверку", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Нет доступа");
  await page.evaluate(() => {
    (window as any).__deny = false;
  });
  await page
    .getByRole("button", { name: "Включить проверку", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => !!(window as any).__resolveInput))
    .toBe(true);
  await page
    .getByRole("button", { name: "Отменить подключение", exact: true })
    .click();
  await page.evaluate(() => {
    const ctx = new AudioContext(),
      dest = ctx.createMediaStreamDestination();
    (window as any).__lateTracks = dest.stream.getTracks();
    (window as any).__resolveInput(dest.stream);
  });
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as any).__lateTracks.every(
          (t: MediaStreamTrack) => t.readyState === "ended",
        ),
      ),
    )
    .toBe(true);
  await expect(
    page.getByRole("button", { name: "Включить проверку", exact: true }),
  ).toBeVisible();
});
