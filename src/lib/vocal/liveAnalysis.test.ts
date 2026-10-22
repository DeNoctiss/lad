import { describe, expect, it } from "vitest";
import { analyseLiveFrame, liveAnalysisConfig } from "./liveAnalysis";
import { frequencyToMidi } from "./pitch";
import { createVocalProject, validateVocalProject } from "./model";
import { replaceMelody, shiftNotes } from "./projectEditing";

describe("short-window live vocal pitch", () => {
  for (const sampleRate of [22050, 44100, 48000, 96000]) {
    for (const hz of [70, 82.41, 110, 220, 440, 880, 1046.5]) {
      it(`recognizes ${hz} Hz at ${sampleRate} Hz in fast mode`, () => {
        const c = liveAnalysisConfig(sampleRate);
        const raw = Float32Array.from({ length: c.fftSize }, (_, i) => {
          const p = (i * hz * 2 * Math.PI) / sampleRate + 0.73;
          return (
            0.12 * Math.sin(p) + 0.2 * Math.sin(p * 2) + 0.08 * Math.sin(p * 3)
          );
        });
        const actual = analyseLiveFrame(
          raw,
          new Float32Array(c.samples),
          c.decimation,
          sampleRate,
        );
        expect(actual.midi).not.toBeNull();
        expect(Math.abs(actual.midi! - frequencyToMidi(hz))).toBeLessThan(0.15);
        expect(c.windowMs).toBeLessThan(50);
      });
    }
  }
  it("settles on a changed note in one short window without carrying the previous pitch", () => {
    const c = liveAnalysisConfig(48000),
      down = new Float32Array(c.samples);
    const tone = (hz: number) =>
      Float32Array.from(
        { length: c.fftSize },
        (_, i) => 0.2 * Math.sin((i * hz * 2 * Math.PI) / 48000),
      );
    expect(
      analyseLiveFrame(tone(220), down, c.decimation, 48000).midi,
    ).toBeCloseTo(57, 1);
    expect(
      analyseLiveFrame(tone(330), down, c.decimation, 48000).midi,
    ).toBeCloseTo(frequencyToMidi(330), 1);
    expect(
      analyseLiveFrame(new Float32Array(c.fftSize), down, c.decimation, 48000)
        .midi,
    ).toBeNull();
  });
});
it("accepts existing settings and validates the new microphone mode", () => {
  const p = createVocalProject();
  delete p.settings.analysisMode;
  expect(validateVocalProject(p).settings.analysisMode).toBeUndefined();
  expect(() =>
    validateVocalProject({
      ...p,
      settings: { ...p.settings, analysisMode: "unknown" },
    }),
  ).toThrow();
});
it("a new melody has no inherited octave edits; a low outlier blocks the entire shift", () => {
  const old = createVocalProject();
  old.notes = shiftNotes([{ id: "old", midi: 69, start: 0, duration: 1 }], -12);
  old.settings.transpose = -12;
  const source = [
    { id: "main", midi: 66, start: 0, duration: 1 },
    { id: "outlier", midi: 29, start: 354.2625, duration: 0.23125 },
  ];
  const p = replaceMelody(old, {
    notes: source,
    bpm: 120,
    meter: { beats: 4, unit: 4 },
    length: 360,
    source: "MIDI",
  });
  expect(p.notes).toEqual(source);
  expect(p.settings.transpose).toBe(0);
  expect(() => shiftNotes(p.notes, -12)).toThrow();
  expect(p.notes).toEqual(source);
  expect(
    shiftNotes(
      p.notes.filter((n) => n.id !== "outlier"),
      -12,
    )[0].midi,
  ).toBe(54);
});
