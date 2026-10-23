import type { PitchPoint, VocalNote } from "./model";
export function audioJob<T>(
  data: unknown,
  transfer: Transferable[] = [],
  onProgress?: (value: number) => void,
  neural = false,
) {
  const worker = neural
    ? new Worker(new URL("./neural.worker.ts", import.meta.url), {
        type: "module",
      })
    : new Worker(new URL("./audio.worker.ts", import.meta.url), {
        type: "module",
      });
  let rejectJob: (e: Error) => void = () => {};
  const promise = new Promise<T>((resolve, reject) => {
    rejectJob = reject;
    worker.onmessage = (e) => {
      if ("progress" in e.data) {
        onProgress?.(e.data.progress);
        return;
      }
      worker.terminate();
      if (e.data.error) reject(new Error(e.data.error));
      else resolve(e.data.result);
    };
    worker.onerror = () => {
      worker.terminate();
      reject(new Error("Не удалось запустить обработку аудио"));
    };
    worker.postMessage(data, transfer);
  });
  return {
    promise,
    cancel() {
      worker.terminate();
      rejectJob(new DOMException("Отменено", "AbortError"));
    },
  };
}
export async function decodeFile(
  file: File,
  context: AudioContext,
): Promise<AudioBuffer> {
  if (file.size > 64 * 1024 * 1024)
    throw new Error("Аудиофайл должен быть не больше 64 МБ");
  let buffer: AudioBuffer;
  try {
    buffer = await context.decodeAudioData(await file.arrayBuffer());
  } catch {
    throw new Error("Не удалось прочитать аудио. Попробуйте MP3 или WAV.");
  }
  if (buffer.duration > 360)
    throw new Error("Выберите аудиофрагмент до 6 минут");
  if (buffer.duration < 0.1) throw new Error("Аудиофайл слишком короткий");
  return buffer;
}
export async function analysisSamples(buffer: AudioBuffer, sampleRate = 11025) {
  const context = new OfflineAudioContext(
    1,
    Math.ceil(buffer.duration * sampleRate),
    sampleRate,
  );
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  source.start();
  return (await context.startRendering()).getChannelData(0);
}
export type Transcription = { notes: VocalNote[]; points: PitchPoint[] };
export function waveform(buffer: AudioBuffer, count = 1200): number[] {
  const channel = buffer.getChannelData(0),
    step = Math.max(1, Math.floor(channel.length / count));
  return Array.from({ length: Math.min(count, channel.length) }, (_, i) => {
    let peak = 0;
    for (let j = i * step; j < Math.min(channel.length, (i + 1) * step); j++)
      peak = Math.max(peak, Math.abs(channel[j]));
    return peak;
  });
}
