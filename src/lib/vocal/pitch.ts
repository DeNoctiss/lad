import type { PitchPoint, VocalNote } from "./model";
export type Pitch = {
  midi: number | null;
  frequency: number | null;
  confidence: number;
  rms: number;
};
export const midiToFrequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
export const frequencyToMidi = (f: number) => 69 + 12 * Math.log2(f / 440);
/** YIN normalized difference with a fixed comparison window and parabolic interpolation. */
export function detectPitch(
  input: Float32Array,
  sampleRate: number,
  gate = 0.008,
  range = { minFrequency: 65, maxFrequency: 1100 },
): Pitch {
  const half = Math.floor(input.length / 2),
    maxTau = Math.min(half - 1, Math.ceil(sampleRate / range.minFrequency)),
    minTau = Math.max(2, Math.floor(sampleRate / range.maxFrequency));
  let rms = 0,
    mean = 0;
  for (const v of input) mean += v;
  mean /= input.length;
  for (const v of input) rms += (v - mean) ** 2;
  rms = Math.sqrt(rms / input.length);
  const silent = { midi: null, frequency: null, confidence: 0, rms };
  if (rms < gate || maxTau <= minTau) return silent;
  const d = new Float32Array(maxTau + 1);
  let running = 0;
  for (let tau = 1; tau <= maxTau; tau++) {
    let sum = 0;
    for (let i = 0; i < half; i++) {
      const delta = input[i] - input[i + tau];
      sum += delta * delta;
    }
    running += sum;
    d[tau] = running ? (sum * tau) / running : 1;
  }
  let tau = minTau;
  while (tau < maxTau) {
    if (d[tau] < 0.15) {
      while (tau + 1 <= maxTau && d[tau + 1] < d[tau]) tau++;
      break;
    }
    tau++;
  }
  if (tau >= maxTau || d[tau] > 0.25) return silent;
  const before = d[tau - 1],
    value = d[tau],
    after = d[tau + 1] ?? value;
  const denom = 2 * (2 * value - after - before);
  const refined = tau + (denom ? (after - before) / denom : 0);
  const frequency = sampleRate / refined;
  return {
    frequency,
    midi: frequencyToMidi(frequency),
    confidence: 1 - value,
    rms,
  };
}
export function segmentPitch(
  points: PitchPoint[],
  hopBeats: number,
): VocalNote[] {
  const result: VocalNote[] = [];
  let active: VocalNote | null = null;
  const finish = () => {
    if (active && active.duration >= Math.max(0.06, hopBeats * 3))
      result.push(active);
    active = null;
  };
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    // Median of three voiced frames removes isolated octave/quantization errors.
    const neighbors = points
      .slice(Math.max(0, i - 1), i + 2)
      .filter((x) => x.midi !== null)
      .map((x) => x.midi!)
      .sort((a, b) => a - b);
    const midi =
      p.midi === null
        ? null
        : Math.round(neighbors[Math.floor(neighbors.length / 2)]);
    if (midi === null || midi < 21 || midi > 108) {
      finish();
      continue;
    }
    if (
      active &&
      active.midi === midi &&
      p.beat - active.start - active.duration < hopBeats * 1.5
    )
      active.duration = p.beat + hopBeats - active.start;
    else {
      finish();
      active = { id: "detected-" + i, midi, start: p.beat, duration: hopBeats };
    }
  }
  finish();
  return result;
}
export type TrainingMetrics = {
  accuracy: number | null;
  rhythm: number | null;
  stability: number | null;
  coverage: number | null;
  cents: number | null;
  target: number | null;
  scored: number;
};
/** Silence counts as missed coverage/accuracy. A seek or loop starts a new take. */
export function scoreTake(
  points: PitchPoint[],
  notes: VocalNote[],
  transpose: number,
  tolerance: number,
): TrainingMetrics {
  const errors: { cents: number; id: string }[] = [];
  let expected = 0,
    correct = 0;
  const first = new Map<string, number>();
  const sorted = [...notes].sort((a, b) => a.start - b.start);
  let cursor = 0;
  for (const p of points) {
    while (
      cursor < sorted.length &&
      sorted[cursor].start + sorted[cursor].duration <= p.beat
    )
      cursor++;
    const candidate = sorted[cursor];
    const n = candidate && p.beat >= candidate.start ? candidate : undefined;
    if (!n) continue;
    expected++;
    if (p.midi === null) continue;
    const cents = (p.midi - n.midi - transpose) * 100;
    errors.push({ cents, id: n.id });
    if (Math.abs(cents) <= tolerance) correct++;
    if (!first.has(n.id)) first.set(n.id, p.beat);
  }
  const last = points.at(-1),
    target =
      last &&
      notes.find(
        (n) => last.beat >= n.start && last.beat < n.start + n.duration,
      );
  const groups = new Map<string, number[]>();
  for (const e of errors) {
    const group = groups.get(e.id) ?? [];
    group.push(e.cents);
    groups.set(e.id, group);
  }
  const deviations = [...groups.values()]
    .filter((g) => g.length >= 5)
    .map((g) => {
      const mean = g.reduce((a, b) => a + b, 0) / g.length;
      return Math.sqrt(g.reduce((a, b) => a + (b - mean) ** 2, 0) / g.length);
    });
  // Onsets are scored only if the take includes the start of the note.
  const ended = notes.filter(
    (n) =>
      n.start >= (points[0]?.beat ?? 0) &&
      n.start + Math.min(0.25, n.duration) < (last?.beat ?? 0),
  );
  const rhythm = ended.length
    ? Math.round(
        (100 *
          ended.reduce(
            (sum, n) =>
              sum +
              (first.has(n.id)
                ? Math.max(0, 1 - (first.get(n.id)! - n.start) / 0.5)
                : 0),
            0,
          )) /
          ended.length,
      )
    : null;
  return {
    accuracy: expected >= 5 ? Math.round((correct / expected) * 100) : null,
    coverage:
      expected >= 5 ? Math.round((errors.length / expected) * 100) : null,
    stability: deviations.length
      ? Math.round(
          Math.max(
            0,
            100 - deviations.reduce((a, b) => a + b, 0) / deviations.length,
          ),
        )
      : null,
    rhythm,
    cents:
      target && last?.midi !== null && last?.midi !== undefined
        ? (last.midi - target.midi - transpose) * 100
        : null,
    target: target ? target.midi + transpose : null,
    scored: expected,
  };
}
