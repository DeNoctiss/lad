import { expression, OPEN, pitchName, mod, type LickNote } from "./model";
export type BackingNote = { midi: number; beat: number; duration: number };
export function parseSoundBank(text: string): Record<string, string> {
  const assignment = text.search(/MIDI\.Soundfont\.[a-z_0-9]+\s*=/i);
  if (assignment < 0) throw Error("Неверный формат звукового банка");
  return JSON.parse(
    text
      .slice(text.indexOf("{", assignment), text.lastIndexOf("}") + 1)
      .replace(/,\s*}/g, "}"),
  );
}
/** One audio clock for samples, backing and animated pitch envelopes. */
export class GuitarAudio {
  context: AudioContext | null = null;
  startTime = 0;
  private sources: AudioBufferSourceNode[] = [];
  private generation = 0;
  private buffers = new Map<string, Promise<AudioBuffer>>();
  private banks = new Map<string, Promise<Record<string, string>>>();
  async prepare() {
    this.context ??= new AudioContext();
    await this.context.resume();
  }
  private bank(file: string) {
    let p = this.banks.get(file);
    if (!p) {
      p = fetch(`${import.meta.env.BASE_URL}soundfonts/${file}`).then(
        async (r) => {
          if (!r.ok) throw Error("Не удалось загрузить инструмент");
          return parseSoundBank(await r.text());
        },
      );
      this.banks.set(file, p);
      void p.catch(() => this.banks.delete(file));
    }
    return p;
  }
  private buffer(midi: number, file: string) {
    const key = `${file}/${midi}`;
    let p = this.buffers.get(key);
    if (!p) {
      const ctx = this.context!;
      p = this.bank(file).then(async (bank) => {
        const name =
            ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"][
              mod(midi)
            ] +
            (Math.floor(midi / 12) - 1),
          data = bank[name];
        if (!data) throw Error(`Нет сэмпла ${pitchName(midi)}`);
        return ctx.decodeAudioData(
          Uint8Array.from(atob(data.split(",")[1]), (c) => c.charCodeAt(0))
            .buffer,
        );
      });
      this.buffers.set(key, p);
      void p.catch(() => this.buffers.delete(key));
    }
    return p;
  }
  stop() {
    this.generation++;
    for (const s of this.sources) {
      try {
        s.stop();
      } catch {
        /* ended */
      }
    }
    this.sources = [];
  }
  async play(
    notes: LickNote[],
    bpm: number,
    offset = 0,
    backing: BackingNote[] = [],
  ) {
    this.stop();
    const gen = this.generation;
    await this.prepare();
    if (gen !== this.generation) return false;
    const [guitar, piano] = await Promise.all([
      Promise.all(
        notes.map((n) =>
          this.buffer(
            OPEN[n.string] + n.fret,
            "mk/electric_guitar_clean-mp3.js",
          ),
        ),
      ),
      Promise.all(
        backing.map((n) => this.buffer(n.midi, "acoustic_grand_piano-mp3.js")),
      ),
    ]);
    if (gen !== this.generation) return false;
    const ctx = this.context!,
      beat = 60 / bpm;
    this.startTime = ctx.currentTime + 0.08 - offset * beat;
    const schedule = (
      buffer: AudioBuffer,
      at: number,
      length: number,
      volume: number,
      n?: LickNote,
    ) => {
      if (at + length <= offset) return;
      const skip = Math.max(0, offset - at),
        duration = (length - skip) * beat,
        time = this.startTime + (at + skip) * beat;
      if (duration < 0.003) return;
      let sampleOffset = skip * beat;
      if (n) {
        sampleOffset = 0;
        const steps = Math.max(2, Math.ceil(skip * beat * 120));
        for (let i = 0; i < steps; i++) {
          const elapsed = (skip * beat * (i + 0.5)) / steps;
          sampleOffset +=
            (Math.pow(
              2,
              expression(n, elapsed / (length * beat), elapsed) / 12,
            ) *
              skip *
              beat) /
            steps;
        }
      }
      if (sampleOffset >= buffer.duration) return;
      const source = ctx.createBufferSource(),
        gain = ctx.createGain();
      source.buffer = buffer;
      source.connect(gain).connect(ctx.destination);
      if (n) {
        const curve = new Float32Array(Math.max(2, Math.ceil(duration * 120)));
        for (let i = 0; i < curve.length; i++) {
          const elapsed = skip * beat + (duration * i) / (curve.length - 1);
          curve[i] = 100 * expression(n, elapsed / (length * beat), elapsed);
        }
        source.detune.setValueCurveAtTime(curve, time, duration);
      }
      const attack = Math.min(0.008, duration / 4),
        release = Math.min(0.04, duration / 4);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(volume, time + attack);
      gain.gain.setValueAtTime(volume, time + duration - release);
      gain.gain.linearRampToValueAtTime(0, time + duration);
      source.start(time, sampleOffset);
      source.stop(time + duration + 0.02);
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
      };
      this.sources.push(source);
    };
    let at = 0;
    notes.forEach((n, i) => {
      schedule(guitar[i], at, n.beats, 0.5, n);
      at += n.beats;
    });
    backing.forEach((n, i) => schedule(piano[i], n.beat, n.duration, 0.15));
    return true;
  }
  dispose() {
    this.stop();
    void this.context?.close();
    this.context = null;
  }
}
