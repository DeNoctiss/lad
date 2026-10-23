import { describe, it, expect } from "vitest";
import { neuralMelody, neuralFrameTime } from "./neuralPostprocess";
function data(count: number, pitch: (i: number) => number | null) {
  const frames = Array.from({ length: count }, (_, i) => {
    const r = Array(88).fill(0.001),
      m = pitch(i);
    if (m !== null) r[m - 21] = 0.85;
    return r;
  });
  return { frames, onsets: frames.map(() => Array(88).fill(0)) };
}
describe("neural vocal postprocessing", () => {
  it("does not invent notes in silence", () =>
    expect(
      neuralMelody(
        data(100, () => null),
        120,
        2,
      ).notes,
    ).toEqual([]));
  it("preserves a real octave change", () =>
    expect(
      neuralMelody(
        data(180, (i) => (i < 90 ? 57 : 69)),
        120,
        3,
      ).notes.map((n) => n.midi),
    ).toEqual([57, 69]));
  it("rejects a brief overtone with continued support for the original pitch", () => {
    const d = data(180, () => 57);
    for (let i = 70; i < 73; i++) {
      d.frames[i][69 - 21] = 0.9;
      d.frames[i][57 - 21] = 0.6;
    }
    expect(neuralMelody(d, 120, 3).notes.map((n) => n.midi)).toEqual([57]);
  });
  it("preserves pauses, repeated attacks and bounded timing", () => {
    const d = data(180, (i) => (i >= 70 && i < 90 ? null : 60));
    d.onsets[130][60 - 21] = 0.9;
    const r = neuralMelody(d, 120, 2.1);
    expect(r.notes.length).toBe(3);
    expect(r.notes[1].start).toBeGreaterThan(
      r.notes[0].start + r.notes[0].duration,
    );
    expect(
      r.notes.every((n) => n.duration >= 1 / 64 && n.start + n.duration <= 4.2),
    ).toBe(true);
  });
  it("BPM converts seconds into beats without changing actual timing", () => {
    const d = data(180, (i) => (i < 90 ? 60 : 64)),
      a = neuralMelody(d, 90, 3).notes,
      b = neuralMelody(d, 120, 3).notes;
    expect(a.length).toBe(b.length);
    a.forEach((n, i) => {
      expect(n.start / 90).toBeCloseTo(b[i].start / 120);
      expect(n.duration / 90).toBeCloseTo(b[i].duration / 120);
    });
  });
  it("keeps a continuous time axis across inference windows", () => {
    for (let i = 1; i < 10000; i++)
      expect(neuralFrameTime(i)).toBeGreaterThan(neuralFrameTime(i - 1));
    expect(neuralFrameTime(86 * 30)).toBeCloseTo(30, 0);
  });
});
