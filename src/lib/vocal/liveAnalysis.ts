import { detectPitch } from "./pitch";

export type AnalysisMode = "fast" | "stable";
/** Keep the YIN analysis rate near 22–24 kHz, including 96 kHz devices. */
export function liveAnalysisConfig(
  sampleRate: number,
  mode: AnalysisMode = "fast",
) {
  const decimation = Math.max(
    1,
    2 ** Math.round(Math.log2(sampleRate / 24000)),
  );
  const samples = mode === "fast" ? 1024 : 2048;
  return {
    decimation,
    samples,
    fftSize: samples * decimation,
    sampleRate: sampleRate / decimation,
    intervalMs: mode === "fast" ? 20 : 40,
    windowMs: ((samples * decimation) / sampleRate) * 1000,
  };
}
/** Reuse buffers; averaging before decimation reduces high-frequency energy. */
export function analyseLiveFrame(
  raw: Float32Array,
  down: Float32Array,
  decimation: number,
  sampleRate: number,
) {
  for (let i = 0; i < down.length; i++) {
    let sum = 0;
    for (let j = 0; j < decimation; j++) sum += raw[i * decimation + j];
    down[i] = sum / decimation;
  }
  return detectPitch(down, sampleRate / decimation);
}

export type MicrophoneTiming = {
  windowMs: number;
  intervalMs: number;
  sampleRate: number;
  inputMs: number | null;
  outputMs: number | null;
};
