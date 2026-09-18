import { describe, expect, it, vi } from "vitest";
import type { TabKind, TabScore } from "./tabTypes";
import {
  createScore,
  durationTicks,
  exampleNotation,
  kindForInstrument,
  lanesFor,
  measureTicks,
  parseNotation,
  scoreIssues,
  serializeNotation,
  validateScore,
} from "./tablature";

const meter = { beats: 4, unit: 4 } as const;
const parse = (text: string, kind: TabKind = "guitar") =>
  parseNotation(text, kind, meter);
const imported = () => parse("1:5@4");

function mutate(change: (score: TabScore) => void) {
  const score = imported();
  change(score);
  return score;
}

describe("tablature timing and setup", () => {
  it("maps instruments and ordered lanes", () => {
    expect(kindForInstrument("Барабаны")).toBe("drums");
    expect(kindForInstrument("Бас-гитара")).toBe("bass");
    expect(kindForInstrument("Электрогитара")).toBe("guitar");
    expect(lanesFor("guitar")).toEqual(
      ["e", "B", "G", "D", "A", "E"].map((label, i) => ({
        id: String(i + 1),
        label,
      })),
    );
    expect(lanesFor("bass").map((lane) => lane.label)).toEqual([
      "G",
      "D",
      "A",
      "E",
    ]);
    expect(lanesFor("drums").map((lane) => lane.id)).toEqual([
      "HH",
      "SD",
      "BD",
      "HT",
      "MT",
      "LT",
      "CC",
      "SP",
      "RD",
    ]);
  });

  it("uses exact ticks for all durations and modifiers", () => {
    for (const duration of [1, 2, 4, 8, 16] as const) {
      expect(durationTicks({ duration, dotted: false, triplet: false })).toBe(
        1920 / duration,
      );
      expect(durationTicks({ duration, dotted: true, triplet: false })).toBe(
        2880 / duration,
      );
      expect(durationTicks({ duration, dotted: false, triplet: true })).toBe(
        1280 / duration,
      );
    }
    expect(measureTicks(meter)).toBe(1920);
    expect(measureTicks({ beats: 6, unit: 8 })).toBe(1440);
  });

  it("creates independent, valid empty bars without needing randomUUID", () => {
    const getRandomValues = crypto.getRandomValues.bind(crypto);
    vi.stubGlobal("crypto", { getRandomValues });
    try {
      const first = createScore("bass");
      const second = createScore("bass");
      expect(first).toMatchObject({
        version: 1,
        kind: "bass",
        meter,
        measures: [{ events: [] }],
      });
      expect(first.measures[0].id).not.toBe(second.measures[0].id);
      expect(validateScore(first, "bass")).toEqual(first);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("notation grammar", () => {
  it("roundtrips chords, effects, pauses and rhythm with stable IDs", () => {
    const text =
      "| [1:0~pm,2:1~v,3:2~accent]@4. r@8 1:5~b0.5~ghost@4 2:x@4 | 1:5~h@8 1:7~p@8 1:5@4 r@2 |";
    const score = parse(text);
    expect(parse(serializeNotation(score))).toEqual(score);
    expect(parse(text)).toEqual(score);
    expect(score.measures[0].events[3].notes[0].fret).toBe("x");
  });

  it("preserves interior and edge empty bars", () => {
    for (const text of [
      "",
      "|",
      "||",
      "| |",
      "r@1 || r@1",
      "|| r@1 ||",
      "| r@1 | | | r@1 |",
    ]) {
      const score = parse(text);
      expect(parse(serializeNotation(score))).toEqual(score);
    }
    expect(
      parse("r@1 || r@1").measures.map((bar) => bar.events.length),
    ).toEqual([1, 0, 1]);
    expect(parse("|| r@1 ||").measures.map((bar) => bar.events.length)).toEqual(
      [0, 1, 0],
    );
  });

  it("accepts complete dotted and triplet bars and leaves underfilled bars intact", () => {
    expect(scoreIssues(parse("r@2. r@4"))).toEqual([]);
    expect(scoreIssues(parse("r@2t r@2t r@2t"))).toEqual([]);
    expect(parse("1:0@16").measures[0].events).toHaveLength(1);
    expect(
      parseNotation("r@2.", "guitar", { beats: 6, unit: 8 }).measures,
    ).toHaveLength(1);
  });

  it.each(["guitar", "bass", "drums"] as const)(
    "supplies complete valid %s examples",
    (kind) => {
      const score = parse(exampleNotation(kind), kind);
      expect(score.measures.length).toBeGreaterThan(0);
      for (const bar of score.measures) {
        expect(
          bar.events.reduce((sum, event) => sum + durationTicks(event), 0),
        ).toBe(measureTicks(score.meter));
      }
    },
  );

  it("supports all drum lanes and permitted effects", () => {
    const score = parse(
      "[HH:x~open~accent,SD:x~ghost,BD:x,HT:x,LT:x,CC:x]@2 SP:x@8 RD:x@8 MT:x@8 r@8",
      "drums",
    );
    expect(parse(serializeNotation(score), "drums")).toEqual(score);
  });

  it.each([
    "1:5",
    "1:5@3",
    "1:5@4.t",
    "1:5@4t.",
    "1:5@4..",
    "1:5@@4",
    "1:5@4garbage",
    "1:5~unknown@4",
    "[]@4",
    "[1:0,]@4",
    "[1:0 2:1]@4",
    "r~accent@4",
    "r@4~v",
    "0:1@4",
    "7:1@4",
    "1:25@4",
    "1:-1@4",
    "1:1.5@4",
    "[1:1,1:2]@4",
    "1:5~v~v@4",
    "1:5~b0.5~b1@4",
    "1:5~open@4",
    "1:5~h~p@4",
    "r@1 r@16",
    "eval('x')@4",
  ])("rejects invalid guitar notation %s with a Russian diagnostic", (text) => {
    expect(() => parse(text)).toThrow(/[А-Яа-яЁё]/);
  });

  it.each([
    "HH:0@4",
    "ZZ:x@4",
    "SD:x~open@4",
    "HH:x~pm@4",
    "HH:x~h@4",
    "HH:x~b1@4",
    "HH:x~v@4",
  ])("rejects invalid drum notation %s", (text) => {
    expect(() => parse(text, "drums")).toThrow();
  });

  it("enforces bass lane and text limits", () => {
    expect(() => parse("5:0@4", "bass")).toThrow();
    expect(() => parse(" ".repeat(100001))).toThrow(/100000/);
    expect(() => parse("r@1" + " ".repeat(99996))).not.toThrow();
  });
});

describe("outgoing links", () => {
  it.each([
    "1:5~h@8 1:7~p@8 1:5@4 r@2",
    "1:5~/@4 1:7~\\@4 1:5~tie@4 1:5@4",
    "r@2 1:5~h@2 | [2:3,1:7]@1",
  ])("accepts valid immediate targets %s", (text) => {
    expect(scoreIssues(parse(text))).toEqual([]);
  });

  it.each([
    "1:5~h@4",
    "1:5~h@4 r@4 1:7@4",
    "1:5~h@4 2:7@4",
    "1:x~h@4 1:7@4",
    "1:5~h@4 1:x@4",
    "1:5~h@4 1:4@4",
    "1:5~p@4 1:6@4",
    "1:5~/@4 1:4@4",
    "1:5~\\@4 1:6@4",
    "1:5~tie@4 1:6@4",
    "1:5~h@4 1:5@4",
    "1:5~h@4 | 1:7@1",
    "1:5~h@1 || 1:7@1",
    "1:5~h@1 | r@4 1:7@4",
  ])("rejects invalid link %s", (text) => {
    expect(() => parse(text)).toThrow(
      /Такт|связ|лиг|приём|нота|ноты|струн|лад/i,
    );
  });

  it("reports 1-based draft locations without throwing or modifying the draft", () => {
    const score = parse("r@1 | 1:5@4");
    score.measures[1].events[0].notes[0].link = "h";
    const before = structuredClone(score);
    expect(scoreIssues(score)).toEqual([
      expect.objectContaining({
        measure: 2,
        event: 1,
        message: expect.any(String),
      }),
    ]);
    expect(score).toEqual(before);
    expect(() => validateScore(score)).toThrow(/Такт 2.*событие 1/);
  });
});

describe("runtime score validation", () => {
  it("checks version, kind, meter, measure count and expected instrument", () => {
    for (const value of [
      null,
      [],
      {},
      { ...imported(), version: 2 },
      { ...imported(), kind: "violin" },
      { ...imported(), measures: [] },
    ]) {
      expect(() => validateScore(value)).toThrow();
    }
    for (const badMeter of [
      null,
      {},
      { beats: 0, unit: 4 },
      { beats: 13, unit: 4 },
      { beats: 1.5, unit: 4 },
      { beats: 4, unit: 16 },
      { beats: "4", unit: 4 },
    ]) {
      expect(() => validateScore({ ...imported(), meter: badMeter })).toThrow();
    }
    expect(() => validateScore(imported(), "bass")).toThrow();
    expect(() =>
      parseNotation("", "guitar", { beats: 12, unit: 8 }),
    ).not.toThrow();
  });

  it("checks IDs across both measures and events", () => {
    expect(() =>
      validateScore(
        mutate((score) => {
          score.measures[0].events[0].id = score.measures[0].id;
        }),
      ),
    ).toThrow(/идентификатор/i);
    expect(() =>
      validateScore(
        mutate((score) => {
          score.measures.push(structuredClone(score.measures[0]));
        }),
      ),
    ).toThrow(/идентификатор/i);
    expect(() =>
      validateScore(
        mutate((score) => {
          score.measures[0].id = " ";
        }),
      ),
    ).toThrow();
  });

  it("requires explicit structural fields", () => {
    const event = imported().measures[0].events[0];
    for (const fields of [
      { id: 3 },
      { duration: "4" },
      { duration: 32 },
      { dotted: undefined },
      { dotted: 0 },
      { triplet: undefined },
      { triplet: "false" },
      { dotted: true, triplet: true },
      { notes: null },
      { notes: [{}] },
      { notes: [{ lane: 1, fret: 5, effects: [] }] },
      { notes: [{ lane: "1", fret: "5", effects: [] }] },
      { notes: [{ lane: "1", fret: 5 }] },
      { notes: [{ lane: "1", fret: 5, effects: "v" }] },
      { notes: [{ lane: "1", fret: 5, effects: ["bad"] }] },
      { notes: [{ lane: "1", fret: 5, effects: [], link: "bad" }] },
    ]) {
      const value = imported();
      value.measures[0].events[0] = { ...event, ...fields } as typeof event;
      expect(() => validateScore(value)).toThrow();
    }
    expect(() =>
      validateScore({ ...imported(), measures: [{ id: "m", events: null }] }),
    ).toThrow();
  });

  it("enforces measure, event and note boundaries", () => {
    expect(
      parse(Array.from({ length: 128 }, () => "r@1").join("|")).measures,
    ).toHaveLength(128);
    expect(() =>
      parse(Array.from({ length: 129 }, () => "r@1").join("|")),
    ).toThrow(/128/);
    const text = Array.from({ length: 64 }, () => "r@16t").join(" ");
    expect(
      parseNotation(text, "guitar", { beats: 12, unit: 4 }).measures[0].events,
    ).toHaveLength(64);
    expect(() =>
      parseNotation(`${text} r@16t`, "guitar", { beats: 12, unit: 4 }),
    ).toThrow(/64/);
    expect(() => parse("[1:0,2:0,3:0,4:0,5:0,6:24]@1")).not.toThrow();
    expect(() => parse("[1:0,2:0,3:0,4:0,5:0,6:0,1:0]@1")).toThrow(/6/);
  });

  it("enforces collection limits on JSON imports as well as notation", () => {
    const score = imported();
    expect(() =>
      validateScore({
        ...score,
        measures: Array.from({ length: 129 }, (_, i) => ({
          id: `m${i}`,
          events: [],
        })),
      }),
    ).toThrow(/128/);
    expect(() =>
      validateScore(
        mutate((draft) => {
          draft.measures[0].events = Array.from({ length: 65 }, (_, i) => ({
            ...score.measures[0].events[0],
            id: `e${i}`,
          }));
        }),
      ),
    ).toThrow(/64/);
    expect(() =>
      validateScore(
        mutate((draft) => {
          draft.measures[0].events[0].notes = Array.from({ length: 7 }, () => ({
            lane: "1",
            fret: 0,
            effects: [],
          }));
        }),
      ),
    ).toThrow(/6/);
    expect(() => validateScore({ ...score, measures: new Array(1) })).toThrow(
      /[А-Яа-я]/,
    );
    expect(() =>
      validateScore(
        mutate((draft) => {
          draft.measures[0].events = new Array(1);
        }),
      ),
    ).toThrow(/[А-Яа-я]/);
    expect(() =>
      validateScore(
        mutate((draft) => {
          draft.measures[0].events[0].notes = new Array(1);
        }),
      ),
    ).toThrow(/[А-Яа-я]/);
  });

  it("rejects musical errors in imported notes without relying on the parser", () => {
    for (const note of [
      { lane: "7", fret: 0, effects: [] },
      { lane: "1", fret: NaN, effects: [] },
      { lane: "1", fret: Infinity, effects: [] },
      { lane: "1", fret: 25, effects: [] },
      { lane: "1", fret: 0, effects: ["v", "v"] },
      { lane: "1", fret: 0, effects: ["b0.5", "b1"] },
      { lane: "1", fret: 0, effects: ["open"] },
    ]) {
      const score = imported();
      const event = score.measures[0].events[0];
      expect(() =>
        validateScore({
          ...score,
          measures: [{ id: "m", events: [{ ...event, notes: [note] }] }],
        }),
      ).toThrow();
    }
    expect(() =>
      validateScore(
        mutate((draft) => {
          draft.measures[0].events[0].notes.push({
            lane: "1",
            fret: 6,
            effects: [],
          });
        }),
      ),
    ).toThrow(/повторяется/);
  });

  it("rejects overfull imports but allows unfilled silence without mutation", () => {
    const score = imported();
    const before = structuredClone(score);
    expect(validateScore(score)).toEqual(before);
    expect(score).toEqual(before);
    score.measures[0].events[0].duration = 1;
    score.measures[0].events[0].dotted = true;
    expect(scoreIssues(score)).toEqual([
      expect.objectContaining({
        measure: 1,
        message: expect.stringMatching(/длитель|переполн/i),
      }),
    ]);
    expect(() => validateScore(score)).toThrow();
  });
});
