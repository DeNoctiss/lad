import { liveAnalysisConfig, analyseLiveFrame } from "./liveAnalysis";
import type { AnalysisMode, MicrophoneTiming } from "./liveAnalysis";
import type { Pitch } from "./pitch";
export class VocalMicrophone {
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private monitor: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private generation = 0;
  timing: MicrophoneTiming | null = null;
  async start(
    context: AudioContext,
    deviceId: string,
    onPitch: (p: Pitch) => void,
    onEnded: () => void,
    mode: AnalysisMode = "fast",
  ) {
    this.stop();
    const generation = ++this.generation;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
      throw new Error(
        "Микрофон доступен на HTTPS или localhost. Откройте приложение по защищённому адресу.",
      );
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      throw new Error(
        name === "NotAllowedError"
          ? "Доступ к микрофону отклонён. Разрешите его в настройках сайта и нажмите ещё раз."
          : name === "NotFoundError" || name === "OverconstrainedError"
            ? "Микрофон не найден. Выберите другое устройство."
            : "Не удалось открыть микрофон. Проверьте, не занят ли он другим приложением.",
      );
    }
    if (generation !== this.generation) {
      stream.getTracks().forEach((t) => t.stop());
      return false;
    }
    this.stream = stream;
    stream.getTracks().forEach((t) => {
      t.onended = () => {
        this.stop();
        onEnded();
      };
    });
    await context.resume();
    if (generation !== this.generation) return false;
    this.source = context.createMediaStreamSource(stream);
    const config = liveAnalysisConfig(context.sampleRate, mode);
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = config.fftSize;
    this.source.connect(this.analyser);
    this.monitor = context.createGain();
    this.monitor.gain.value = 0;
    this.source.connect(this.monitor);
    this.monitor.connect(context.destination);
    const raw = new Float32Array(config.fftSize),
      down = new Float32Array(config.samples);
    const inputLatency = (
      stream.getAudioTracks()[0]?.getSettings() as
        | { latency?: number }
        | undefined
    )?.latency;
    this.timing = {
      windowMs: config.windowMs,
      intervalMs: config.intervalMs,
      sampleRate: context.sampleRate,
      inputMs:
        typeof inputLatency === "number" && Number.isFinite(inputLatency)
          ? inputLatency * 1000
          : null,
      outputMs:
        typeof context.outputLatency === "number" &&
        Number.isFinite(context.outputLatency)
          ? (context.baseLatency + context.outputLatency) * 1000
          : null,
    };
    this.timer = setInterval(() => {
      if (!this.analyser) return;
      this.analyser.getFloatTimeDomainData(raw);
      onPitch(
        analyseLiveFrame(raw, down, config.decimation, context.sampleRate),
      );
    }, config.intervalMs);
    return true;
  }
  setMonitor(volume: number) {
    if (this.monitor) this.monitor.gain.value = volume * 0.6;
  }
  stop() {
    this.generation++;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.timing = null;
    this.stream?.getTracks().forEach((t) => {
      t.onended = null;
      t.stop();
    });
    this.stream = null;
    this.source?.disconnect();
    this.monitor?.disconnect();
    this.analyser?.disconnect();
    this.source = null;
    this.monitor = null;
    this.analyser = null;
  }
}
