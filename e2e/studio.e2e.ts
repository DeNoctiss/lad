import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const openTabs = async (page: Page) => {
  await page.goto("/#song/morning");
  await page.getByRole("tab", { name: /Табулатуры/ }).click();
};

test("theme follows the system, persists explicit choice and never changes library data", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const library = await page.evaluate(() =>
    localStorage.getItem("lad-library-v1"),
  );
  await page.getByRole("button", { name: "Включить светлую тему" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(
    await page.evaluate(() => localStorage.getItem("lad-library-v1")),
  ).toBe(library);
  expect(await page.evaluate(() => localStorage.getItem("lad-theme-v1"))).toBe(
    "light",
  );
});

test("theme changes keep the draft; song mode changes protect unsaved notes", async ({
  page,
}) => {
  await openTabs(page);
  await page.getByRole("button", { name: "Партия", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Новая партия",
    exact: true,
  });
  await dialog
    .getByLabel("Название партии", { exact: true })
    .fill("Несохранённое соло");
  const input = dialog.locator(".visual-tab-preview");
  await input.focus();
  await input.press("7");
  await dialog.locator(".theme-toggle").click();
  await expect(
    dialog.getByLabel("Название партии", { exact: true }),
  ).toHaveValue("Несохранённое соло");
  await expect(dialog.locator(".tab-score-fret")).toHaveText(["7"]);
  page.once("dialog", (prompt) => prompt.dismiss());
  await dialog
    .getByRole("button", { name: "Текст и аккорды", exact: true })
    .click();
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".tab-score-fret")).toHaveText(["7"]);
  await dialog.getByRole("button", { name: "Сохранить партию" }).click();
  const nav = page.getByRole("navigation", { name: "Партии инструментов" });
  await expect(
    nav.getByRole("button", { name: /Несохранённое соло/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("tab", { name: "Текст и аккорды", exact: true }).click();
  await expect(page.locator(".lyrics")).toBeVisible();
  await expect(page.locator(".song-aside")).toBeVisible();
  await page.getByRole("tab", { name: /Табулатуры/ }).click();
  await expect(page.locator(".song-aside")).toHaveCount(0);
  await expect(
    nav.getByRole("button", { name: /Несохранённое соло/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".part-card .tab-score-fret")).toHaveText(["7"]);
});

const sizes = [
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
  { width: 1024, height: 768 },
  { width: 768, height: 900 },
  { width: 390, height: 844 },
];
for (const theme of ["light", "dark"] as const) {
  for (const viewport of sizes) {
    test(`${theme}: all instruments fit ${viewport.width}×${viewport.height} without overlapping tools`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme: theme });
      await openTabs(page);
      for (const instrument of [
        "Ритм-гитара",
        "Бас-гитара",
        "Барабаны",
        "Пианино",
      ]) {
        await page.getByRole("button", { name: "Партия", exact: true }).click();
        const dialog = page.getByRole("dialog", {
          name: "Новая партия",
          exact: true,
        });
        await dialog
          .getByLabel("Название партии", { exact: true })
          .fill(`Тест: ${instrument}`);
        await dialog
          .getByRole("combobox", { name: "Инструмент", exact: true })
          .selectOption(instrument);
        await dialog.locator(".part-settings > summary").click();
        if (instrument === "Пианино") {
          await dialog.locator('.piano-key[data-note="C4"]').click();
        } else if (instrument === "Барабаны") {
          await dialog.locator(".tab-drum-new").first().click();
        } else {
          const input = dialog.locator(".visual-tab-preview");
          await input.focus();
          await input.press("1");
          await input.press("2");
          await expect(dialog.locator(".tab-score-fret")).toHaveText(["12"]);
        }
        await expect
          .poll(() =>
            dialog
              .locator(".part-editor-form")
              .evaluate((el) => el.scrollWidth - el.clientWidth),
          )
          .toBeLessThanOrEqual(1);
        expect(
          await dialog.evaluate((el) => el.scrollWidth - el.clientWidth),
        ).toBeLessThanOrEqual(1);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(viewport.width);
        const score = await dialog.locator(".visual-tab-preview").boundingBox();
        const dock = await dialog.locator(".editor-dock").boundingBox();
        expect(dock!.y).toBeGreaterThanOrEqual(score!.y + score!.height - 1);
        const tiny = await dialog.evaluate((root) =>
          Array.from(
            root.querySelectorAll(
              "button, input, select, summary, small, text, label",
            ),
          )
            .filter((el) => {
              const box = el.getBoundingClientRect();
              return (
                box.width > 1 &&
                box.height > 1 &&
                getComputedStyle(el).visibility !== "hidden" &&
                parseFloat(getComputedStyle(el).fontSize) < 14
              );
            })
            .map((el) => el.textContent?.trim()),
        );
        expect(tiny).toEqual([]);
        await dialog
          .locator(".part-editor-form")
          .evaluate((el) => (el.scrollTop = el.scrollHeight));
        await expect(
          dialog.getByRole("button", { name: "Сохранить партию" }),
        ).toBeInViewport();
        await dialog.getByRole("button", { name: "Сохранить партию" }).click();
        await expect(page.locator(".part-card")).toContainText(
          `Тест: ${instrument}`,
        );
      }
      expect(errors).toEqual([]);
    });
  }
}
