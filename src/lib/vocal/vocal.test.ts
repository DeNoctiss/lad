import { describe, it, expect, vi } from "vitest";
import {
  createVocalProject,
  validateVocalProject,
  placeNote,
  monophonic,
  overlaps,
  noteId,
} from "./model";
import { detectPitch, scoreTake, segmentPitch } from "./pitch";
import { readMidi } from "./midi";
import { notesFromPart } from "./fromTab";
import { transformAudio } from "./transform";
import { vocalExercise } from "./exercises";
import { demoSong, installSong, sourceSong } from "./demoCatalog";
import { validateLibrary } from "../model";
import { initialLibrary } from "../seed";
import { parseNotation } from "../tablature";
import type { VocalNote } from "./model";
const n = (
  id: string,
  midi: number,
  start: number,
  duration: number,
): VocalNote => ({ id, midi, start, duration });
const tone = (frequency: number, sr = 22050, length = 2048) =>
  Float32Array.from(
    { length },
    (_, i) =>
      0.2 * Math.sin((2 * Math.PI * frequency * i) / sr) +
      0.08 * Math.sin((4 * Math.PI * frequency * i) / sr),
  );

describe("vocal examples", () => {
  it.each([0, 1, 2])(
    "piano reference %i reproduces the study including rests and ties",
    (index) => {
      const { song } = demoSong(index);
      const fromPiano = notesFromPart(song.parts[0], song.bpm, 0, "high");
      const timings = (notes: VocalNote[]) =>
        notes.map(({ midi, start, duration }) => [midi, start, duration]);
      expect(timings(fromPiano.notes)).toEqual(timings(song.vocal!.notes));
      expect(fromPiano.length).toBe(song.vocal!.length);
      expect(() =>
        validateLibrary(installSong(initialLibrary, demoSong(index))),
      ).not.toThrow();
    },
  );
  it("reuses an artist by name and never replaces a user-edited example", () => {
    const entry = sourceSong(0);
    const library = structuredClone(initialLibrary);
    library.bands.push({ ...entry.band, id: "existing-artist" });
    const installed = installSong(library, entry);
    expect(installed.bands).toHaveLength(library.bands.length);
    const song = installed.songs.at(-1)!;
    expect(song.bandId).toBe("existing-artist");
    song.title = "Моя редакция";
    expect(installSong(installed, sourceSong(0))).toBe(installed);
    expect(installSong(installed, sourceSong(0)).songs.at(-1)?.title).toBe(
      "Моя редакция",
    );
    expect(library.songs.some((s) => s.id === entry.song.id)).toBe(false);
  });
});

describe("vocal editing and persistence", () => {
  it("splits a held note when inserting a new phrase, without overlapping", () => {
    const result = placeNote([n("held", 60, 0, 4)], n("insert", 64, 1, 1));
    expect(
      result.map(({ midi, start, duration }) => [midi, start, duration]),
    ).toEqual([
      [60, 0, 1],
      [64, 1, 1],
      [60, 2, 2],
    ]);
    expect(overlaps(result)).toBe(false);
    expect(new Set(result.map((n) => n.id)).size).toBe(3);
  });
  it("extracts the lower or upper voice at every boundary, preserving re-attacks", () => {
    const chord = [
      n("bass", 48, 0, 4),
      n("upper", 60, 1, 1),
      n("repeat", 60, 2, 1),
    ];
    expect(
      monophonic(chord, "high").map((n) => [n.midi, n.start, n.duration]),
    ).toEqual([
      [48, 0, 1],
      [60, 1, 1],
      [60, 2, 1],
      [48, 3, 1],
    ]);
    expect(
      monophonic(chord, "low").map((n) => [n.midi, n.start, n.duration]),
    ).toEqual([[48, 0, 4]]);
  });
  it("round trips notes, sound settings and audio metadata through library backups", () => {
    const library = structuredClone(initialLibrary),
      p = vocalExercise();
    p.audio = {
      backing: { name: "track.wav", duration: 30, originalBpm: 84, offset: 2 },
    };
    p.settings.transpose = -3;
    library.songs[0].vocal = p;
    expect(validateLibrary(JSON.parse(JSON.stringify(library)))).toEqual(
      library,
    );
    expect(initialLibrary.songs[0].vocal).toBeUndefined();
  });
  it.each([
    null,
    {},
    { ...createVocalProject(), notes: [n("x", 60, 31, 4)] },
    { ...createVocalProject(), notes: [n("x", 60, 0, 1), n("x", 61, 2, 1)] },
    {
      ...createVocalProject(),
      settings: { ...createVocalProject().settings, loopStart: 4, loopEnd: 4 },
    },
    { ...createVocalProject(), bpm: NaN },
    {
      ...createVocalProject(),
      audio: { backing: { name: "x", duration: Infinity } },
    },
  ])("rejects malformed import %j before persistence", (raw) =>
    expect(() => validateVocalProject(raw)).toThrow(),
  );
  it("checks all shipped original exercises and permits legacy songs without a vocal field", () => {
    for (let i = 0; i < 3; i++) {
      const p = vocalExercise(i);
      expect(validateVocalProject(p)).toEqual(p);
      expect(overlaps(p.notes)).toBe(false);
    }
    expect(() => validateLibrary(initialLibrary)).not.toThrow();
  });
  it("can create notes on insecure LAN HTTP even when microphone is unavailable", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: crypto.getRandomValues.bind(crypto),
    });
    try {
      expect(noteId()).toHaveLength(32);
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("imports fretted notes with capo and ignores dead hits and drums", () => {
    const part = {
      id: "p",
      name: "p",
      instrument: "Гитара",
      tuning: "E A D G B e",
      content: "",
      score: parseNotation("1:3@4 1:x@4 r@2", "guitar", { beats: 4, unit: 4 }),
    };
    const result = notesFromPart(part, 120, 2, "high");
    expect(result.notes.map((n) => n.midi)).toEqual([69]);
    expect(result.length).toBe(4);
  });
});

const be32 = (v: number) => [
  (v >>> 24) & 255,
  (v >>> 16) & 255,
  (v >>> 8) & 255,
  v & 255,
];
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));
const smf = (tracks: number[][], division = 480) =>
  new Uint8Array([
    ...ascii("MThd"),
    ...be32(6),
    0,
    tracks.length > 1 ? 1 : 0,
    0,
    tracks.length,
    division >> 8,
    division & 255,
    ...tracks.flatMap((t) => [...ascii("MTrk"), ...be32(t.length), ...t]),
  ]).buffer;
const vlq = (v: number) => {
  const a = [v & 127];
  while ((v >>>= 7)) a.unshift((v & 127) | 128);
  return a;
};
describe("SMF MIDI import", () => {
  it("handles running status, note-on velocity zero, and separates track selection", () => {
    const data = smf([
      [
        0,
        0xff,
        3,
        4,
        ...ascii("Lead"),
        0,
        0x90,
        60,
        90,
        ...vlq(480),
        60,
        0,
        0,
        0xff,
        0x2f,
        0,
      ],
      [0, 0x91, 48, 80, ...vlq(960), 0x81, 48, 0, 0, 0xff, 0x2f, 0],
    ]);
    const out = readMidi(data);
    expect(out.tracks).toHaveLength(2);
    expect(out.tracks[0].name).toBe("Lead");
    expect(out.tracks[0].notes[0]).toMatchObject({
      midi: 60,
      start: 0,
      duration: 1,
    });
    expect(out.tracks[1].notes[0].duration).toBe(2);
  });
  it("preserves musical time across tempo changes with a normalized beat grid", () => {
    const t = [
      0,
      0xff,
      0x51,
      3,
      7,
      161,
      32,
      0,
      0x90,
      60,
      100,
      ...vlq(480),
      0x80,
      60,
      0,
      0,
      0xff,
      0x51,
      3,
      15,
      66,
      64,
      0,
      0x90,
      62,
      100,
      ...vlq(480),
      0x80,
      62,
      0,
      0,
      0xff,
      0x2f,
      0,
    ];
    const out = readMidi(smf([t]));
    expect(out.bpm).toBe(120);
    expect(out.tracks[0].notes.map((n) => [n.start, n.duration])).toEqual([
      [0, 1],
      [1, 2],
    ]);
  });
  it("rejects corrupt track bounds and MIDI formats with unsupported timing", () => {
    expect(() => readMidi(new ArrayBuffer(0))).toThrow();
    expect(() => readMidi(smf([[0, 0x90, 60]], 0xe728))).toThrow(/SMPTE/);
    expect(() => readMidi(smf([[0, 0xff, 3, 120, 65]]))).toThrow();
  });
  it("does not treat a percussion track as melody", () => {
    expect(() =>
      readMidi(
        smf([[0, 0x99, 60, 100, ...vlq(480), 0x89, 60, 0, 0, 0xff, 0x2f, 0]]),
      ),
    ).toThrow(/мелодических/);
  });
});

describe("pitch and meaningful feedback", () => {
  it.each([82.4069, 130.8128, 220, 440, 880])(
    "detects harmonic tones at %s Hz within 12 cents",
    (f) => {
      const pitch = detectPitch(tone(f), 22050);
      expect(pitch.midi).not.toBeNull();
      expect(Math.abs(1200 * Math.log2(pitch.frequency! / f))).toBeLessThan(12);
      expect(pitch.confidence).toBeGreaterThan(0.85);
    },
  );
  it("rejects silence, DC, and broadband nonperiodic noise", () => {
    expect(detectPitch(new Float32Array(2048), 22050).midi).toBeNull();
    expect(
      detectPitch(new Float32Array(2048).fill(0.8), 22050).midi,
    ).toBeNull();
    let state = 19;
    const noise = Float32Array.from({ length: 2048 }, () => {
      state = (state * 16807) % 2147483647;
      return (state / 2147483647 - 0.5) * 0.5;
    });
    expect(detectPitch(noise, 22050).midi).toBeNull();
  });
  it("segments a held note, pause and next pitch without filling the pause", () => {
    const pts = [
      ...Array.from({ length: 8 }, (_, i) => ({
        beat: i * 0.1,
        midi: 60.05,
        confidence: 0.99,
      })),
      { beat: 0.8, midi: null, confidence: 0 },
      ...Array.from({ length: 8 }, (_, i) => ({
        beat: 0.9 + i * 0.1,
        midi: 62.1,
        confidence: 0.98,
      })),
    ];
    expect(
      segmentPitch(pts, 0.1).map((n) => [
        n.midi,
        +n.start.toFixed(1),
        +n.duration.toFixed(1),
      ]),
    ).toEqual([
      [60, 0, 0.8],
      [62, 0.9, 0.8],
    ]);
  });
  it("scores unvoiced reference time as misses, never fabricated success", () => {
    const pts = Array.from({ length: 20 }, (_, i) => ({
      beat: i / 10,
      midi: i < 10 ? 60 : null,
      confidence: 1,
    }));
    const score = scoreTake(pts, [n("one", 60, 0, 2)], 0, 50);
    expect(score.accuracy).toBe(50);
    expect(score.coverage).toBe(50);
    expect(scoreTake([], [], 0, 50).accuracy).toBeNull();
  });
  it("compares to transposed targets and keeps stability distinct from correctness", () => {
    const points = Array.from({ length: 20 }, (_, i) => ({
      beat: i * 0.05,
      midi: 62.1,
      confidence: 1,
    }));
    expect(scoreTake(points, [n("one", 60, 0, 1)], 2, 25).accuracy).toBe(100);
    const wrong = scoreTake(points, [n("one", 60, 0, 1)], 0, 50);
    expect(wrong.accuracy).toBe(0);
    expect(wrong.stability).toBe(100);
  });
  it("changes audio tempo independently of pitch, including a pitch shift", () => {
    const input = tone(220, 44100, 44100 * 2);
    const [faster] = transformAudio([input], 44100, 1.25, 0);
    expect(faster.length).toBe(Math.ceil(input.length / 1.25));
    expect(
      detectPitch(faster.slice(18000, 22096), 44100).frequency,
    ).toBeCloseTo(220, 0);
    const [higher] = transformAudio([input], 44100, 0.75, 12);
    expect(higher.length).toBe(Math.ceil(input.length / 0.75));
    expect(
      detectPitch(higher.slice(18000, 22096), 44100).frequency,
    ).toBeCloseTo(440, 0);
  });
});
