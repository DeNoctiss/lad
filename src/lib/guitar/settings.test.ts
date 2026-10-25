import { describe, it, expect } from "vitest";
import { defaults, parseSettings } from "./settings";
import { fullPentatonicPositions, boxPositions, OPEN, mod } from "./model";
describe("guitar preferences and full neck", () => {
  it("restores explicit choices and ignores invalid persisted values", () => {
    expect(
      parseSettings(
        JSON.stringify({
          mode: "licks",
          root: 11,
          labels: "fingers",
          bpm: "95",
          box: 4,
          all: true,
        }),
      ),
    ).toMatchObject({
      mode: "licks",
      root: 11,
      labels: "fingers",
      bpm: "95",
      box: 4,
      all: true,
    });
    expect(parseSettings("{broken")).toEqual(defaults);
    expect(
      parseSettings(
        JSON.stringify({
          root: 99,
          box: -1,
          lickId: 500,
          mode: "invalid",
          durations: [NaN, -5],
        }),
      ),
    ).toEqual(defaults);
  });
  it("assigns a digit to every pentatonic position over all 24 frets", () => {
    for (let root = 0; root < 12; root++)
      for (const major of [false, true]) {
        const positions = fullPentatonicPositions(root, major, 2),
          map = new Map(positions.map((p) => [`${p.string}-${p.fret}`, p]));
        for (let string = 0; string < 6; string++)
          for (let fret = 0; fret <= 24; fret++) {
            const wanted = (
              major ? [0, 2, 4, 7, 9] : [0, 3, 5, 7, 10]
            ).includes(mod(OPEN[string] + fret - root));
            expect(map.has(`${string}-${fret}`)).toBe(wanted);
            const p = map.get(`${string}-${fret}`);
            if (p) {
              expect(p.finger).toBeGreaterThanOrEqual(fret === 0 ? 0 : 1);
              expect(p.finger).toBeLessThanOrEqual(4);
              if (fret === 0) expect(p.finger).toBe(0);
            }
          }
      }
  });
  it("marks open positions as zero rather than a fretting finger", () => {
    for (const p of boxPositions(4, false, 0))
      if (p.fret === 0) expect(p.finger).toBe(0);
  });
});
