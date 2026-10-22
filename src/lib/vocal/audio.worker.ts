import { transcribeAudio } from "./transcribe";
import { transformAudio } from "./transform";
self.onmessage = (event: MessageEvent) => {
  try {
    const d = event.data;
    if (d.task === "transform") {
      const channels = transformAudio(
        d.channels,
        d.sampleRate,
        d.tempo,
        d.transpose,
      );
      self.postMessage(
        { result: channels },
        { transfer: channels.map((c) => c.buffer) },
      );
      return;
    }
    self.postMessage({
      result: transcribeAudio(
        d.samples,
        d.sampleRate,
        d.bpm,
        d.range ?? "auto",
        (progress) => self.postMessage({ progress }),
      ),
    });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "Ошибка обработки аудио",
    });
  }
};
