import { describe, expect, it } from "vitest";
import { pianoKeys, pianoMidi, pianoName } from "./piano";
import {
  kindForInstrument,
  parseNotation,
  serializeNotation,
  validateScore,
} from "./tablature";
import type { TabKind } from "./tabTypes";

const parse = (source: string) =>
  parseNotation(source, "piano" as TabKind, { beats: 4, unit: 4 });
describe("piano notes", () => {
  it("maps all 88 keys and middle C unambiguously", () => {
    expect(pianoKeys).toHaveLength(88);
    expect(pianoMidi("A0")).toBe(21);
    expect(pianoMidi("C4")).toBe(60);
    expect(pianoMidi("C8")).toBe(108);
    for (const key of pianoKeys)
      expect(pianoMidi(pianoName(key.midi))).toBe(key.midi);
  });
  it.each(["C0", "G#0", "C#8", "D8", "C9", "H4", "C", "C44", "c4", "60"])(
    "rejects keys outside piano range or invalid notation %s",
    (value) => expect(pianoMidi(value)).toBeNull(),
  );
  it("normalizes enharmonic names", () => {
    expect(pianoMidi("Db4")).toBe(pianoMidi("C#4"));
    expect(pianoMidi("Cb4")).toBe(pianoMidi("B3"));
  });
  it("maps the instrument and roundtrips chords, rests and ties", () => {
    expect(kindForInstrument("Пианино")).toBe("piano");
    const score = parse("[C4,E4,G4]@2 C#4~accent@4 r@4 | C4~tie@1 | C4@1");
    expect(parse(serializeNotation(score))).toEqual(score);
    expect(score.measures[0].events[0].notes.map((note) => note.lane)).toEqual([
      "C4",
      "E4",
      "G4",
    ]);
    expect(
      validateScore(JSON.parse(JSON.stringify(score)), "piano" as TabKind),
    ).toEqual(score);
  });
  it("canonicalizes flats and allows ten simultaneous keys", () => {
    expect(parse("Db4@4").measures[0].events[0].notes[0].lane).toBe("C#4");
    expect(
      parse("[C3,D3,E3,F3,G3,A3,B3,C4,D4,E4]@1").measures[0].events[0].notes,
    ).toHaveLength(10);
  });
  it.each([
    "[C#4,Db4]@4",
    "[C3,D3,E3,F3,G3,A3,B3,C4,D4,E4,F4]@1",
    "C4~h@4 D4@4",
    "C4~pm@4",
    "C4~b1@4",
    "C4~open@4",
    "1:5@4",
    "HH:x@4",
    "C4~tie@4 D4@4",
    "C4~tie@4 r@4",
    "C4@1 C4@4",
  ])("rejects invalid piano events %s", (source) =>
    expect(() => parse(source)).toThrow(),
  );
  it("rejects invalid persisted piano data", () => {
    const score = parse("C4@4");
    score.measures[0].events[0].notes[0].fret = 5;
    expect(() => validateScore(score)).toThrow();
    score.measures[0].events[0].notes[0].fret = 0;
    score.measures[0].events[0].notes[0].lane = "C0";
    expect(() => validateScore(score)).toThrow();
  });
  it("does not reinterpret guitar or drum notation", () => {
    expect(() =>
      parseNotation("C4@4", "guitar", { beats: 4, unit: 4 }),
    ).toThrow();
    expect(() =>
      parseNotation("C4@4", "drums", { beats: 4, unit: 4 }),
    ).toThrow();
  });
});
