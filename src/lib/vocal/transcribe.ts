import { pitchCandidates } from "./yin";
import type { PitchCandidate, PitchFrame, PitchRange } from "./yin";
import type { PitchPoint, VocalNote } from "./model";
/** Viterbi tracking preserves continuity while permitting real register changes. */
function trackPitch(frames: PitchFrame[]): (number | null)[] {
  if (!frames.length) return [];
  const low = 35,
    resolution = 4,
    bins = (87 - low) * resolution + 1;
  const radius = 10;
  const states = bins * 2,
    previous = new Uint16Array(frames.length * states);
  let costs = new Float64Array(states);
  const transitions = Float64Array.from(
    { length: radius + 1 },
    (_, d) => -Math.log((radius + 1 - d) / (radius + 1) ** 2),
  );
  const stay = -Math.log(0.99),
    switchVoice = -Math.log(0.01);
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i],
      observations = new Float64Array(bins);
    for (const c of frame.candidates) {
      const bin = Math.round((c.midi - low) * resolution);
      if (bin >= 0 && bin < bins)
        observations[bin] += frame.voiced * c.probability;
    }
    const next = new Float64Array(states);
    const unvoiced = -Math.log(Math.max(1e-12, (1 - frame.voiced) / bins));
    let minimum = Infinity;
    for (let bin = 0; bin < bins; bin++) {
      let voicedCost = Infinity,
        silentCost = Infinity,
        voicedFrom = 0,
        silentFrom = 0;
      for (
        let k = Math.max(0, bin - radius);
        k <= Math.min(bins - 1, bin + radius);
        k++
      ) {
        const move = transitions[Math.abs(bin - k)];
        const v = costs[k] + move,
          u = costs[k + bins] + move;
        if (v + stay < voicedCost) {
          voicedCost = v + stay;
          voicedFrom = k;
        }
        if (u + switchVoice < voicedCost) {
          voicedCost = u + switchVoice;
          voicedFrom = k + bins;
        }
        if (u + stay < silentCost) {
          silentCost = u + stay;
          silentFrom = k + bins;
        }
        if (v + switchVoice < silentCost) {
          silentCost = v + switchVoice;
          silentFrom = k;
        }
      }
      next[bin] = voicedCost - Math.log(Math.max(1e-12, observations[bin]));
      next[bin + bins] = silentCost + unvoiced;
      previous[i * states + bin] = voicedFrom;
      previous[i * states + bin + bins] = silentFrom;
      minimum = Math.min(minimum, next[bin], next[bin + bins]);
    }
    for (let j = 0; j < states; j++) next[j] -= minimum;
    costs = next;
  }
  let state = Array.from(costs).indexOf(Math.min(...costs));
  const path: (number | null)[] = new Array(frames.length);
  for (let i = frames.length - 1; i >= 0; i--) {
    const pitch = low + state / resolution;
    const candidate =
      state < bins
        ? frames[i].candidates.reduce<PitchCandidate | null>(
            (best, c) =>
              !best || Math.abs(c.midi - pitch) < Math.abs(best.midi - pitch)
                ? c
                : best,
            null,
          )
        : null;
    path[i] =
      candidate && Math.abs(candidate.midi - pitch) < 0.25
        ? candidate.midi
        : null;
    state = previous[i * states + state];
  }
  return path;
}
function phraseNotes(
  points: PitchPoint[],
  hopBeats: number,
  bpm: number,
): VocalNote[] {
  const smooth = points.map((p, i) => {
    if (p.midi === null) return null;
    const values = points
      .slice(Math.max(0, i - 2), i + 3)
      .filter((p2) => p2.midi !== null)
      .map((p2) => p2.midi!)
      .sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)];
  });
  for (let i = 1; i < smooth.length - 1; i++) {
    if (smooth[i] !== null || smooth[i - 1] === null) continue;
    let end = i;
    while (end < smooth.length && smooth[end] === null && end - i < 3) end++;
    if (
      end < smooth.length &&
      smooth[end] !== null &&
      Math.abs(smooth[i - 1]! - smooth[end]!) < 0.7
    )
      for (let j = i; j < end; j++)
        smooth[j] = (smooth[i - 1]! + smooth[end]!) / 2;
  }
  const minimum = (0.075 * bpm) / 60,
    hold = Math.max(3, Math.round((0.045 * bpm) / 60 / hopBeats));
  const notes: VocalNote[] = [];
  let active: VocalNote | null = null,
    pendingStart = 0,
    pending: number | null = null,
    count = 0;
  const finish = (end: number) => {
    if (active) {
      active.duration = Math.max(0, end - active.start);
      if (active.duration >= Math.max(minimum, 1 / 64)) notes.push(active);
    }
    active = null;
  };
  for (let i = 0; i < points.length; i++) {
    const p = smooth[i],
      time = Math.max(0, points[i].beat - hopBeats / 2);
    if (p === null) {
      finish(time);
      pending = null;
      count = 0;
      continue;
    }
    if (!active) {
      active = {
        id: "phrase-" + i,
        midi: Math.round(p),
        start: time,
        duration: hopBeats,
      };
      continue;
    }
    const next = Math.round(p);
    if (next === active.midi || Math.abs(p - active.midi) < 0.7) {
      pending = null;
      count = 0;
      continue;
    }
    if (next !== pending) {
      pending = next;
      pendingStart = time;
      count = 1;
    } else count++;
    if (count >= hold) {
      finish(pendingStart);
      active = {
        id: "phrase-" + i,
        midi: next,
        start: pendingStart,
        duration: hopBeats,
      };
      pending = null;
      count = 0;
    }
  }
  finish((points.at(-1)?.beat ?? 0) + hopBeats / 2);
  return notes.filter((n) => n.midi >= 21 && n.midi <= 108);
}
function transcribeAudio(
  samples: Float32Array,
  sampleRate: number,
  bpm: number,
  range: PitchRange = "auto",
  progress: (value: number) => void = () => {},
) {
  const size = 2048,
    hop = 128,
    frames: PitchFrame[] = [],
    buffer = new Float32Array(size);
  const count = Math.ceil(samples.length / hop);
  for (let f = 0; f < count; f++) {
    const from = f * hop - size / 2;
    for (let j = 0; j < size; j++) buffer[j] = samples[from + j] ?? 0;
    frames.push(pitchCandidates(buffer, sampleRate, 4e-3, range));
    if (f % 100 === 0) progress((0.88 * f) / count);
  }
  const path = trackPitch(frames);
  progress(0.94);
  const points = path.map((midi, i) => ({
    beat: (((i * hop) / sampleRate) * bpm) / 60,
    midi,
    confidence:
      midi === null
        ? 0
        : frames[i].candidates.find((c) => c.midi === midi)!.confidence,
  }));
  const notes = phraseNotes(points, ((hop / sampleRate) * bpm) / 60, bpm);
  progress(1);
  return { points, notes };
}
export { phraseNotes, trackPitch, transcribeAudio };
