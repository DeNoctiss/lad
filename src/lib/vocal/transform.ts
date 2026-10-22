import { SimpleFilter, SoundTouch } from "soundtouchjs";
/** Independent time/pitch transform. Used in a worker; silence flushes the DSP tail. */
export function transformAudio(
  channels: Float32Array[],
  sampleRate: number,
  tempo: number,
  semitones: number,
): Float32Array[] {
  if (tempo === 1 && semitones === 0) return channels;
  const length = channels[0].length,
    outLength = Math.ceil(length / tempo);
  const left = channels[0],
    right = channels[1] ?? left;
  const touch = new SoundTouch();
  touch.stretch.setParameters(sampleRate, 0, 0, 8);
  touch.tempo = tempo;
  touch.pitchSemitones = semitones;
  const source = {
    extract(target: Float32Array, frames: number, position: number) {
      const n = Math.min(frames, Math.max(0, length + 32768 - position));
      for (let i = 0; i < n; i++) {
        target[i * 2] = left[position + i] ?? 0;
        target[i * 2 + 1] = right[position + i] ?? 0;
      }
      return n;
    },
  };
  const filter = new SimpleFilter(source, touch),
    chunk = new Float32Array(8192);
  const output = [new Float32Array(outLength), new Float32Array(outLength)];
  let position = 0;
  while (position < outLength) {
    const n = filter.extract(chunk, Math.min(4096, outLength - position));
    if (!n) break;
    for (let i = 0; i < n; i++) {
      output[0][position + i] = chunk[2 * i];
      output[1][position + i] = chunk[2 * i + 1];
    }
    position += n;
  }
  return output;
}
