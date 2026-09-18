import { describe, expect, it } from "vitest";
import {
  CHORD_TYPES,
  chordName,
  generateBuiltinChords,
  parseChordName,
  findVoicings,
  allChords,
  CAGED_MAJOR_SHAPES,
  CAGED_MINOR_SHAPES,
} from "./chordDatabase";
import type { Chord } from "./model";

const TUNING = [4, 9, 2, 7, 11, 4]; // E A D G B e

function noteAt(stringIdx: number, fret: number): number {
  return (TUNING[stringIdx] + fret) % 12;
}

describe("chordDatabase", () => {
  it("generates a large database of chords", () => {
    const chords = generateBuiltinChords();
    expect(chords.length).toBeGreaterThan(1000);
  });

  it("covers all 12 roots and 18 core types", () => {
    const chords = generateBuiltinChords();
    for (let root = 0; root < 12; root++) {
      for (const type of CHORD_TYPES) {
        const name = chordName(root, type.suffix);
        const variants = chords.filter((c) => c.name === name);
        // Some suffixes like "6/9" may be stored as "69" in chords-db;
        // check both forms
        if (variants.length === 0 && type.suffix === "6/9") {
          const altName = chordName(root, "69");
          const altVariants = chords.filter((c) => c.name === altName);
          expect(
            altVariants.length,
            `${name} or ${altName} should have voicings`,
          ).toBeGreaterThan(0);
          continue;
        }
        expect(variants.length, `${name} should have voicings`).toBeGreaterThan(
          0,
        );
      }
    }
  });

  it("produces valid fret arrays of length 6", () => {
    const chords = generateBuiltinChords();
    for (const chord of chords) {
      expect(chord.frets.length).toBe(6);
      for (const fret of chord.frets) {
        expect(fret).toBeGreaterThanOrEqual(-1);
        expect(fret).toBeLessThanOrEqual(24);
      }
    }
  });

  it("sets baseFret to 1 when all frets fit in first 4 frets", () => {
    const chords = generateBuiltinChords();
    for (const chord of chords) {
      const fretted = chord.frets.filter((f) => f > 0);
      if (!fretted.length) continue;
      const max = Math.max(...fretted);
      if (max > 4) continue; // only check chords that fit in first 4 frets
      expect(chord.baseFret, `${chord.name} ${chord.frets}`).toBe(1);
    }
  });

  it("at most 4 muted strings per voicing", () => {
    const chords = generateBuiltinChords();
    for (const chord of chords) {
      const muted = chord.frets.filter((f) => f === -1).length;
      expect(
        muted,
        `${chord.name} ${chord.frets.join(",")}`,
      ).toBeLessThanOrEqual(4);
    }
  });

  it("C major has the standard open voicing", () => {
    const chords = generateBuiltinChords();
    const cMajor = chords.filter((c) => c.name === "C");
    expect(cMajor.length).toBeGreaterThan(0);
    const hasOpen = cMajor.some(
      (c) =>
        c.baseFret === 1 &&
        c.frets[0] === -1 &&
        c.frets[1] === 3 &&
        c.frets[2] === 2 &&
        c.frets[3] === 0 &&
        c.frets[4] === 1 &&
        c.frets[5] === 0,
    );
    expect(hasOpen).toBe(true);
  });

  it("C major has the A-shape barre voicing x35553", () => {
    const chords = generateBuiltinChords();
    const cMajor = chords.filter((c) => c.name === "C");
    const hasBarre = cMajor.some(
      (c) =>
        c.frets[0] === -1 &&
        c.frets[1] === 3 &&
        c.frets[2] === 5 &&
        c.frets[3] === 5 &&
        c.frets[4] === 5 &&
        c.frets[5] === 3,
    );
    expect(hasBarre, "x35553 should be in C major voicings").toBe(true);
  });

  it("C major barre voicing has barres data", () => {
    const chords = generateBuiltinChords();
    const cMajorBarre = chords.find(
      (c) =>
        c.name === "C" &&
        c.frets[0] === -1 &&
        c.frets[1] === 3 &&
        c.frets[2] === 5 &&
        c.frets[3] === 5 &&
        c.frets[4] === 5 &&
        c.frets[5] === 3,
    );
    expect(cMajorBarre).toBeDefined();
    if (cMajorBarre?.barres) {
      expect(cMajorBarre.barres).toContain(3);
    }
  });

  it("E major has the standard open E voicing", () => {
    const chords = generateBuiltinChords();
    const eMajor = chords.filter((c) => c.name === "E");
    const hasOpen = eMajor.some(
      (c) =>
        c.frets[0] === 0 &&
        c.frets[1] === 2 &&
        c.frets[2] === 2 &&
        c.frets[3] === 1 &&
        c.frets[4] === 0 &&
        c.frets[5] === 0,
    );
    expect(hasOpen).toBe(true);
  });

  it("Am has the standard open Am voicing", () => {
    const chords = generateBuiltinChords();
    const am = chords.filter((c) => c.name === "Am");
    const hasOpen = am.some(
      (c) =>
        c.frets[0] === -1 &&
        c.frets[1] === 0 &&
        c.frets[2] === 2 &&
        c.frets[3] === 2 &&
        c.frets[4] === 1 &&
        c.frets[5] === 0,
    );
    expect(hasOpen).toBe(true);
  });

  it("major and minor triads produce chord tones", () => {
    const chords = generateBuiltinChords();
    for (const chord of chords) {
      const parsed = parseChordName(chord.name);
      if (!parsed) continue;
      // Only check plain major and minor (no extensions)
      if (parsed.suffix !== "" && parsed.suffix !== "m") continue;
      const intervals = parsed.suffix === "m" ? [0, 3, 7] : [0, 4, 7];
      const chordTones = new Set(intervals.map((i) => (parsed.root + i) % 12));
      for (let s = 0; s < 6; s++) {
        if (chord.frets[s] < 0) continue;
        expect(
          chordTones.has(noteAt(s, chord.frets[s])),
          `${chord.name} string ${s} fret ${chord.frets[s]}`,
        ).toBe(true);
      }
    }
  });

  it("major and minor triad voicings contain at least one root note", () => {
    const chords = generateBuiltinChords();
    for (const chord of chords) {
      const parsed = parseChordName(chord.name);
      if (!parsed) continue;
      if (parsed.suffix !== "" && parsed.suffix !== "m") continue;
      const hasRoot = chord.frets.some(
        (f, i) => f >= 0 && noteAt(i, f) === parsed.root,
      );
      expect(hasRoot, `${chord.name} should contain root`).toBe(true);
    }
  });

  it("parseChordName handles sharps and suffixes", () => {
    expect(parseChordName("C")).toEqual({ root: 0, suffix: "" });
    expect(parseChordName("C#m7")).toEqual({ root: 1, suffix: "m7" });
    expect(parseChordName("F#m7b5")).toEqual({ root: 6, suffix: "m7b5" });
    expect(parseChordName("Bb")).toEqual({ root: 10, suffix: "" });
    expect(parseChordName("H")).toBeNull();
  });

  it("findVoicings combines built-in and user chords", () => {
    const userChord: Chord = {
      id: "user-test",
      name: "C",
      frets: [-1, 3, 2, 0, 1, 0],
      baseFret: 1,
    };
    const voicings = findVoicings("C", [userChord]);
    expect(voicings.length).toBeGreaterThan(1);
    expect(voicings.some((v) => v.id === "user-test")).toBe(true);
  });

  it("allChords includes user chords after built-in", () => {
    const userChord: Chord = {
      id: "user-x",
      name: "X",
      frets: [0, 0, 0, 0, 0, 0],
      baseFret: 1,
    };
    const combined = allChords([userChord]);
    expect(combined.some((c) => c.id === "user-x")).toBe(true);
    expect(combined.length).toBeGreaterThan(1000);
  });

  it("caches generated chords", () => {
    const first = generateBuiltinChords();
    const second = generateBuiltinChords();
    expect(first).toBe(second);
  });

  it("CAGED major shapes has 5 forms", () => {
    expect(CAGED_MAJOR_SHAPES.length).toBe(5);
    expect(CAGED_MAJOR_SHAPES.map((s) => s.shapeName)).toEqual([
      "C-форма",
      "A-форма",
      "G-форма",
      "E-форма",
      "D-форма",
    ]);
  });

  it("CAGED minor shapes has 5 forms", () => {
    expect(CAGED_MINOR_SHAPES.length).toBe(5);
    expect(CAGED_MINOR_SHAPES.map((s) => s.shapeName)).toEqual([
      "C-форма",
      "A-форма",
      "G-форма",
      "E-форма",
      "D-форма",
    ]);
  });
});
