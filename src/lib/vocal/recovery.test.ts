import { expect, it } from "vitest";
import { createVocalProject, validateVocalProject } from "./model";
import { regridProject, replaceMelody, shiftNotes } from "./projectEditing";
import { midiToFrequency } from "./pitch";
import { transcribeAudio, trackPitch, phraseNotes } from "./transcribe";
import type { PitchFrame } from "./yin";
import { validateLibrary } from "../model";
import { initialLibrary } from "../seed";
import { osenTemplate } from "./osenTemplate";
it("BPM regridding preserves note seconds, loop times and audio rate", () => {
  const p = createVocalProject(84);
  p.notes = [{ id: "n", midi: 66, start: 2, duration: 1 }];
  p.audio = {
    acapella: { name: "a.wav", originalBpm: 84, duration: 12, offset: -4 },
  };
  const n = regridProject(p, 135);
  expect((n.notes[0].start * 60) / n.bpm).toBeCloseTo(
    (p.notes[0].start * 60) / p.bpm,
  );
  expect((n.notes[0].duration * 60) / n.bpm).toBeCloseTo(
    (p.notes[0].duration * 60) / p.bpm,
  );
  expect((n.settings.loopEnd * 60) / n.bpm).toBeCloseTo(
    (p.settings.loopEnd * 60) / p.bpm,
  );
  expect((n.audio!.acapella!.offset * 60) / n.bpm).toBeCloseTo(
    (p.audio.acapella!.offset * 60) / p.bpm,
  );
  expect(n.bpm / n.audio!.acapella!.originalBpm).toBe(1);
});
it("MIDI replacement resets speed and transpose, preserves offset seconds", () => {
  const p = createVocalProject(84);
  p.settings.speed = 1.25;
  p.settings.transpose = -12;
  p.audio = {
    acapella: { name: "a.wav", originalBpm: 84, duration: 12, offset: -4 },
  };
  const n = replaceMelody(p, {
    notes: [{ id: "n", midi: 69, start: 0, duration: 1 }],
    bpm: 120,
    meter: { beats: 4, unit: 4 },
    length: 4,
    source: "MIDI",
  });
  expect(n.settings.speed).toBe(1);
  expect(n.settings.transpose).toBe(0);
  expect(n.audio!.acapella!.originalBpm).toBe(120);
  expect((n.audio!.acapella!.offset * 60) / n.bpm).toBeCloseTo((-4 * 60) / 84);
  expect((n.notes[0].duration * 60) / n.bpm).toBe(0.5);
});
it("octave edits preserve originals and respect calibrated pitch and bounds", () => {
  const notes = [{ id: "n", midi: 69, start: 0, duration: 1 }];
  expect(shiftNotes(notes, -12)[0].midi).toBe(57);
  expect(notes[0].midi).toBe(69);
  expect(() => shiftNotes([{ ...notes[0], midi: 21 }], -12)).toThrow();
  expect(midiToFrequency(69)).toBe(440);
  expect(midiToFrequency(57)).toBe(220);
});
it("standalone draft is backed up and validated", () => {
  const library = { ...initialLibrary, vocalDraft: createVocalProject() };
  expect(
    validateLibrary(JSON.parse(JSON.stringify(library))).vocalDraft,
  ).toEqual(library.vocalDraft);
  expect(() =>
    validateLibrary({ ...library, vocalDraft: { version: 1 } }),
  ).toThrow();
});
it("strong second harmonics do not obscure a true octave change", () => {
  const sr = 11025,
    samples = Float32Array.from({ length: sr * 2 }, (_, i) => {
      const hz = i < sr ? 220 : 440,
        phase = (i * hz * 2 * Math.PI) / sr;
      return (
        0.09 * Math.sin(phase) +
        0.3 * Math.sin(phase * 2) +
        0.14 * Math.sin(phase * 3)
      );
    });
  const result = transcribeAudio(samples, sr, 60);
  expect(result.notes.some((n) => n.midi === 57 && n.duration > 0.5)).toBe(
    true,
  );
  expect(result.notes.some((n) => n.midi === 69 && n.duration > 0.5)).toBe(
    true,
  );
});
it("tracking rejects a brief ambiguous octave jump", () => {
  const frames: PitchFrame[] = Array.from({ length: 100 }, (_, i) => ({
    rms: 0.3,
    voiced: 0.99,
    candidates: [
      {
        midi: 66,
        frequency: midiToFrequency(66),
        confidence: 0.95,
        probability: i >= 46 && i < 50 ? 0.3 : 0.9,
      },
      {
        midi: 78,
        frequency: midiToFrequency(78),
        confidence: 0.95,
        probability: i >= 46 && i < 50 ? 0.7 : 0.1,
      },
    ],
  }));
  expect(trackPitch(frames).every((m) => m === 66)).toBe(true);
});
it("silence stays empty; normal vibrato stays a sustained note", () => {
  expect(
    transcribeAudio(new Float32Array(11025), 11025, 60).notes,
  ).toHaveLength(0);
  expect(
    phraseNotes(
      Array.from({ length: 100 }, (_, i) => ({
        beat: i / 100,
        midi: 66 + 0.45 * Math.sin(i / 3),
        confidence: 0.99,
      })),
      0.01,
      60,
    ).map((n) => n.midi),
  ).toEqual([66]);
});
it("chorus template is valid, 58 notes aligned to the supplied recording", () => {
  const p = validateVocalProject(osenTemplate().song.vocal);
  expect(p.notes).toHaveLength(58);
  expect(p.notes.slice(0, 3).map((n) => n.midi)).toEqual([66, 64, 62]);
  expect((p.audio!.acapella!.offset * 60) / p.bpm).toBeCloseTo(-57.45);
  expect(
    ((p.settings.loopEnd - p.settings.loopStart) * 60) / p.bpm,
  ).toBeCloseTo(29.7);
});
