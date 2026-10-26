import { detectPitch, type Pitch } from "../vocal/pitch";
export type InstrumentFrame = Pitch & { peak: number };
export function analyseInstrumentFrame(
  raw: Float32Array,
  sampleRate: number,
): InstrumentFrame {
  const stride = Math.max(1, Math.floor(sampleRate / 24000)),
    data = new Float32Array(Math.floor(raw.length / stride));
  let peak = 0;
  for (const value of raw) peak = Math.max(peak, Math.abs(value));
  for (let i = 0; i < data.length; i++)
    for (let j = 0; j < stride; j++) data[i] += raw[i * stride + j] / stride;
  const pitch = detectPitch(data, sampleRate / stride, 0.006, {
    minFrequency: 55,
    maxFrequency: 1600,
  });
  return {
    ...pitch,
    ...(peak >= 0.98 ? { midi: null, frequency: null, confidence: 0 } : {}),
    peak,
  };
}
export async function inputDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  return (await navigator.mediaDevices.enumerateDevices()).filter(
    (d) => d.kind === "audioinput",
  );
}
/** Input is never connected to speakers or recorded. Cancelled late streams are released. */
export class InstrumentInput {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private generation = 0;
  async start(
    deviceId: string,
    frame: (p: InstrumentFrame) => void,
    ended: () => void,
  ): Promise<boolean> {
    this.stop();
    const token = this.generation;
    if (!navigator.mediaDevices?.getUserMedia)
      throw Error("Для аудиовхода откройте сайт через HTTPS или localhost.");
    try {
      const ctx = new AudioContext({ latencyHint: "interactive" });
      this.context = ctx;
      await ctx.resume();
      if (token !== this.generation) return false;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      if (token !== this.generation) {
        stream.getTracks().forEach((t) => t.stop());
        return false;
      }
      this.stream = stream;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = ctx.sampleRate > 64000 ? 8192 : 4096;
      this.source = ctx.createMediaStreamSource(stream);
      this.source.connect(analyser);
      const raw = new Float32Array(analyser.fftSize);
      this.timer = setInterval(() => {
        if (token !== this.generation) return;
        analyser.getFloatTimeDomainData(raw);
        frame(analyseInstrumentFrame(raw, ctx.sampleRate));
      }, 35);
      for (const track of stream.getTracks())
        track.onended = () => {
          this.stop();
          ended();
        };
      return true;
    } catch (error) {
      if (token !== this.generation) return false;
      this.stop();
      const name = error instanceof Error ? error.name : "";
      throw Error(
        name === "NotAllowedError"
          ? "Нет доступа к аудиовходу. Разрешите микрофон в настройках браузера."
          : [
                "NotFoundError",
                "OverconstrainedError",
                "NotReadableError",
              ].includes(name)
            ? "Аудиовход недоступен. Выберите другое устройство или освободите его в другой программе."
            : "Не удалось включить аудиовход. Проверьте устройство и разрешение браузера.",
      );
    }
  }
  stop() {
    this.generation++;
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.stream?.getTracks().forEach((t) => {
      t.onended = null;
      t.stop();
    });
    this.stream = null;
    this.source?.disconnect();
    this.source = null;
    if (this.context && this.context.state !== "closed")
      void this.context.close().catch(() => {});
    this.context = null;
  }
}
