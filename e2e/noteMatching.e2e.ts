import { test, expect } from "@playwright/test";
test("all selected notes are required in both candidate lists", async ({
  page,
}) => {
  await page.goto("/#fretboard");
  for (const [tab, prefix] of [
    ["Определитель тональности", "key"],
    ["Определитель аккордов", "chord"],
  ]) {
    await page.getByRole("tab", { name: tab, exact: true }).click();
    const panel = page.locator(".fretboard-tab:visible");
    await page
      .getByRole("button", { name: "Струна 1, лад 8, нота C", exact: true })
      .click();
    await expect(panel.locator(`.${prefix}-match-item`)).toHaveCount(5);
    await panel
      .getByRole("button", { name: "Показать больше вариантов" })
      .click();
    await expect(panel.locator(`.${prefix}-match-item`)).toHaveCount(20);
    for (const [fret, note] of [
      [10, "D"],
      [12, "E"],
      [3, "G"],
    ])
      await page
        .getByRole("button", {
          name: `Струна 1, лад ${fret}, нота ${note}`,
          exact: true,
        })
        .click();
    const more = panel.getByRole("button", {
      name: "Показать больше вариантов",
    });
    if (await more.count()) await more.click();
    const items = panel.locator(`.${prefix}-match-item`);
    expect(await items.count()).toBeGreaterThan(0);
    for (const item of await items.all()) {
      await expect(item.locator(".note-chip-match")).toHaveCount(4);
      const text = await item.locator(`.${prefix}-match-score`).innerText();
      const [, pct, num, den] = text.match(/(\d+)%.*?\((\d+)\/(\d+)\)/)!;
      expect(Number(num)).toBe(4);
      expect(Number(pct)).toBe(Math.round(400 / Number(den)));
    }
    if (prefix === "chord")
      await expect(
        items.filter({ has: page.locator("strong", { hasText: /^C$/ }) }),
      ).toHaveCount(0);
    // Selecting the full chromatic set has no containing candidate in this catalog.
    await panel.getByRole("button", { name: "Очистить", exact: true }).click();
    for (let fret = 1; fret <= 12; fret++)
      await panel
        .getByRole("button", {
          name: new RegExp(`^Струна 1, лад ${fret}, нота `),
        })
        .click();
    if(prefix === "chord") {
      await expect(items).toHaveCount(0);
      await expect(panel.locator(".fretboard-empty")).toContainText("В каталоге нет");
    } else {
      for(const item of await items.all()) {
        await expect(item.locator(".note-chip-match")).toHaveCount(12);
        await expect(item).toContainText("100% (12/12)");
      }
    }
  }
});
