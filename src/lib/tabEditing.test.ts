import { describe, expect, it } from "vitest";
import {
  barLength,
  emptyPositions,
  emptySlots,
  entryRhythmAt,
  eventAtCursor,
  eventPositions,
  readFretDigit,
  writeAtCursor,
} from "./tabEditing";
import {
  createScore,
  parseNotation,
  scoreIssues,
  serializeNotation,
  validateScore,
} from "./tablature";
import type { Rhythm } from "./tabEditing";
import type { TabNote } from "./tabTypes";

const quarter: Rhythm = { duration: 4, dotted: false, triplet: false };
const eighth: Rhythm = { ...quarter, duration: 8 };
const cursor = { measure: 0, tick: 0, lane: "1" };
const note = (lane = "1", fret: TabNote["fret"] = 5): TabNote => ({
  lane,
  fret,
  effects: [],
});

describe("direct score entry", () => {
  it("places a note on a later beat with explicit rests and no mutation of the source", () => {
    const before = createScore("guitar");
    const after = writeAtCursor(
      before,
      { ...cursor, tick: 960 },
      quarter,
      note(),
    );
    expect(before.measures[0].events).toEqual([]);
    expect(serializeNotation(after)).toContain("r@4 r@4 1:5@4");
    expect(eventAtCursor(after, { ...cursor, tick: 960 })).toBe(2);
    expect(scoreIssues(after)).toEqual([]);
  });
  it("turns a selected rest into a note without changing its duration or moving following notes", () => {
    const before = parseNotation("r@8 2:7@4", "guitar", { beats: 4, unit: 4 });
    const after = writeAtCursor(before, cursor, quarter, note());
    expect(after.measures[0].events[0].duration).toBe(8);
    expect(after.measures[0].events[1]).toEqual(before.measures[0].events[1]);
  });
  it("enters and edits a chord in one position without duplicating strings", () => {
    const first = writeAtCursor(createScore("guitar"), cursor, quarter, note());
    const chord = writeAtCursor(
      first,
      { ...cursor, lane: "2" },
      quarter,
      note("2", 8),
    );
    const changed = writeAtCursor(chord, cursor, quarter, note("1", 12));
    expect(changed.measures[0].events).toHaveLength(1);
    expect(changed.measures[0].events[0].notes).toHaveLength(2);
    expect(
      changed.measures[0].events[0].notes.find((n) => n.lane === "1")?.fret,
    ).toBe(12);
    expect(scoreIssues(changed)).toEqual([]);
  });
  it("inherits a moment-wide palm mute on a new string", () => {
    const before = parseNotation("1:0~pm@4", "guitar", { beats: 4, unit: 4 });
    const after = writeAtCursor(
      before,
      { ...cursor, lane: "2" },
      quarter,
      note("2", "x"),
    );
    expect(
      after.measures[0].events[0].notes.every((n) => n.effects.includes("pm")),
    ).toBe(true);
  });
  it("toggles a drum hit without removing simultaneous hits", () => {
    const pos = { ...cursor, lane: "HH" };
    let score = writeAtCursor(
      createScore("drums"),
      pos,
      eighth,
      note("HH", "x"),
    );
    score = writeAtCursor(
      score,
      { ...pos, lane: "BD" },
      eighth,
      note("BD", "x"),
    );
    score = writeAtCursor(score, pos, eighth, note("HH", "x"), true);
    expect(score.measures[0].events[0].notes.map((n) => n.lane)).toEqual([
      "BD",
    ]);
    expect(scoreIssues(score)).toEqual([]);
  });
  it("preserves an explicit rest when the last piano key is toggled off", () => {
    const pos = { ...cursor, lane: "C4" };
    const before = writeAtCursor(
      createScore("piano"),
      pos,
      quarter,
      note("C4", 0),
    );
    const after = writeAtCursor(before, pos, eighth, note("C4", 0), true);
    expect(serializeNotation(after)).toContain("r@4");
  });
  it("rejects an eleventh piano key without altering the chord", () => {
    const before = parseNotation(
      "[C4,C#4,D4,D#4,E4,F4,F#4,G4,G#4,A4]@4",
      "piano",
      { beats: 4, unit: 4 },
    );
    expect(() =>
      writeAtCursor(before, { ...cursor, lane: "B4" }, quarter, note("B4", 0)),
    ).toThrow(/10/);
    expect(before.measures[0].events[0].notes).toHaveLength(10);
  });
  it("rejects a new note beyond the end or inside an existing event", () => {
    const before = parseNotation("1:0@2", "guitar", { beats: 4, unit: 4 });
    expect(() =>
      writeAtCursor(before, { ...cursor, tick: 1800 }, quarter, note()),
    ).toThrow(/не помещается/);
    expect(() =>
      writeAtCursor(before, { ...cursor, tick: 240 }, eighth, note()),
    ).toThrow(/начало/);
  });
  it("builds a straight grid after triplets without moving existing music", () => {
    const before = parseNotation("1:5@8t", "guitar", { beats: 4, unit: 4 });
    expect(emptyPositions(before, 0, quarter)).toEqual([160, 640, 1120, 1600]);
    const after = writeAtCursor(
      before,
      { ...cursor, tick: 640 },
      quarter,
      note(),
    );
    expect(after.measures[0].events[0]).toEqual(before.measures[0].events[0]);
    expect(eventPositions(after.measures[0].events)).toEqual([0, 160, 640]);
    expect(scoreIssues(after)).toEqual([]);
  });
  it("fills dotted and triplet gaps with valid v1 durations", () => {
    const dotted = { ...eighth, dotted: true };
    const after = writeAtCursor(
      createScore("guitar"),
      { ...cursor, tick: 1080 },
      dotted,
      note(),
    );
    expect(barLength(after.measures[0].events)).toBe(1440);
    expect(() => validateScore(after)).not.toThrow();
    const mixed = writeAtCursor(
      createScore("guitar"),
      { ...cursor, tick: 260 },
      quarter,
      note(),
    );
    expect(eventPositions(mixed.measures[0].events).at(-1)).toBe(260);
    expect(scoreIssues(mixed)).toEqual([]);
  });
  it("keeps the final sixteenth selectable after dotted notes with an eighth selected", () => {
    const score = parseNotation("1:5@2. 1:5@8.", "guitar", {
      beats: 4,
      unit: 4,
    });
    expect(emptyPositions(score, 0, eighth)).toEqual([1800]);
    expect(emptySlots(score, 0, eighth)).toEqual([
      { tick: 1800, ticks: 120, rhythm: { ...quarter, duration: 16 } },
    ]);
    expect(emptyPositions(score, 0, { ...quarter, duration: 16 })).toEqual([
      1800,
    ]);
  });
  it("removes strum metadata when a chord becomes a rest", () => {
    const score = writeAtCursor(createScore("guitar"), cursor, quarter, note());
    score.measures[0].events[0].strum = "down";
    const after = writeAtCursor(score, cursor, quarter, null);
    expect(after.measures[0].events[0].strum).toBeUndefined();
    expect(scoreIssues(after)).toEqual([]);
  });
});

describe("short remaining subdivisions", () => {
  it.each([
    { kind: "guitar" as const, source: "1:5", lane: "1", fret: 7 as const },
    { kind: "bass" as const, source: "1:5", lane: "1", fret: 7 as const },
    { kind: "drums" as const, source: "HH:x", lane: "HH", fret: "x" as const },
    { kind: "piano" as const, source: "C4", lane: "C4", fret: 0 as const },
  ])(
    "fills the last eighth after a quarter in $kind without changing previous notes",
    ({ kind, source, lane, fret }) => {
      const before = parseNotation(
        `${source}@8 ${source}@4 ${source}@4 ${source}@4`,
        kind,
        { beats: 4, unit: 4 },
      );
      const snapshot = structuredClone(before);
      expect(emptySlots(before, 0, quarter)).toEqual([
        { tick: 1680, ticks: 240, rhythm: eighth },
      ]);
      const position = { ...cursor, tick: 1680, lane };
      const selected = entryRhythmAt(before, position, quarter);
      expect(selected).toEqual(eighth);
      const after = writeAtCursor(before, position, selected, note(lane, fret));
      expect(before).toEqual(snapshot);
      expect(after.measures[0].events.slice(0, 4)).toEqual(
        before.measures[0].events,
      );
      expect(after.measures[0].events.at(-1)).toMatchObject({
        ...eighth,
        notes: [note(lane, fret)],
      });
      expect(barLength(after.measures[0].events)).toBe(1920);
      expect(scoreIssues(after)).toEqual([]);
    },
  );

  it("does not save ghost cells as rests just by selecting them", () => {
    const score = parseNotation("1:5@8 1:5@4 1:5@4 1:5@4", "guitar", {
      beats: 4,
      unit: 4,
    });
    const snapshot = structuredClone(score);
    emptySlots(score, 0, quarter);
    entryRhythmAt(score, { ...cursor, tick: 1680 }, quarter);
    expect(score).toEqual(snapshot);
    expect(score.measures[0].events).toHaveLength(4);
  });

  it.each([
    {
      source: "1:5@2. 1:5@16",
      tick: 1560,
      expected: { ...eighth, dotted: true },
    },
    {
      source: "1:5@2. 1:5@8t",
      tick: 1600,
      expected: { ...quarter, triplet: true },
    },
    {
      source: "1:5@2. 1:5@4t",
      tick: 1760,
      expected: { ...eighth, triplet: true },
    },
  ])(
    "offers a fitting dotted or triplet tail for $source",
    ({ source, tick, expected }) => {
      const score = parseNotation(source, "guitar", { beats: 4, unit: 4 });
      const position = { ...cursor, tick };
      expect(entryRhythmAt(score, position, quarter)).toEqual(expected);
      const after = writeAtCursor(score, position, expected, null);
      expect(barLength(after.measures[0].events)).toBe(1920);
      expect(scoreIssues(after)).toEqual([]);
    },
  );

  it("covers the tail without overflowing when the selected rhythm is longer than the meter", () => {
    const score = createScore("guitar");
    score.meter = { beats: 3, unit: 8 };
    const whole: Rhythm = { ...quarter, duration: 1 };
    expect(emptySlots(score, 0, whole)).toEqual([
      { tick: 0, ticks: 720, rhythm: { ...quarter, dotted: true } },
    ]);
  });

  it("splits a mixed-rhythm remainder without creating an unwritable sliver", () => {
    const score = parseNotation("1:5@2. 1:5@8t 1:5@16", "guitar", {
      beats: 4,
      unit: 4,
    });
    expect(emptySlots(score, 0, quarter)).toEqual([
      { tick: 1720, ticks: 120, rhythm: { ...quarter, duration: 16 } },
      {
        tick: 1840,
        ticks: 80,
        rhythm: { ...quarter, duration: 16, triplet: true },
      },
    ]);
    const firstPosition = { ...cursor, tick: 1720 };
    const firstRhythm = entryRhythmAt(score, firstPosition, quarter);
    const first = writeAtCursor(score, firstPosition, firstRhythm, note());
    const lastPosition = { ...cursor, tick: 1840 };
    const last = writeAtCursor(
      first,
      lastPosition,
      entryRhythmAt(first, lastPosition, firstRhythm),
      note(),
    );
    expect(barLength(last.measures[0].events)).toBe(1920);
    expect(scoreIssues(last)).toEqual([]);
  });

  it("keeps an unsupported remainder visible without inventing or rounding a duration", () => {
    const score = parseNotation("1:5@2. 1:5@4t 1:5@16", "guitar", {
      beats: 4,
      unit: 4,
    });
    expect(emptySlots(score, 0, quarter)).toEqual([
      { tick: 1880, ticks: 40, rhythm: null },
    ]);
    expect(() =>
      writeAtCursor(
        score,
        { ...cursor, tick: 1880 },
        entryRhythmAt(score, { ...cursor, tick: 1880 }, quarter),
        note(),
      ),
    ).toThrow(/не помещается/);
  });

  it("preserves a shorter explicitly chosen duration and an existing longer event", () => {
    const score = parseNotation("1:5@8 1:5@4 1:5@4 1:5@4", "guitar", {
      beats: 4,
      unit: 4,
    });
    const sixteenth: Rhythm = { ...quarter, duration: 16 };
    expect(entryRhythmAt(score, { ...cursor, tick: 1680 }, sixteenth)).toEqual(
      sixteenth,
    );
    expect(entryRhythmAt(score, { ...cursor, tick: 1200 }, sixteenth)).toEqual(
      quarter,
    );
    expect(emptyPositions(score, 0, sixteenth)).toEqual([1680, 1800]);
  });

  it("does not offer an extra cell in a full or overflowing measure", () => {
    const score = parseNotation("1:5@1", "guitar", { beats: 4, unit: 4 });
    expect(emptySlots(score, 0, quarter)).toEqual([]);
    score.meter.beats = 3;
    expect(emptySlots(score, 0, quarter)).toEqual([]);
  });
});

describe("fret digit entry", () => {
  it.each([
    ["", "0", 0],
    ["1", "2", 12],
    ["2", "4", 24],
    ["2", "7", 7],
    ["12", "5", 5],
  ])("%s then %s enters %i", (previous, digit, fret) => {
    expect(readFretDigit(previous, digit).fret).toBe(fret);
  });
});
