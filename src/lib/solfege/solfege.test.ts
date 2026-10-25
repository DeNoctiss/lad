import { describe, expect, it } from "vitest";
import { ALL_KEYS, CHORDS, diatonicChords, keyFor, centsFrom } from "./theory";
import {
  generateExercise,
  isCorrect,
  KINDS,
  rhythmBeats,
  exerciseSignature,
  freshExercise,
} from "./exercises";
import {
  addAttempt,
  emptyProgress,
  parseProgress,
  stats,
  type Attempt,
} from "./progress";
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
describe("key spelling and harmony", () => {
  it.each(ALL_KEYS)(
    "$tonic major contains seven distinct letter names and correct scale steps",
    (key) => {
      expect(new Set(key.notes.map((n) => n[0])).size).toBe(7);
      expect(key.signs).toHaveLength(Math.abs(key.fifths));
      const pcs: Record<string, number> = {
        C: 0,
        D: 2,
        E: 4,
        F: 5,
        G: 7,
        A: 9,
        B: 11,
      };
      key.notes.forEach((n, i) =>
        expect(
          (pcs[n[0]] + (n.includes("♯") ? 1 : n.includes("♭") ? -1 : 0) + 12) %
            12,
        ).toBe(key.midi[i] % 12),
      );
      expect(key.midi.map((n) => n - key.midi[0])).toEqual([
        0, 2, 4, 5, 7, 9, 11,
      ]);
      expect(key.minor).toBe(key.notes[5]);
      expect(
        diatonicChords(key).map((c) => c.midi.map((n) => n - c.midi[0])),
      ).toEqual([
        [0, 4, 7],
        [0, 3, 7],
        [0, 3, 7],
        [0, 4, 7],
        [0, 4, 7],
        [0, 3, 7],
        [0, 3, 6],
      ]);
    },
  );
  it("keeps enharmonic spellings instead of incorrectly naming E sharp F", () => {
    expect(keyFor(6).notes).toEqual(["F♯", "G♯", "A♯", "B", "C♯", "D♯", "E♯"]);
    expect(keyFor(-7).notes).toEqual([
      "C♭",
      "D♭",
      "E♭",
      "F♭",
      "G♭",
      "A♭",
      "B♭",
    ]);
  });
  it("rejects impossible signatures", () => {
    expect(() => keyFor(8)).toThrow();
    expect(() => keyFor(1.5)).toThrow();
  });
  it("keeps octave discrepancies visible", () => {
    expect(centsFrom(60, 72)).toBe(-1200);
    expect(centsFrom(60.2, 60)).toBe(20);
  });
});
describe("generated exercises", () => {
  for (const { id } of KINDS)
    for (const level of [1, 2, 3])
      it(`${id} level ${level}: generated sound, answer and options agree`, () => {
        const random = rng(level * 17);
        for (let i = 0; i < 80; i++) {
          const q = generateExercise(id, level, random);
          expect(isCorrect(q, q.answer)).toBe(true);
          expect(isCorrect(q, [])).toBe(false);
          expect(q.answer.every((a) => q.options.includes(a))).toBe(true);
          expect(
            q.notes.every(
              (n) => Number.isFinite(n.midi) && n.duration > 0 && n.beat >= 0,
            ),
          ).toBe(true);
          if (id === "rhythm") {
            expect(rhythmBeats(q.answer)).toBe(q.beats);
            expect(q.notes.length).toBe(q.answer.length);
          }
          if (id === "melody") {
            expect(q.answer[0]).toBe("1");
            expect(q.notes.map((n) => n.midi)).toEqual(
              q.answer.map((n) => keyFor(q.fifths!).midi[Number(n) - 1]),
            );
          }
          if (id === "chords") {
            const chord = CHORDS.find((c) => c.name === q.answer[0])!;
            expect(
              q.notes.slice(0, 3).map((n) => n.midi - q.notes[0].midi),
            ).toEqual(chord.steps);
          }
        }
      });
  it("requires exact length and ordering", () => {
    const q = generateExercise("melody", 1, () => 0.9);
    expect(isCorrect(q, [...q.answer, "1"])).toBe(false);
    expect(isCorrect(q, ["2", ...q.answer.slice(1)])).toBe(false);
  });
  it("assigns fresh IDs even with a deterministic random source", () => {
    expect(generateExercise("notes", 1, () => 0).id).not.toBe(
      generateExercise("notes", 1, () => 0).id,
    );
  });
});
describe("progress integrity", () => {
  const a: Attempt = {
    id: "one",
    kind: "notes",
    level: 1,
    outcome: "correct",
    date: "2026-10-23T10:00:00.000Z",
  };
  it("only counts first attempts", () => {
    const p = addAttempt(emptyProgress(), a);
    expect(addAttempt(p, { ...a, outcome: "incorrect" })).toBe(p);
  });
  it("excludes revealed answers from accuracy", () => {
    expect(
      stats([
        a,
        { ...a, id: "two", outcome: "incorrect" },
        { ...a, id: "three", outcome: "revealed" },
      ]),
    ).toEqual({ total: 3, answered: 2, correct: 1, percent: 50, revealed: 1 });
    expect(stats([]).percent).toBe(null);
  });
  it("round trips validated progress", () => {
    const p = addAttempt(emptyProgress(), a);
    expect(parseProgress(JSON.stringify(p))).toEqual(p);
  });
  it.each([
    { version: 2, attempts: [] },
    { version: 1, attempts: [{ ...a, level: 4 }] },
    { version: 1, attempts: [{ ...a, date: "oops" }] },
    { version: 1, attempts: [{ ...a, outcome: "ok" }] },
    { version: 1, attempts: [a, a] },
    { version: 1, attempts: [null] },
  ])("rejects malformed import %#", (p) => {
    expect(() => parseProgress(JSON.stringify(p))).toThrow();
  });
  it("bounds stored history", () => {
    const p = {
      version: 1 as const,
      attempts: Array.from({ length: 5000 }, (_, i) => ({
        ...a,
        id: String(i),
      })),
    };
    const next = addAttempt(p, { ...a, id: "last" });
    expect(next.attempts).toHaveLength(5000);
    expect(next.attempts[0].id).toBe("1");
  });
});

describe("expanded practice library", () => {
  it("offers fourteen genuinely distinct exercise types", () => {
    expect(KINDS).toHaveLength(14);
    expect(new Set(KINDS.map((k) => k.id)).size).toBe(14);
  });
  it("generates hundreds of rhythms and melodies instead of a short fixed playlist", () => {
    for (const kind of ["rhythm", "melody"] as const) {
      const random = rng(195);
      const variants = new Set(
        Array.from({ length: 500 }, () =>
          exerciseSignature(generateExercise(kind, 3, random)),
        ),
      );
      expect(variants.size).toBeGreaterThan(200);
    }
  });
  it("avoids recent duplicates when a fresh variant is available", () => {
    const random = rng(245),
      recent: string[] = [];
    for (let i = 0; i < 80; i++) {
      const q = freshExercise("intervals", 2, recent, random);
      const signature = exerciseSignature(q);
      expect(recent).not.toContain(signature);
      recent.push(signature);
      if (recent.length > 8) recent.shift();
    }
  });
  it("rhythm answers include actual pauses with matching elapsed time", () => {
    const random = rng(27);
    let rests = 0;
    for (let i = 0; i < 100; i++) {
      const q = generateExercise("rhythm", 3, random);
      q.notes.forEach((n, j) => {
        expect(n.rest).toBe(q.answer[j].startsWith("Пауза"));
        if (n.rest) rests++;
      });
      expect(q.notes.at(-1)!.beat + q.notes.at(-1)!.duration).toBe(8);
    }
    expect(rests).toBeGreaterThan(0);
  });
  it("retains old progress and accepts all new kinds", () => {
    const p = {
      version: 1,
      attempts: KINDS.map((k, i) => ({
        id: String(i),
        kind: k.id,
        level: 2,
        outcome: "correct",
        date: "2026-10-23",
      })),
    };
    expect(parseProgress(JSON.stringify(p)).attempts).toHaveLength(14);
  });
});
