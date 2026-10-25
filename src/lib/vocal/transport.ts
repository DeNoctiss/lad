import { Soundfont } from "smplr";
import { soundFile } from "../partSounds";
import { midiToFrequency } from "./pitch";
import type { VocalProject, VocalSettings } from "./model";
import { barLength } from "./model";
import { audioJob } from "./jobs";
export type TrackKind = "acapella" | "backing";
/** Web Audio owns the clock, React only displays it. No timers advance song time. */
export class VocalTransport {
  private piano: Soundfont | null = null;
  private pianoLoading: Promise<Soundfont> | null = null;
  private previewGeneration = 0;
  private ctx: AudioContext | null = null;
  private buses: Record<string, GainNode> = {};
  private nodes = new Set<AudioScheduledSourceNode>();
  private originals: Partial<Record<TrackKind, AudioBuffer>> = {};
  private ready: Partial<
    Record<TrackKind, { key: string; buffer: AudioBuffer }>
  > = {};
  private jobs: { cancel(): void }[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private project: VocalProject | null = null;
  private originTime = 0;
  private originBeat = 0;
  private cycleTime = 0;
  private cycleBeat = 0;
  private cycleEnd = 0;
  private noteIndex = 0;
  private nextClick = 0;
  private stoppedAt = 0;
  private generation = 0;
  playing = false;
  get context() {
    if (!this.ctx) {
      // Let the device choose its native rate; request interactive output.
      this.ctx = new AudioContext({ latencyHint: "interactive" });
      for (const name of ["reference", "acapella", "backing", "click"]) {
        const gain = this.ctx.createGain();
        gain.connect(this.ctx.destination);
        this.buses[name] = gain;
      }
      this.buses.click.gain.value = 0.18;
    }
    return this.ctx;
  }
  private loadPiano(): Promise<Soundfont> {
    if (this.pianoLoading) return this.pianoLoading;
    const context = this.context;
    const instrument = new Soundfont(context, {
      instrumentUrl: `${import.meta.env.BASE_URL}soundfonts/${soundFile("piano", "grand")}`,
      destination: this.buses.reference,
    });
    const pending = instrument.load
      .then(() => {
        if (this.ctx === context) this.piano = instrument;
        return instrument;
      })
      .catch((cause: unknown) => {
        if (this.pianoLoading === pending) this.pianoLoading = null;
        throw new Error(
          "Не удалось загрузить пианино. Проверьте файлы soundfonts и повторите воспроизведение.",
          { cause },
        );
      });
    this.pianoLoading = pending;
    return pending;
  }
  setAudio(kind: TrackKind, buffer?: AudioBuffer) {
    this.pause();
    if (buffer) this.originals[kind] = buffer;
    else delete this.originals[kind];
    delete this.ready[kind];
  }
  hasAudio(kind: TrackKind) {
    return !!this.originals[kind];
  }
  volume(s: VocalSettings) {
    if (!this.ctx) return;
    for (const name of ["reference", "acapella", "backing"] as const)
      this.buses[name].gain.setTargetAtTime(
        s[`${name}Volume`],
        this.ctx.currentTime,
        0.02,
      );
  }
  async prepare(project: VocalProject) {
    const generation = ++this.generation,
      context = this.context;
    await context.resume();
    await this.loadPiano();
    if (generation !== this.generation)
      throw new DOMException("Отменено", "AbortError");
    for (const kind of ["acapella", "backing"] as const) {
      const original = this.originals[kind],
        meta = project.audio?.[kind];
      if (!original || !meta) continue;
      const tempo = (project.bpm * project.settings.speed) / meta.originalBpm;
      if (tempo < 0.25 || tempo > 4 || original.duration / tempo > 720)
        throw new Error(
          "Для аудиофайла выберите скорость от 0,25× до 4× исходной и итоговую длительность до 12 минут. Можно использовать более короткий фрагмент.",
        );
      const key = tempo + ":" + project.settings.transpose;
      if (this.ready[kind]?.key === key) continue;
      if (tempo === 1 && project.settings.transpose === 0)
        this.ready[kind] = { key, buffer: original };
      else {
        const channels = Array.from(
          { length: Math.min(2, original.numberOfChannels) },
          (_, i) => original.getChannelData(i).slice(),
        );
        const job = audioJob<Float32Array[]>(
          {
            task: "transform",
            channels,
            sampleRate: original.sampleRate,
            tempo,
            transpose: project.settings.transpose,
          },
          channels.map((c) => c.buffer),
        );
        this.jobs.push(job);
        const result = await job.promise;
        if (generation !== this.generation)
          throw new DOMException("Отменено", "AbortError");
        const buffer = context.createBuffer(
          result.length,
          result[0].length,
          original.sampleRate,
        );
        result.forEach((c, i) => buffer.copyToChannel(new Float32Array(c), i));
        this.ready[kind] = { key, buffer };
      }
    }
    this.jobs = [];
    if (generation !== this.generation)
      throw new DOMException("Отменено", "AbortError");
  }
  start(project: VocalProject, beat: number, countIn: boolean) {
    this.stopNodes();
    this.project = project;
    this.volume(project.settings);
    const spb = 60 / (project.bpm * project.settings.speed),
      count = countIn ? barLength(project) : 0;
    const from = project.settings.loop
      ? Math.max(
          project.settings.loopStart,
          Math.min(project.settings.loopEnd - 0.01, beat),
        )
      : Math.min(beat, project.length - 0.01);
    this.originTime = this.context.currentTime + 0.08 + count * spb;
    this.originBeat = from;
    this.cycleTime = this.originTime;
    this.cycleBeat = from;
    this.cycleEnd = project.settings.loop
      ? project.settings.loopEnd
      : project.length;
    this.noteIndex = 0;
    this.nextClick =
      Math.ceil(from / (4 / project.meter.unit)) * (4 / project.meter.unit);
    this.playing = true;
    for (let i = 0; i < count; i += 4 / project.meter.unit)
      this.tone(
        i === 0 ? 88 : 81,
        this.originTime - (count - i) * spb,
        0.04,
        "click",
        0.7,
      );
    this.scheduleAudio();
    this.schedule();
    this.timer = setInterval(() => this.schedule(), 25);
  }
  private tone(
    midi: number,
    time: number,
    duration: number,
    bus: string,
    amplitude = 0.16,
  ) {
    if (bus === "reference") {
      this.piano?.start({ note: midi, time, duration, velocity: 76 });
      return;
    }
    const ctx = this.context,
      osc = ctx.createOscillator(),
      envelope = ctx.createGain();
    osc.type = bus === "click" ? "sine" : "triangle";
    osc.frequency.value = midiToFrequency(midi);
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(amplitude, time + 0.008);
    envelope.gain.setValueAtTime(
      amplitude,
      time + Math.max(0.009, duration - 0.025),
    );
    envelope.gain.linearRampToValueAtTime(0, time + Math.max(0.035, duration));
    osc.connect(envelope);
    envelope.connect(this.buses[bus]);
    osc.start(time);
    osc.stop(time + Math.max(0.04, duration) + 0.01);
    this.nodes.add(osc);
    osc.onended = () => {
      this.nodes.delete(osc);
      osc.disconnect();
      envelope.disconnect();
    };
  }
  async preview(midi: number) {
    const generation = this.generation;
    const previewGeneration = ++this.previewGeneration;
    const context = this.context;
    await context.resume();
    await this.loadPiano();
    if (
      generation !== this.generation ||
      previewGeneration !== this.previewGeneration ||
      this.ctx !== context
    )
      return;
    if (!this.playing) this.buses.reference.gain.value = 0.6;
    this.tone(midi, context.currentTime + 0.01, 0.35, "reference");
  }
  private scheduleAudio() {
    const p = this.project!,
      spb = 60 / (p.bpm * p.settings.speed);
    for (const kind of ["acapella", "backing"] as const) {
      const ready = this.ready[kind],
        meta = p.audio?.[kind];
      if (!ready || !meta) continue;
      const beat = Math.max(this.cycleBeat, meta.offset),
        offset = (beat - meta.offset) * spb;
      if (beat >= this.cycleEnd || offset >= ready.buffer.duration) continue;
      const src = this.context.createBufferSource();
      src.buffer = ready.buffer;
      src.connect(this.buses[kind]);
      src.start(
        this.cycleTime + (beat - this.cycleBeat) * spb,
        offset,
        Math.min((this.cycleEnd - beat) * spb, ready.buffer.duration - offset),
      );
      this.nodes.add(src);
      src.onended = () => {
        this.nodes.delete(src);
        src.disconnect();
      };
    }
  }
  private schedule() {
    if (!this.playing || !this.project) return;
    const p = this.project,
      spb = 60 / (p.bpm * p.settings.speed),
      horizon = this.context.currentTime + 0.16;
    // Schedule two cycles at most per tick (shortest supported loop is 0.25 beats).
    for (let cycle = 0; cycle < 4; cycle++) {
      while (this.noteIndex < p.notes.length) {
        const n = p.notes[this.noteIndex],
          start = Math.max(n.start, this.cycleBeat),
          end = Math.min(n.start + n.duration, this.cycleEnd);
        const time = this.cycleTime + (start - this.cycleBeat) * spb;
        if (start < this.cycleEnd && end > start && time > horizon) break;
        this.noteIndex++;
        if (start >= this.cycleEnd || end <= start) continue;
        this.tone(
          n.midi + p.settings.transpose,
          time,
          (end - start) * spb,
          "reference",
        );
      }
      while (
        this.nextClick < this.cycleEnd &&
        this.cycleTime + (this.nextClick - this.cycleBeat) * spb <= horizon
      ) {
        if (p.settings.metronome)
          this.tone(
            this.nextClick % barLength(p) < 0.001 ? 88 : 81,
            this.cycleTime + (this.nextClick - this.cycleBeat) * spb,
            0.04,
            "click",
            0.7,
          );
        this.nextClick += 4 / p.meter.unit;
      }
      const endTime = this.cycleTime + (this.cycleEnd - this.cycleBeat) * spb;
      if (horizon < endTime || !p.settings.loop) break;
      this.cycleTime = endTime;
      this.cycleBeat = p.settings.loopStart;
      this.noteIndex = 0;
      this.nextClick =
        Math.ceil(this.cycleBeat / (4 / p.meter.unit)) * (4 / p.meter.unit);
      this.scheduleAudio();
    }
    if (
      !p.settings.loop &&
      this.context.currentTime >=
        this.originTime + (p.length - this.originBeat) * spb
    ) {
      this.stoppedAt = p.length;
      this.playing = false;
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
    }
  }
  get position() {
    if (!this.playing || !this.project || !this.ctx) return this.stoppedAt;
    const p = this.project,
      elapsed =
        ((this.ctx.currentTime - this.originTime) * p.bpm * p.settings.speed) /
        60;
    if (elapsed < 0) return this.originBeat + elapsed;
    const first =
      (p.settings.loop ? p.settings.loopEnd : p.length) - this.originBeat;
    if (p.settings.loop && elapsed >= first)
      return (
        p.settings.loopStart +
        ((elapsed - first) % (p.settings.loopEnd - p.settings.loopStart))
      );
    return Math.min(p.length, this.originBeat + elapsed);
  }
  get countingIn() {
    return this.playing && !!this.ctx && this.ctx.currentTime < this.originTime;
  }
  private stopNodes() {
    this.previewGeneration++;
    this.piano?.stop();
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    for (const n of this.nodes) {
      try {
        n.stop();
      } catch {
        /* already ended */
      }
      n.disconnect();
    }
    this.nodes.clear();
  }
  pause() {
    this.stoppedAt = Math.max(0, this.position);
    this.playing = false;
    this.stopNodes();
    this.generation++;
    this.jobs.forEach((j) => j.cancel());
    this.jobs = [];
    return this.stoppedAt;
  }
  seek(beat: number) {
    this.pause();
    this.stoppedAt = beat;
  }
  dispose() {
    this.pause();
    if (this.ctx) void this.ctx.close();
    this.ctx = null;
    this.piano = null;
    this.pianoLoading = null;
    this.originals = {};
    this.ready = {};
  }
}
