import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  boxPositions,
  neighbouringBoxes,
  OPEN,
  mod,
  LICKS,
  transposeLick,
  expression,
} from "./model";
import { PROGRESSIONS, chordData } from "./progressions";
import { parseSoundBank } from "./audio";
import { generateExercise } from "../solfege/exercises";
describe("guitar learning content", () => {
  it("five boxes contain exactly the chosen pentatonic at every tonic", () => {
    for (let root = 0; root < 12; root++)
      for (const major of [false, true])
        for (let box = 0; box < 5; box++) {
          const positions = boxPositions(root, major, box);
          expect(positions).toHaveLength(12);
          for (const p of positions) {
            expect(p.fret).toBeGreaterThanOrEqual(0);
            expect(p.fret).toBeLessThanOrEqual(24);
            expect(major ? [0, 2, 4, 7, 9] : [0, 3, 5, 7, 10]).toContain(
              mod(OPEN[p.string] + p.fret - root),
            );
          }
        }
  });
  it("transposes every lick without losing intervals or leaving the neck", () => {
    expect(LICKS.length).toBeGreaterThanOrEqual(20);
    for (const l of LICKS)
      for (let root = 0; root < 12; root++) {
        transposeLick(l, root).forEach((n, i) => {
          expect(n.fret).toBeGreaterThanOrEqual(0);
          expect(n.fret).toBeLessThanOrEqual(24);
          expect(mod(n.fret - l.notes[i].fret)).toBe(mod(root - 9));
          if (n.target !== undefined)
            expect(n.target - n.fret).toBe(
              l.notes[i].target! - l.notes[i].fret,
            );
        });
      }
  });
  it("bend and release have distinct endpoints", () => {
    const base = { string: 2, fret: 7, beats: 2 };
    expect(expression({ ...base, technique: "bend" }, 1, 2)).toBe(2);
    expect(expression({ ...base, technique: "release" }, 1, 2)).toBe(0);
    expect(expression({ ...base, technique: "prebend" }, 0, 0)).toBe(2);
    expect(expression({ ...base, technique: "prebend" }, 1, 2)).toBe(0);
  });
  it("keeps chord quality and slash bass on transposition", () => {
    expect(chordData("G/B", 2).name).toBe("A/C#");
    expect(chordData("Cmaj7").tones).toEqual([0, 4, 7, 11]);
    expect(chordData("C#dim7").tones).toEqual([1, 4, 7, 10]);
    expect(PROGRESSIONS).toHaveLength(21);
  });
  it("parses the actual local banks including trailing commas and flat keys", () => {
    for (const f of [
      "mk/electric_guitar_clean-mp3.js",
      "acoustic_grand_piano-mp3.js",
    ]) {
      const bank = parseSoundBank(
        readFileSync("public/soundfonts/" + f, "utf8"),
      );
      expect(bank.Db4).toMatch(/^data:audio/);
      expect(bank.A4).toMatch(/^data:audio/);
    }
  });
  it("keyboard targets fit two octaves and have ascending notes", () => {
    for (const kind of ["chordBuild", "intervalBuild"] as const)
      for (let level = 1; level <= 3; level++)
        for (let i = 0; i < 80; i++) {
          const q = generateExercise(kind, level),
            start = Math.floor(q.keyboardRoot! / 12) * 12;
          expect(q.keyboardAnswer?.length).toBe(kind === "chordBuild" ? 3 : 1);
          for (const midi of q.keyboardAnswer!) {
            expect(midi).toBeGreaterThanOrEqual(start);
            expect(midi).toBeLessThanOrEqual(start + 24);
          }
          expect(q.keyboardAnswer).toEqual(
            [...q.keyboardAnswer!].sort((a, b) => a - b),
          );
        }
  });
});

it("fifth and first boxes overlap in the same octave", () => {
  for (let root = 0; root < 12; root++)
    for (const major of [false, true]) {
      const pair = neighbouringBoxes(root, major, 4);
      expect(pair.every((p) => p.fret >= 0 && p.fret <= 24)).toBe(true);
      expect(
        Math.max(...pair.map((p) => p.fret)) -
          Math.min(...pair.map((p) => p.fret)),
      ).toBeLessThanOrEqual(6);
    }
});
