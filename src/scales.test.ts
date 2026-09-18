import { describe, it, expect } from "vitest";
import {
  NOTE_NAMES,
  SCALE_TYPES,
  TUNINGS,
  STANDARD_TUNING,
  noteName,
  noteAt,
  scaleNotes,
  scaleNoteSet,
  matchCount,
  parseNote,
} from "./scales";

describe("scales", () => {
  it("NOTE_NAMES has 12 entries starting with C", () => {
    expect(NOTE_NAMES).toHaveLength(12);
    expect(NOTE_NAMES[0]).toBe("C");
    expect(NOTE_NAMES[11]).toBe("B");
  });

  it("SCALE_TYPES includes major and minor scales", () => {
    const names = SCALE_TYPES.map((s) => s.name);
    expect(names).toContain("Мажор (Ионийский)");
    expect(names).toContain("Натуральный минор (Эолийский)");
    expect(names).toContain("Блюзовая");
    expect(names).toContain("Мажорная пентатоника");
  });

  it("major scale has 7 notes with correct intervals", () => {
    const major = SCALE_TYPES.find((s) => s.name === "Мажор (Ионийский)")!;
    expect(major.intervals).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });

  it("natural minor scale has 7 notes with correct intervals", () => {
    const minor = SCALE_TYPES.find(
      (s) => s.name === "Натуральный минор (Эолийский)",
    )!;
    expect(minor.intervals).toEqual([0, 2, 3, 5, 7, 8, 10]);
  });

  it("pentatonic scales have 5 notes", () => {
    const majorPent = SCALE_TYPES.find(
      (s) => s.name === "Мажорная пентатоника",
    )!;
    const minorPent = SCALE_TYPES.find(
      (s) => s.name === "Минорная пентатоника",
    )!;
    expect(majorPent.intervals).toHaveLength(5);
    expect(minorPent.intervals).toHaveLength(5);
  });

  it("chromatic scale has 12 notes", () => {
    const chromatic = SCALE_TYPES.find((s) => s.name === "Хроматическая")!;
    expect(chromatic.intervals).toHaveLength(12);
    expect(chromatic.intervals).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it("TUNINGS includes standard tuning", () => {
    const standard = TUNINGS.find((t) => t.name.includes("Стандартный"));
    expect(standard).toBeDefined();
    expect(standard!.notes).toEqual([4, 9, 2, 7, 11, 4]);
  });

  it("STANDARD_TUNING is E A D G B E", () => {
    expect(STANDARD_TUNING).toEqual([4, 9, 2, 7, 11, 4]);
  });

  it("all tunings have 6 strings", () => {
    for (const tuning of TUNINGS) {
      expect(tuning.notes).toHaveLength(6);
    }
  });

  it("all tuning notes are 0-11", () => {
    for (const tuning of TUNINGS) {
      for (const note of tuning.notes) {
        expect(note).toBeGreaterThanOrEqual(0);
        expect(note).toBeLessThanOrEqual(11);
      }
    }
  });

  it("noteName returns correct names", () => {
    expect(noteName(0)).toBe("C");
    expect(noteName(4)).toBe("E");
    expect(noteName(11)).toBe("B");
    expect(noteName(12)).toBe("C");
    expect(noteName(-1)).toBe("B");
  });

  it("noteAt computes note at string/fret position", () => {
    // Low E (4) at fret 5 = A (9)
    expect(noteAt(4, 5)).toBe(9);
    // A (9) at fret 12 = A (9)
    expect(noteAt(9, 12)).toBe(9);
    // Open string returns the string note
    expect(noteAt(4, 0)).toBe(4);
  });

  it("scaleNotes returns correct notes for C major", () => {
    const major = SCALE_TYPES.find((s) => s.name === "Мажор (Ионийский)")!;
    const notes = scaleNotes(0, major.intervals);
    expect(notes).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });

  it("scaleNotes returns correct notes for A minor", () => {
    const minor = SCALE_TYPES.find(
      (s) => s.name === "Натуральный минор (Эолийский)",
    )!;
    const notes = scaleNotes(9, minor.intervals);
    // A minor = A B C D E F G = 9 11 0 2 4 5 7
    expect(notes).toEqual([9, 11, 0, 2, 4, 5, 7]);
  });

  it("scaleNoteSet contains correct notes", () => {
    const major = SCALE_TYPES.find((s) => s.name === "Мажор (Ионийский)")!;
    const set = scaleNoteSet(0, major.intervals);
    expect(set.has(0)).toBe(true); // C
    expect(set.has(2)).toBe(true); // D
    expect(set.has(1)).toBe(false); // C#
    expect(set.size).toBe(7);
  });

  it("matchCount finds perfect matches", () => {
    const major = SCALE_TYPES.find((s) => s.name === "Мажор (Ионийский)")!;
    // C, D, E are all in C major
    const result = matchCount([0, 2, 4], 0, major.intervals);
    expect(result.matches).toBe(3);
    expect(result.extra).toHaveLength(0);
  });

  it("matchCount detects extra notes", () => {
    const major = SCALE_TYPES.find((s) => s.name === "Мажор (Ионийский)")!;
    // C, C# — C# is not in C major
    const result = matchCount([0, 1], 0, major.intervals);
    expect(result.matches).toBe(1);
    expect(result.extra).toEqual([1]);
  });

  it("matchCount detects missing notes", () => {
    const major = SCALE_TYPES.find((s) => s.name === "Мажор (Ионийский)")!;
    // Only C selected, but C major has 7 notes
    const result = matchCount([0], 0, major.intervals);
    expect(result.matches).toBe(1);
    expect(result.missing).toHaveLength(6);
  });

  it("parseNote parses sharp names", () => {
    expect(parseNote("C")).toBe(0);
    expect(parseNote("C#")).toBe(1);
    expect(parseNote("F#")).toBe(6);
    expect(parseNote("B")).toBe(11);
  });

  it("parseNote parses flat names", () => {
    expect(parseNote("Db")).toBe(1);
    expect(parseNote("Bb")).toBe(10);
    expect(parseNote("Gb")).toBe(6);
  });

  it("parseNote is case-insensitive and handles H", () => {
    expect(parseNote("c")).toBe(0);
    expect(parseNote("e")).toBe(4);
    expect(parseNote("H")).toBe(11);
    expect(parseNote("h")).toBe(11);
  });

  it("parseNote returns null for invalid input", () => {
    expect(parseNote("")).toBeNull();
    expect(parseNote("X")).toBeNull();
    expect(parseNote("123")).toBeNull();
  });

  it("all scale intervals are unique within each scale", () => {
    for (const scale of SCALE_TYPES) {
      const notes = new Set(scaleNotes(0, scale.intervals));
      expect(notes.size).toBe(scale.intervals.length);
    }
  });
});
