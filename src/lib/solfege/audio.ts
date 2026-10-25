import { Soundfont } from "smplr";
import { soundFile } from "../partSounds";
import type { SoundNote } from "./exercises";
export type AudioState = "idle" | "loading" | "playing";
/** Same local grand-piano SoundFont and sample engine as TabPlayer. */
export class SolfegeAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private piano: Promise<Soundfont> | null = null;
  private stops: (() => void)[] = [];
  private generation = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<(state: AudioState) => void>();
  state: AudioState = "idle";
  subscribe(listener: (state: AudioState) => void) {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }
  private emit(state: AudioState) {
    this.state = state;
    this.listeners.forEach((fn) => fn(state));
  }
  async ready() {
    if (!this.context || this.context.state === "closed") {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.8;
      const compressor = this.context.createDynamicsCompressor();
      this.master.connect(compressor).connect(this.context.destination);
      this.piano = null;
    }
    const context = this.context;
    await context.resume();
    return context;
  }
  stop() {
    this.generation++;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    for (const stop of this.stops) {
      try {
        stop();
      } catch {
        /* already stopped */
      }
    }
    this.stops = [];
    if (this.master && this.context)
      this.master.gain.setValueAtTime(0, this.context.currentTime);
    this.emit("idle");
  }
  async play(
    notes: SoundNote[],
    bpm = 80,
    countIn = false,
    pulse = false,
  ): Promise<boolean> {
    this.stop();
    const generation = this.generation;
    this.emit("loading");
    try {
      const ctx = await this.ready();
      if (generation !== this.generation) return false;
      if (!this.piano) {
        const instrument = new Soundfont(ctx, {
          instrumentUrl: `${import.meta.env.BASE_URL}soundfonts/${soundFile("piano", "grand")}`,
          destination: this.master!,
        });
        const pending = instrument.load.then(() => instrument);
        this.piano = pending;
        void pending.catch(() => {
          if (this.piano === pending) this.piano = null;
        });
      }
      const piano = await this.piano;
      if (generation !== this.generation) return false;
      const beat = 60 / Math.max(40, Math.min(160, bpm)),
        start = ctx.currentTime + 0.07;
      const length = Math.max(1, ...notes.map((n) => n.beat + n.duration));
      const events = notes.map((n) => ({
        ...n,
        beat: n.beat + (countIn ? 4 : 0),
      }));
      if (countIn)
        for (let i = 0; i < 4; i++)
          events.push({ midi: 88, beat: i, duration: 0.06, click: true });
      if (pulse)
        for (let i = 0; i < Math.ceil(length); i++)
          events.push({
            midi: 88,
            beat: i + (countIn ? 4 : 0),
            duration: 0.06,
            click: true,
          });
      this.master!.gain.setValueAtTime(0.8, ctx.currentTime);
      for (const note of events) {
        if (note.rest) continue;
        const time = start + note.beat * beat;
        if (!note.click) {
          const stop = piano.start({
            note: note.midi,
            time,
            duration: Math.max(0.09, note.duration * beat),
            velocity: 76,
          });
          if (typeof stop === "function") this.stops.push(stop);
        } else {
          const oscillator = ctx.createOscillator(),
            gain = ctx.createGain();
          oscillator.frequency.value = 1100;
          gain.gain.setValueAtTime(0.035, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
          oscillator.connect(gain).connect(this.master!);
          oscillator.onended = () => {
            oscillator.disconnect();
            gain.disconnect();
          };
          oscillator.start(time);
          oscillator.stop(time + 0.06);
          this.stops.push(() => oscillator.stop());
        }
      }
      this.emit("playing");
      this.timer = setTimeout(
        () => {
          if (generation === this.generation) {
            this.stops = [];
            this.emit("idle");
          }
        },
        ((countIn ? 4 : 0) + length) * beat * 1000 + 700,
      );
      return true;
    } catch (error) {
      if (generation !== this.generation) return false;
      this.stop();
      throw new Error(
        "Не удалось загрузить пианино. Проверьте файлы soundfonts и повторите воспроизведение.",
        { cause: error },
      );
    }
  }
  dispose() {
    this.stop();
    if (this.context) void this.context.close();
    this.context = null;
    this.master = null;
    this.piano = null;
  }
}
