/** Probabilistic YIN candidates; temporal tracking lives in transcribe.ts. */
export type PitchRange = "auto" | "low" | "middle" | "high";
export type PitchCandidate = {
  midi: number;
  frequency: number;
  probability: number;
  confidence: number;
};
export type PitchFrame = {
  candidates: PitchCandidate[];
  rms: number;
  voiced: number;
};
export const pitchRanges: Record<PitchRange, [number, number]> = {
  auto: [65, 1100],
  low: [65, 350],
  middle: [100, 600],
  high: [180, 1100],
};
const thresholdCdf = (x: number) => 1 - (1 - x) ** 18 * (1 + 18 * x);
export function pitchCandidates(
  input: Float32Array,
  sampleRate: number,
  gate = 4e-3,
  range: PitchRange = "auto",
): PitchFrame {
  const [fmin, fmax] = pitchRanges[range];
  const maxTau = Math.min(input.length / 2 - 2, Math.ceil(sampleRate / fmin));
  const minTau = Math.max(2, Math.floor(sampleRate / fmax));
  let power = 0,
    mean = 0;
  for (const v of input) mean += v;
  mean /= input.length;
  const signal = Float64Array.from(input, (v) => v - mean);
  for (const v of signal) power += v * v;
  const rms = Math.sqrt(power / input.length);
  if (rms < gate || maxTau <= minTau) return { candidates: [], rms, voiced: 0 };
  const curve = new Float64Array(maxTau + 2);
  let running = 0,
    prefix = 0;
  for (let tau = 1; tau <= maxTau + 1; tau++) {
    prefix += signal[tau - 1] ** 2;
    let correlation = 0;
    for (let i = 0; i < signal.length - tau; i++)
      correlation += signal[i] * signal[i + tau];
    const difference = Math.max(0, 2 * (power - correlation) - prefix);
    running += difference;
    curve[tau] = running ? (difference * tau) / running : 1;
  }
  const minima = [];
  for (let tau = minTau; tau <= maxTau; tau++) {
    if (
      (tau === minTau || curve[tau] < curve[tau - 1]) &&
      curve[tau] <= curve[tau + 1]
    )
      minima.push({ tau, value: curve[tau], mass: 0 });
  }
  if (!minima.length) return { candidates: [], rms, voiced: 0 };
  const best = minima.reduce((a, b) => (a.value < b.value ? a : b));
  for (let bin = 1; bin <= 100; bin++) {
    const threshold = bin / 100;
    const mass = thresholdCdf(threshold) - thresholdCdf((bin - 1) / 100);
    const accepted = minima.filter((m) => m.value < threshold);
    if (!accepted.length) {
      best.mass += 0.01 * mass;
      continue;
    }
    const normalizer = accepted.reduce(
      (sum, _, rank) => sum + Math.exp(-2 * rank),
      0,
    );
    accepted.forEach((m, rank) => {
      m.mass += (mass * Math.exp(-2 * rank)) / normalizer;
    });
  }
  const candidates = minima
    .map((m) => {
      const denominator =
        2 * (2 * m.value - curve[m.tau - 1] - curve[m.tau + 1]);
      const delta = denominator
        ? (curve[m.tau + 1] - curve[m.tau - 1]) / denominator
        : 0;
      const tau = m.tau + (Math.abs(delta) <= 1 ? delta : 0);
      const frequency = sampleRate / tau;
      return {
        frequency,
        midi: 69 + 12 * Math.log2(frequency / 440),
        confidence: Math.max(0, 1 - m.value),
        probability: m.mass,
      };
    })
    .filter(
      (c) => c.frequency >= fmin && c.frequency <= fmax && c.probability > 1e-9,
    );
  const voiced = Math.min(
    0.999,
    candidates.reduce((s, c) => s + c.probability, 0),
  );
  for (const c of candidates) c.probability /= voiced || 1;
  return { candidates, rms, voiced };
}
