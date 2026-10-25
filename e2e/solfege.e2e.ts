import { test, expect, type Page } from "@playwright/test";
async function choose(page: Page, name: string) {
  const toggle = page.locator(".sf-picker-toggle");
  if (
    (await toggle.isVisible()) &&
    (await toggle.getAttribute("aria-expanded")) === "false"
  )
    await toggle.click();
  await page
    .getByRole("navigation", { name: "Виды упражнений" })
    .getByRole("button", { name: new RegExp("^" + name) })
    .click();
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await page.goto("/#solfege");
  await expect(
    page.getByRole("heading", { name: "Сольфеджио", exact: true }),
  ).toBeVisible();
});
test("practice opens immediately, visible choices replace dropdowns and first answers persist", async ({
  page,
}) => {
  const before = await page.evaluate(() =>
    localStorage.getItem("lad-library-v1"),
  );
  await expect(page.locator(".sf-kind-list button")).toHaveCount(14);
  await expect(page.locator(".sf-practice-layout select")).toHaveCount(0);
  const answer = page.getByRole("button", {
    name: "Большая секунда",
    exact: true,
  });
  await expect(answer).toBeDisabled();
  await expect(page.locator(".sf-result")).toHaveCount(0);
  await page.getByRole("button", { name: "Слушать задание" }).click();
  await expect(answer).toBeEnabled({ timeout: 30000 });
  await answer.click();
  await expect(page.getByText("Верно!", { exact: true })).toBeVisible();
  await expect(answer).toBeDisabled();
  await page.reload();
  await page.getByRole("button", { name: "Прогресс", exact: true }).click();
  await expect(page.getByText("1 попыток · 100% верно")).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("lad-library-v1")),
  ).toBe(before);
});
test("plays tablature piano samples; soundfont load failure can be retried", async ({
  page,
}) => {
  let blocked = true;
  let fetched = 0;
  await page.route(
    "**/soundfonts/acoustic_grand_piano-mp3.js",
    async (route) => {
      fetched++;
      if (blocked) await route.abort();
      else await route.continue();
    },
  );
  await page.getByRole("button", { name: "Слушать задание" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Не удалось загрузить пианино",
  );
  await expect(
    page.getByRole("button", { name: "Большая секунда", exact: true }),
  ).toBeDisabled();
  blocked = false;
  await page.getByRole("button", { name: "Слушать задание" }).click();
  await expect(
    page.getByRole("button", { name: "Большая секунда", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  expect(fetched).toBeGreaterThanOrEqual(2);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.getByRole("button", { name: "Остановить звук" }).click();
});
test("cancel while loading prevents old exercise playback", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  let intercepted = false;
  await page.route(
    "**/soundfonts/acoustic_grand_piano-mp3.js",
    async (route) => {
      intercepted = true;
      await gate;
      await route.continue();
    },
  );
  await page.getByRole("button", { name: "Слушать задание" }).click();
  await expect.poll(() => intercepted).toBe(true);
  await page.getByRole("button", { name: "Остановить звук" }).click();
  release();
  await expect(
    page.getByRole("button", { name: "Большая секунда", exact: true }),
  ).toBeDisabled();
  await choose(page, "Гаммы и лады");
  await expect(
    page.getByRole("heading", { name: "Какая гамма прозвучала?" }),
  ).toBeVisible();
});
test("dictations support ordered input, two bars and rests", async ({
  page,
}) => {
  await choose(page, "Ритмический диктант");
  await page.getByRole("button", { name: "Слушать задание" }).click();
  const quarter = page.getByRole("button", { name: "♩ 1", exact: true });
  await expect(quarter).toBeEnabled({ timeout: 30000 });
  for (let i = 0; i < 4; i++) await quarter.click();
  await page.getByRole("button", { name: "Проверить ответ" }).click();
  await expect(page.getByText("Верно!", { exact: true })).toBeVisible();
  await page
    .getByRole("group", { name: "Сложность" })
    .getByRole("button", { name: "3 · Вызов" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Соберите два такта 4/4 по слуху." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Пауза ½", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("group", { name: "Сложность" })
    .getByRole("button", { name: "1 · Основы" })
    .click();
  await choose(page, "Мелодический диктант");
  await page.getByRole("button", { name: "Слушать задание" }).click();
  const first = page.getByRole("button", { name: "1 ступень", exact: true });
  await expect(first).toBeEnabled();
  for (let i = 0; i < 4; i++) await first.click();
  await page.getByRole("button", { name: "Проверить ответ" }).click();
  await expect(page.getByText("Верно!", { exact: true })).toBeVisible();
});
test("each new category generates a complete, answerable task", async ({
  page,
}) => {
  for (const name of [
    "Названия нот",
    "Выше или ниже",
    "Гаммы и лады",
    "Ступени на слух",
    "Обращения аккордов",
    "Каденции",
    "Построение интервалов",
    "Построение аккордов",
  ]) {
    await choose(page, name);
    await expect(page.locator(".sf-exercise h2")).not.toBeEmpty();
    if (name.startsWith("Построение")) {
      await expect(
        page.getByRole("group", { name: "Ответ на пианино" }),
      ).toBeVisible();
      await expect(page.locator(".sf-answers")).toHaveCount(0);
    } else
      await expect(page.locator(".sf-answers button").first()).toBeVisible();
    await page
      .getByRole("button", { name: "Показать ответ и разобрать" })
      .click();
    await expect(page.locator(".sf-result")).toContainText("Ответ открыт");
    await page.getByRole("button", { name: "Следующее задание" }).click();
    await expect(page.locator(".sf-exercise")).toContainText("Задание 2");
  }
});
test("circle keeps enharmonic spelling, playback and practice link", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Круг тональностей", exact: true })
    .click();
  await page
    .getByRole("button", { name: "F♯ мажор, D♯ минор", exact: true })
    .click();
  await expect(
    page.getByText("Порядок знаков: F♯ → C♯ → G♯ → D♯ → A♯ → E♯."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Натуральный минор", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "D♯ минор" })).toBeVisible();
  await page.getByRole("button", { name: "Практика знаков" }).click();
  await expect(
    page.locator(".sf-kind-list button[aria-pressed=true]"),
  ).toContainText("Ключевые знаки");
});
test("theory and chords are drawer-only; no recent-song section; theory deep links to practice", async ({
  page,
}) => {
  const top = page.getByRole("navigation", { name: "Основная навигация" });
  await expect(
    top.getByRole("button", { name: "Аккорды", exact: true }),
  ).toHaveCount(0);
  await expect(top.getByRole("button", { name: "Теория музыки" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Открыть меню", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Меню библиотеки" });
  await expect(drawer.getByText("НЕДАВНО ОБНОВЛЕНЫ")).toHaveCount(0);
  await expect(
    drawer.getByRole("button", { name: "Аккорды", exact: true }),
  ).toBeVisible();
  await drawer
    .getByRole("button", { name: "Теория музыки", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Теория музыки", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".sf-course-nav button")).toHaveCount(11);
  await page.getByRole("button", { name: "09. Обращения и бас" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Почему секстаккорд и квартсекстаккорд",
    }),
  ).toBeVisible();
  await expect(page.locator(".sf-lesson table")).toBeVisible();
  await page.getByRole("button", { name: "Закрепить в упражнении" }).click();
  await expect(
    page.locator(".sf-kind-list button[aria-pressed=true]"),
  ).toContainText("Обращения аккордов");
});
test("saved and imported progress remains compatible and malformed data is protected", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Показать ответ и разобрать" })
    .click();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("lad-solfege-v1")!).attempts[0].outcome,
    ),
  ).toBe("revealed");
  await page.getByRole("button", { name: "Прогресс", exact: true }).click();
  const input = page.locator(".sf-page input[type=file]");
  await input.setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":8}'),
  });
  await expect(page.getByRole("alert")).toContainText("Некорректный");
  page.on("dialog", (d) => d.accept());
  await input.setInputFiles({
    name: "ok.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 1,
        attempts: [
          {
            id: "old",
            kind: "chords",
            level: 1,
            outcome: "correct",
            date: "2026-10-23",
          },
        ],
      }),
    ),
  });
  await expect(page.getByRole("status")).toHaveText("Прогресс импортирован");
  await page.evaluate(() =>
    localStorage.setItem("lad-solfege-v1", "original-corrupt"),
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Показать ответ и разобрать" })
    .click();
  expect(
    await page.evaluate(() => localStorage.getItem("lad-solfege-v1")),
  ).toBe("original-corrupt");
});
test("intonation keeps octave controls and stops the microphone on departure", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["microphone"]);
  await page.addScriptTag({
    content: `window.__tracks=[];const old=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async(...a)=>{const s=await old(...a);window.__tracks.push(...s.getTracks());return s;};`,
  });
  await page.getByRole("button", { name: "Интонация", exact: true }).click();
  await expect(page.locator(".sf-pitch-display > strong")).toHaveText("C3");
  await page.getByLabel("Удобный регистр").selectOption("0");
  await expect(page.locator(".sf-pitch-display > strong")).toHaveText("C4");
  await page
    .getByRole("button", { name: "Включить микрофон", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Выключить микрофон", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Практика", exact: true }).click();
  expect(
    await page.evaluate(() =>
      (window as unknown as { __tracks: MediaStreamTrack[] }).__tracks.every(
        (t) => t.readyState === "ended",
      ),
    ),
  ).toBe(true);
});
for (const width of [1366, 1024, 768, 390])
  test(`practice, theory and drawer fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 768 });
    await choose(page, "Гаммы и лады");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `/workspace/scratch/c222acdeb91a/lad-browser/revision-practice-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page.getByRole("button", { name: "Учебник по темам" }).click();
    await page
      .getByRole("button", { name: "04. Интервалы: число и качество" })
      .click();
    await page.evaluate(
      () => (document.documentElement.dataset.theme = "dark"),
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `/workspace/scratch/c222acdeb91a/lad-browser/revision-theory-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page
      .getByRole("button", { name: "Открыть меню", exact: true })
      .click();
    const drawer = page.getByRole("dialog", { name: "Меню библиотеки" });
    await drawer
      .getByRole("button", { name: "Как это работает" })
      .scrollIntoViewIfNeeded();
    await expect(
      drawer.getByRole("button", { name: "Как это работает" }),
    ).toBeInViewport();
    await page.screenshot({
      path: `/workspace/scratch/c222acdeb91a/lad-browser/revision-drawer-${width}.png`,
    });
  });
