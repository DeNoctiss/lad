import { it, expect } from "vitest";
import { LickFollower, practiceSteps } from "./practice";
import { analyseInstrumentFrame } from "../audio/instrumentInput";
const pitch = (midi: number | null, rms = 0.1, confidence = 0.99) => ({
  midi,
  rms,
  confidence,
  frequency: null,
});
const steps = (values: number[]) =>
  values.map((midi, noteIndex) => ({ midi, noteIndex, label: "Нота" }));
it("stable pitch without octave folding", () => {
  const f = new LickFollower(steps([64, 62]));
  expect(f.update(pitch(76), 0).status).toBe("high");
  expect(f.update(pitch(64), 50).accepted).toBe(false);
  expect(f.update(pitch(64), 210).index).toBe(1);
  f.update(pitch(62), 250);
  expect(f.update(pitch(62), 410).status).toBe("complete");
});
it("uncertainty and wrong notes reset hold", () => {
  const f = new LickFollower(steps([64]));
  f.update(pitch(64), 0);
  expect(f.update(pitch(64, 0.1, 0.2), 100).status).toBe("uncertain");
  expect(f.update(pitch(64), 160).accepted).toBe(false);
  expect(f.update(pitch(63), 200).status).toBe("low");
  expect(f.update(pitch(64), 370).accepted).toBe(false);
  expect(f.update(pitch(64), 530).status).toBe("complete");
});
it("sustain and tracking dropout do not count repeated notes", () => {
  const f = new LickFollower(steps([64, 64]));
  f.update(pitch(64), 0);
  f.update(pitch(64), 160);
  expect(f.update(pitch(64), 500).status).toBe("repeat");
  f.update(pitch(null), 600);
  f.update(pitch(null), 700);
  expect(f.update(pitch(64), 800).status).toBe("repeat");
  f.update(pitch(null, 0), 900);
  f.update(pitch(null, 0), 990);
  f.update(pitch(64), 1050);
  expect(f.update(pitch(64), 1210).status).toBe("complete");
});
it("new attack rearms", () => {
  const f = new LickFollower(steps([64, 64]));
  f.update(pitch(64), 0);
  f.update(pitch(64), 160);
  f.update(pitch(64, 0.03), 400);
  f.update(pitch(64, 0.1), 450);
  expect(f.update(pitch(64, 0.1), 610).status).toBe("complete");
});
it("seek resets pending hold", () => {
  const f = new LickFollower(steps([64]));
  f.update(pitch(64), 0);
  f.seek();
  expect(f.update(pitch(64), 200).accepted).toBe(false);
});
it("technique targets", () => {
  expect(
    practiceSteps([
      { string: 0, fret: 5, target: 7, technique: "slide", beats: 1 },
      { string: 1, fret: 5, technique: "release", beats: 1 },
    ]).map((s) => s.midi),
  ).toEqual([69, 71, 66, 64]);
});
for (const sr of [44100, 48000, 96000])
  for (const midi of [40, 45, 57, 69, 88])
    it(`synthetic MIDI ${midi} at ${sr}`, () => {
      const raw = new Float32Array(sr > 64000 ? 8192 : 4096),
        hz = 440 * 2 ** ((midi - 69) / 12);
      for (let i = 0; i < raw.length; i++)
        raw[i] =
          0.2 * Math.sin((2 * Math.PI * hz * i) / sr) +
          0.08 * Math.sin((4 * Math.PI * hz * i) / sr);
      expect(analyseInstrumentFrame(raw, sr).midi).toBeCloseTo(midi, 1);
    });
it("silence and clipping rejected", () => {
  expect(analyseInstrumentFrame(new Float32Array(4096), 48000).midi).toBeNull();
  const raw = Float32Array.from({ length: 4096 }, (_, i) =>
    Math.sin((2 * Math.PI * 440 * i) / 48000),
  );
  expect(analyseInstrumentFrame(raw, 48000).midi).toBeNull();
});
