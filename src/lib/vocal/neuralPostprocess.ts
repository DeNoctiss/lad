import { phraseNotes } from "./transcribe";
import { pitchRanges, type PitchRange } from "./yin";
import type { PitchPoint, VocalNote } from "./model";
export type TranscriptionEngine = "classic" | "basic-pitch";
export type NeuralFrames = { frames: number[][]; onsets: number[][] };
// Timing convention from Spotify basic-pitch-ts/toMidi.ts, Apache-2.0.
export function neuralFrameTime(frame: number) {
  const hop = 256 / 22050;
  const offset = hop * (172 - (22050 * 2 - 256) / 256) + 0.0018;
  return frame * hop - offset * Math.floor(frame / 172);
}
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
/** Select one lead line. Continuity is a preference, not a blanket octave shift. */
export function neuralMelody(
  data: NeuralFrames,
  bpm: number,
  duration: number,
  range: PitchRange = "auto",
) {
  const { frames, onsets } = data,
    [low, high] = pitchRanges[range];
  const pitches = Array.from({ length: 88 }, (_, i) => i + 21).filter(
    (m) => hz(m) >= low && hz(m) <= high,
  );
  const silence = pitches.length,
    states = silence + 1;
  const back = new Uint8Array(frames.length * states);
  let costs = new Float64Array(states);
  const path = new Int16Array(frames.length);
  for (let i = 0; i < frames.length; i++) {
    const row = frames[i],
      peak = Math.max(0, ...pitches.map((m) => row[m - 21] ?? 0));
    const next = new Float64Array(states);
    for (let j = 0; j < states; j++) {
      const p =
        j === silence
          ? Math.max(0.001, 1 - peak)
          : Math.max(0.001, row[pitches[j] - 21] ?? 0);
      const emission =
        j === silence
          ? -Math.log(p) + 0.65
          : -Math.log(p) -
            0.3 * (onsets[i]?.[pitches[j] - 21] ?? 0) +
            (peak < 0.15 ? 4 : 0);
      let best = Infinity,
        from = 0;
      for (let k = 0; k < states; k++) {
        const dist =
          j === silence || k === silence
            ? 0
            : Math.abs(pitches[j] - pitches[k]);
        const transition =
          j === k
            ? 0
            : j === silence || k === silence
              ? 0.35
              : 0.7 + Math.min(dist, 12) * 0.07;
        const value = costs[k] + transition;
        if (value < best) {
          best = value;
          from = k;
        }
      }
      next[j] = emission + best;
      back[i * states + j] = from;
    }
    const minimum = Math.min(...next);
    for (let j = 0; j < states; j++) next[j] -= minimum;
    costs = next;
  }
  let state = Array.from(costs).indexOf(Math.min(...costs));
  for (let i = frames.length - 1; i >= 0; i--) {
    path[i] = state === silence ? -1 : pitches[state];
    state = back[i * states + state];
  }
  const points: PitchPoint[] = Array.from(path, (m, i) => ({
    beat: (Math.min(duration, Math.max(0, neuralFrameTime(i))) * bpm) / 60,
    midi: m < 0 ? null : m,
    confidence: m < 0 ? 0 : frames[i][m - 21],
  }));
  const notes = phraseNotes(points, ((256 / 22050) * bpm) / 60, bpm);
  const split: VocalNote[] = [];
  for (const note of notes) {
    const start = (note.start * 60) / bpm,
      end = ((note.start + note.duration) * 60) / bpm;
    let cursor = start;
    for (
      let i = Math.max(1, Math.floor((start * 22050) / 256));
      i < onsets.length;
      i++
    ) {
      const t = neuralFrameTime(i);
      if (t >= end - 0.09) break;
      const o = onsets[i]?.[note.midi - 21] ?? 0;
      if (
        t - cursor >= 0.09 &&
        o >= 0.65 &&
        o > (onsets[i - 1]?.[note.midi - 21] ?? 0) &&
        o >= (onsets[i + 1]?.[note.midi - 21] ?? 0)
      ) {
        split.push({
          ...note,
          id: `neural-${split.length}`,
          start: (cursor * bpm) / 60,
          duration: ((t - cursor) * bpm) / 60,
        });
        cursor = t;
      }
    }
    split.push({
      ...note,
      id: `neural-${split.length}`,
      start: (cursor * bpm) / 60,
      duration: ((Math.min(end, duration) - cursor) * bpm) / 60,
    });
  }
  return {
    notes: split.filter(
      (n) => n.duration >= 1 / 64 && n.start < (duration * bpm) / 60,
    ),
    points,
  };
}
