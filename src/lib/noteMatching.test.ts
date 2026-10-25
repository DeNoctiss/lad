import { describe, it, expect } from "vitest";
import { matchCount } from "./scales";
import { compareNoteMatches, matchPercent } from "./noteMatching";
describe("candidate note coverage", () => {
  it("counts four distinct selected notes against all seven scale notes", () => {
    const m = matchCount([0, 2, 4, 7, 0], 0, [0, 2, 4, 5, 7, 9, 11]);
    expect(m.matches).toBe(4);
    expect(matchPercent(m.matches, m.total)).toBe(57);
    expect(m.missing).toHaveLength(3);
  });
  it("counts chord coverage and keeps extra notes separate", () => {
    const m = matchCount([0, 4, 1], 0, [0, 4, 7]);
    expect(matchPercent(m.matches, m.total)).toBe(67);
    expect(m.extra).toEqual([1]);
    expect(m.missing).toEqual([7]);
  });
  it("sorts by coverage then extra notes, not absolute match count", () => {
    const list = [
      { matches: 4, total: 7, extra: [] },
      { matches: 2, total: 3, extra: [] },
      { matches: 3, total: 3, extra: [1] },
      { matches: 3, total: 3, extra: [] },
    ].sort(compareNoteMatches);
    expect(list.map((x) => matchPercent(x.matches, x.total))).toEqual([
      100, 100, 67, 57,
    ]);
    expect(list[0].extra).toEqual([]);
    expect(matchPercent(0, 0)).toBe(0);
  });
});
