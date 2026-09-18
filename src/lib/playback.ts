import type { NoteEffect, TabKind, TabNote, TabScore } from "./tabTypes";
import { durationTicks, measureTicks } from "./tablature";
import { pianoMidi } from "./piano";
import { Soundfont } from "smplr";

/**
 * Playback engine for structured tab scores.
 * Uses Web Audio API to synthesize instrument sounds — no audio files needed.
 */

export type EventMark = {
  tick: number;
  measure: number;
  event: number;
};

export type PlayedNote = {
  /** MIDI pitch, null for drums/muted. */
  midi: number | null;
  /** Drum lane id (HH/SD/BD/HT/MT/LT/CC/SP/RD) or null. */
  drum: string | null;
  /** Absolute start in ticks. */
  startTick: number;
  /** Absolute end in ticks (extended by ties and slides). */
  endTick: number;
  effects: NoteEffect[];
  /** Percussive muted string (fret "x" on guitar/bass). */
  muted: boolean;
  /** Slide waypoints: at tick, glide to midi. */
  waypoints: { tick: number; midi: number }[];
  /** Bend depth in semitones (0 = none). */
  bend: number;
  /** Legato (target of hammer-on/pull-off) — softer attack. */
  legato: boolean;
  velocity: number;
};

export type Timeline = {
  notes: PlayedNote[];
  marks: EventMark[];
  totalTicks: number;
  secPerTick: number;
  totalSeconds: number;
};

/* ------------------------------------------------------------------ */
/*  Tuning → MIDI per lane                                             */
/* ------------------------------------------------------------------ */

const GUITAR_STANDARD: Record<string, number> = {
  "1": 64, // e4
  "2": 59, // B3
  "3": 55, // G3
  "4": 50, // D3
  "5": 45, // A2
  "6": 40, // E2
};
const BASS_STANDARD: Record<string, number> = {
  "1": 43, // G2
  "2": 38, // D2
  "3": 33, // A1
  "4": 28, // E1
};

const PITCH_CLASS: Record<string, number> = {
  c: 0,
  d: 2,
  e: 4,
  f: 5,
  g: 7,
  a: 9,
  b: 11,
  h: 11,
};

/**
 * Parse a tuning string like "E A D G B e" (low→high) into
 * MIDI numbers per lane id ("1" is the highest string).
 * Falls back to standard tuning per instrument.
 */
export function laneTunings(
  kind: TabKind,
  tuningText: string,
): Map<string, number> {
  const map = new Map<string, number>();
  if (kind === "piano" || kind === "drums") return map;
  const standard = kind === "bass" ? BASS_STANDARD : GUITAR_STANDARD;
  const lanes = Object.keys(standard);
  const tokens = tuningText
    .split(/[\s·,]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  for (const lane of lanes) {
    const laneNum = Number(lane);
    // Lane "1" is highest string → last token; lane N (lowest) → first token.
    const tokenIndex = lanes.length - laneNum;
    const token = tokens[tokenIndex];
    map.set(
      lane,
      standard[lane] + (token ? tuningShift(token, standard[lane]) : 0),
    );
  }
  return map;
}

/**
 * Display labels for string lanes parsed from a tuning string like
 * "E A D G B e" (low→high). Lane "1" (highest string) gets the last token.
 * Falls back to the standard label when the tuning text doesn't provide
 * a usable token for that lane.
 */
export function laneLabels(
  kind: TabKind,
  tuningText: string,
  fallback: Map<string, string>,
): Map<string, string> {
  const labels = new Map(fallback);
  if (kind === "piano" || kind === "drums") return labels;
  const lanes = Object.keys(kind === "bass" ? BASS_STANDARD : GUITAR_STANDARD);
  const tokens = tuningText
    .split(/[\s·,]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  for (const lane of lanes) {
    const token = tokens[lanes.length - Number(lane)];
    if (token && /^[A-Ha-h](#|♯|b|♭)?\d*$/.test(token)) labels.set(lane, token);
  }
  return labels;
}
function tuningShift(token: string, standardMidi: number): number {
  const match = /^([A-Ha-h])(#|♯|b|♭)?(\d+)?$/.exec(token);
  if (!match) return 0;
  const pc =
    (PITCH_CLASS[match[1].toLowerCase()] ?? -1) +
    (match[2] === "#" || match[2] === "♯" ? 1 : 0) -
    (match[2] === "b" || match[2] === "♭" ? 1 : 0);
  if (pc < 0) return 0;
  if (match[3] !== undefined) {
    const midi = (Number(match[3]) + 1) * 12 + (((pc % 12) + 12) % 12);
    return midi - standardMidi;
  }
  // No octave: shift within ±6 semitones of the standard pitch class.
  const standardPc = standardMidi % 12;
  let shift = (((pc % 12) + 12) % 12) - standardPc;
  if (shift > 6) shift -= 12;
  if (shift < -6) shift += 12;
  return shift;
}

/* ------------------------------------------------------------------ */
/*  Timeline                                                           */
/* ------------------------------------------------------------------ */

function eventKey(m: number, e: number, lane: string) {
  return `${m}:${e}:${lane}`;
}

function linkValid(source: TabNote, target: TabNote | undefined): boolean {
  if (!target || !source.link || source.fret === "x" || target.fret === "x")
    return false;
  if (source.link === "tie") return source.fret === target.fret;
  if (source.link === "h" || source.link === "/")
    return target.fret > source.fret;
  return target.fret < source.fret;
}

/**
 * Flatten a score into scheduled notes with absolute tick positions.
 * Ties and slides merge into the source note (target does not re-attack);
 * hammer-on/pull-off targets keep a softer legato attack.
 */
export function buildTimeline(
  score: TabScore,
  tuning: Map<string, number>,
  bpm: number,
): Timeline {
  const laneMidi = (lane: string): number | null => {
    if (score.kind === "piano") return pianoMidi(lane);
    if (score.kind === "drums") return null;
    return tuning.get(lane) ?? null;
  };

  const consumed = new Set<string>();
  const legatoTargets = new Set<string>();
  const notes: PlayedNote[] = [];
  const marks: EventMark[] = [];
  const capacity = measureTicks(score.meter);

  const nextEventNote = (m: number, e: number) => {
    const measure = score.measures[m];
    const next = measure.events[e + 1];
    if (next) return { event: next, m, e: e + 1 };
    const used = measure.events.reduce((s, ev) => s + durationTicks(ev), 0);
    if (used !== capacity) return undefined;
    const following = score.measures[m + 1]?.events[0];
    return following ? { event: following, m: m + 1, e: 0 } : undefined;
  };

  const onsetOf = (m: number, e: number): number =>
    m * capacity +
    score.measures[m].events
      .slice(0, e)
      .reduce((s, ev) => s + durationTicks(ev), 0);

  score.measures.forEach((measure, m) => {
    const measureStart = m * capacity;
    let elapsed = measureStart;
    measure.events.forEach((event, e) => {
      marks.push({ tick: elapsed, measure: m, event: e });
      const dur = durationTicks(event);
      for (const note of event.notes) {
        const key = eventKey(m, e, note.lane);
        if (consumed.has(key)) continue;
        const midi = laneMidi(note.lane);
        const drum = score.kind === "drums" ? note.lane : null;
        const muted = note.fret === "x";
        const played: PlayedNote = {
          midi: midi === null ? null : midi + (muted ? 0 : Number(note.fret)),
          drum,
          startTick: elapsed,
          endTick: elapsed + dur,
          effects: [...note.effects],
          muted,
          waypoints: [],
          bend: note.effects.includes("b1")
            ? 2
            : note.effects.includes("b0.5")
              ? 1
              : 0,
          legato: legatoTargets.has(key),
          velocity: note.effects.includes("ghost")
            ? 0.35
            : note.effects.includes("accent")
              ? 1.35
              : 1,
        };
        // Follow tie/slide chains.
        let cursor: TabNote | undefined = note;
        let cursorPos = { m, e };
        while (
          cursor?.link === "tie" ||
          cursor?.link === "/" ||
          cursor?.link === "\\"
        ) {
          const found = nextEventNote(cursorPos.m, cursorPos.e);
          const target = found?.event.notes.find(
            (candidate) => candidate.lane === note.lane,
          );
          if (!found || !linkValid(cursor, target) || !target) break;
          const targetKey = eventKey(found.m, found.e, note.lane);
          consumed.add(targetKey);
          played.endTick =
            onsetOf(found.m, found.e) + durationTicks(found.event);
          if (cursor.link !== "tie" && midi !== null && target.fret !== "x") {
            played.waypoints.push({
              tick: onsetOf(found.m, found.e),
              midi: midi + Number(target.fret),
            });
          }
          cursor = target;
          cursorPos = { m: found.m, e: found.e };
        }
        // Mark hammer/pull targets for legato attack.
        if (cursor === note && (note.link === "h" || note.link === "p")) {
          const found = nextEventNote(m, e);
          const target = found?.event.notes.find(
            (candidate) => candidate.lane === note.lane,
          );
          if (found && linkValid(note, target))
            legatoTargets.add(eventKey(found.m, found.e, note.lane));
        }
        notes.push(played);
      }
      elapsed += dur;
    });
  });

  const secPerTick = 60 / bpm / 480;
  const totalTicks = score.measures.length * capacity;
  return {
    notes,
    marks,
    totalTicks,
    secPerTick,
    totalSeconds: totalTicks * secPerTick,
  };
}

/* ------------------------------------------------------------------ */
/*  Synthesis                                                          */
/* ------------------------------------------------------------------ */

const midiFreq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 1.2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

type VoiceOpts = {
  velocity: number;
  muted: boolean;
  pm: boolean;
  vibrato: boolean;
  bend: number;
  legato: boolean;
  waypoints: { at: number; midi: number }[]; // absolute seconds
};

function pitchedVoice(
  ctx: AudioContext,
  dest: AudioNode,
  midi: number,
  at: number,
  dur: number,
  kind: "guitar" | "bass" | "piano",
  opts: VoiceOpts,
) {
  const out = ctx.createGain();
  out.connect(dest);
  const freq = midiFreq(midi);
  const end = at + Math.max(dur, 0.08);
  const stopAt = end + 1.6;

  if (opts.muted) {
    // Percussive muted-string click.
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer(ctx);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2800;
    bp.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.22 * opts.velocity, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
    noise.connect(bp).connect(g).connect(out);
    noise.start(at);
    noise.stop(at + 0.1);
    return;
  }

  const oscA = ctx.createOscillator();
  const oscB = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 0.7;
  const env = ctx.createGain();

  let peak = 0.55 * opts.velocity;
  let release = 0.14;
  let sustainLevel = 0.9;

  if (kind === "guitar") {
    oscA.type = "sawtooth";
    oscB.type = "triangle";
    oscB.detune.value = 5;
    filter.frequency.value = opts.pm ? 750 : 2600;
    if (opts.pm) {
      sustainLevel = 0;
      release = 0.05;
    }
  } else if (kind === "bass") {
    oscA.type = "triangle";
    oscB.type = "sine";
    oscB.frequency.value = freq / 2;
    oscB.detune.value = 0;
    filter.frequency.value = opts.pm ? 380 : 850;
    peak = 0.72 * opts.velocity;
    release = 0.1;
    if (opts.pm) sustainLevel = 0;
  } else {
    // Piano: sine stack with harmonics, natural ring.
    oscA.type = "sine";
    oscB.type = "sine";
    filter.frequency.value = 5200;
    peak = 0.6 * opts.velocity;
    sustainLevel = 0.55;
    release = 0.5;
  }
  oscA.frequency.value = freq;
  if (kind !== "bass") oscB.frequency.value = freq;

  // Slide glides.
  if (opts.waypoints.length) {
    oscA.frequency.setValueAtTime(freq, at);
    for (const point of opts.waypoints) {
      oscA.frequency.linearRampToValueAtTime(
        midiFreq(point.midi),
        Math.max(at + 0.01, point.at - 0.06),
      );
      oscB.frequency.linearRampToValueAtTime(
        kind === "bass" ? midiFreq(point.midi) / 2 : midiFreq(point.midi),
        Math.max(at + 0.01, point.at - 0.06),
      );
    }
  }

  // Bend: rise quickly, hold, return at the end.
  if (opts.bend > 0) {
    const bent = freq * Math.pow(2, opts.bend / 12);
    oscA.frequency.setValueAtTime(freq, at);
    oscA.frequency.linearRampToValueAtTime(
      bent,
      at + Math.min(0.12, dur * 0.3),
    );
    oscA.frequency.setValueAtTime(bent, at + Math.max(dur * 0.7, 0.12));
    oscA.frequency.linearRampToValueAtTime(freq, at + dur * 0.95);
  }

  // Vibrato LFO on detune.
  let lfo: OscillatorNode | null = null;
  if (opts.vibrato) {
    lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 5.4;
    lfoGain.gain.setValueAtTime(0, at);
    lfoGain.gain.linearRampToValueAtTime(32, at + Math.min(0.3, dur * 0.4));
    lfo.connect(lfoGain);
    lfoGain.connect(oscA.detune);
    lfoGain.connect(oscB.detune);
    lfo.start(at);
    lfo.stop(stopAt);
  }

  const attack = opts.legato ? 0.02 : 0.006;
  const legatoDrop = opts.legato ? 0.7 : 1;
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(peak * legatoDrop, at + attack);
  if (kind === "piano") {
    // Piano decays continuously.
    env.gain.setTargetAtTime(
      peak * sustainLevel * legatoDrop,
      at + attack,
      0.35,
    );
    env.gain.setTargetAtTime(0, end, release);
  } else if (sustainLevel > 0) {
    env.gain.setTargetAtTime(
      peak * sustainLevel * legatoDrop,
      at + attack,
      0.09,
    );
    env.gain.setTargetAtTime(0, end, release);
  } else {
    // Palm-muted: fast choke.
    env.gain.setTargetAtTime(0, at + attack, 0.05);
  }

  oscA.connect(filter);
  oscB.connect(filter);
  filter.connect(env).connect(out);
  oscA.start(at);
  oscB.start(at);
  oscA.stop(stopAt);
  oscB.stop(stopAt);
}

function drumVoice(
  ctx: AudioContext,
  dest: AudioNode,
  noise: AudioBuffer,
  lane: string,
  at: number,
  velocity: number,
  open: boolean,
) {
  const out = ctx.createGain();
  out.connect(dest);
  const v = velocity;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const hiss = ctx.createBufferSource();
  hiss.buffer = noise;
  const hf = ctx.createBiquadFilter();
  const hg = ctx.createGain();

  const burst = (
    filterType: BiquadFilterType,
    freq: number,
    q: number,
    peak: number,
    decay: number,
  ) => {
    hf.type = filterType;
    hf.frequency.value = freq;
    hf.Q.value = q;
    hg.gain.setValueAtTime(0.0001, at);
    hg.gain.exponentialRampToValueAtTime(Math.max(0.001, peak * v), at + 0.003);
    hg.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    hiss.connect(hf).connect(hg).connect(out);
    hiss.start(at);
    hiss.stop(at + decay + 0.05);
  };

  const tone = (
    from: number,
    to: number,
    peak: number,
    decay: number,
    type: OscillatorType = "sine",
  ) => {
    osc.type = type;
    osc.frequency.setValueAtTime(from, at);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(to, 1),
      at + decay * 0.6,
    );
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak * v), at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    osc.connect(g).connect(out);
    osc.start(at);
    osc.stop(at + decay + 0.05);
  };

  switch (lane) {
    case "BD":
      tone(140, 46, 0.9, 0.28);
      break;
    case "SD":
      tone(190, 170, 0.4, 0.14, "triangle");
      burst("bandpass", 1800, 0.9, 0.5, 0.16);
      break;
    case "HH":
      burst("highpass", 7600, 0.8, 0.34, open ? 0.45 : 0.06);
      break;
    case "HT":
      tone(175, 120, 0.55, 0.22);
      burst("highpass", 3800, 0.7, 0.12, 0.08);
      break;
    case "MT":
      tone(142, 96, 0.57, 0.25);
      burst("highpass", 3600, 0.7, 0.12, 0.08);
      break;
    case "LT":
      tone(115, 78, 0.6, 0.28);
      burst("highpass", 3400, 0.7, 0.12, 0.08);
      break;
    case "CC":
      burst("highpass", 5200, 0.6, 0.5, 0.9);
      break;
    case "SP":
      burst("highpass", 6800, 0.7, 0.38, 0.3);
      break;
    case "RD":
      burst("highpass", 5000, 0.8, 0.26, 0.7);
      tone(880, 820, 0.09, 0.5, "triangle");
      break;
  }
}

/* ------------------------------------------------------------------ */
/*  Player                                                             */
/* ------------------------------------------------------------------ */

export type PlayerState = "stopped" | "loading" | "playing" | "paused";

const SOUNDFONT_FILES: Record<string, string> = {
  guitar: "acoustic_guitar_steel-mp3.js",
  bass: "electric_bass_finger-mp3.js",
  piano: "acoustic_grand_piano-mp3.js",
};

const midiVelocity = (velocity: number) =>
  Math.max(10, Math.min(127, Math.round(85 * velocity)));

export type PlayerOptions = {
  bpm: number;
  tuningText: string;
  onEvent?: (measure: number | null, event: number | null) => void;
  onStateChange?: (state: PlayerState) => void;
};

export class TabPlayer {
  state: PlayerState = "stopped";
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private instruments = new Map<string, Promise<Soundfont>>();
  private stops: ((time?: number) => void)[] = [];
  private raf = 0;
  private endAt = 0;
  private marks: EventMark[] = [];
  private secPerTick = 0;
  private emit: PlayerOptions["onEvent"];
  private stateCb: PlayerOptions["onStateChange"];
  private lastMark = -2;
  private session = 0;

  private context(): AudioContext {
    if (!this.ctx || this.ctx.state === "closed") {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      const comp = this.ctx.createDynamicsCompressor();
      this.master.connect(comp).connect(this.ctx.destination);
      this.instruments.clear();
    }
    return this.ctx;
  }

  private instrument(kind: TabKind): Promise<Soundfont> | null {
    const file = SOUNDFONT_FILES[kind];
    const ctx = this.ctx;
    if (!file || !ctx || !this.master) return null;
    let pending = this.instruments.get(kind);
    if (!pending) {
      const soundfont = new Soundfont(ctx, {
        instrumentUrl: `${import.meta.env.BASE_URL}soundfonts/${file}`,
        destination: this.master,
      });
      pending = soundfont.load.then(() => soundfont);
      this.instruments.set(kind, pending);
    }
    return pending;
  }

  private scheduleSample(
    inst: Soundfont,
    midi: number,
    at: number,
    dur: number,
    velocity: number,
    pm: boolean,
    legato: boolean,
  ) {
    const stop = inst.start({
      note: midi,
      time: at,
      duration: pm ? Math.max(0.06, dur * 0.35) : dur,
      velocity: midiVelocity(velocity * (legato ? 0.7 : 1)),
      ...(pm ? { lpfCutoffHz: 700 } : {}),
    });
    if (typeof stop === "function") this.stops.push(stop);
  }

  /** Decompose a note into pitch segments (slides, bends) and schedule samples. */
  private schedulePitched(
    inst: Soundfont,
    note: PlayedNote,
    t0: number,
    secPerTick: number,
  ) {
    const pm = note.effects.includes("pm");
    const velocity = note.velocity;
    if (note.midi === null) return;

    // Slide chain: each waypoint starts a legato segment.
    const segments: { tick: number; midi: number; legato: boolean }[] = [
      { tick: note.startTick, midi: note.midi, legato: note.legato },
      ...note.waypoints.map((w) => ({
        tick: w.tick,
        midi: w.midi,
        legato: true,
      })),
    ];
    // Bend: approximate with base → bent → base pitch segments.
    if (note.bend > 0 && !note.waypoints.length) {
      const span = note.endTick - note.startTick;
      segments.length = 0;
      segments.push(
        { tick: note.startTick, midi: note.midi, legato: note.legato },
        {
          tick: note.startTick + span * 0.3,
          midi: note.midi + note.bend,
          legato: true,
        },
        {
          tick: note.startTick + span * 0.8,
          midi: note.midi,
          legato: true,
        },
      );
    }
    segments.forEach((seg, i) => {
      const end = i + 1 < segments.length ? segments[i + 1].tick : note.endTick;
      const at = t0 + seg.tick * secPerTick;
      const dur = Math.max(0.05, (end - seg.tick) * secPerTick);
      this.scheduleSample(inst, seg.midi, at, dur, velocity, pm, seg.legato);
    });
  }

  async play(score: TabScore, options: PlayerOptions) {
    this.stop();
    const session = ++this.session;
    const ctx = this.context();
    this.emit = options.onEvent;
    this.stateCb = options.onStateChange;
    const tuning = laneTunings(score.kind, options.tuningText);
    const timeline = buildTimeline(score, tuning, options.bpm);
    this.marks = timeline.marks;
    this.secPerTick = timeline.secPerTick;

    const pending = this.instrument(score.kind);
    let inst: Soundfont | null = null;
    if (pending) {
      this.setState("loading");
      try {
        inst = await pending;
      } catch {
        inst = null;
      }
      if (session !== this.session) return;
    }
    if (ctx.state === "suspended") await ctx.resume();
    if (session !== this.session) return;

    const master = this.master!;
    const noise = noiseBuffer(ctx);
    const t0 = ctx.currentTime + 0.08;
    this.stops = [];

    for (const note of timeline.notes) {
      const at = t0 + note.startTick * timeline.secPerTick;
      const dur = Math.max(
        0.05,
        (note.endTick - note.startTick) * timeline.secPerTick,
      );
      if (note.drum) {
        drumVoice(
          ctx,
          master,
          noise,
          note.drum,
          at,
          note.velocity,
          note.effects.includes("open"),
        );
        continue;
      }
      if (note.midi === null) continue;
      if (note.muted) {
        pitchedVoice(ctx, master, note.midi, at, dur, "guitar", {
          velocity: note.velocity,
          muted: true,
          pm: false,
          vibrato: false,
          bend: 0,
          legato: false,
          waypoints: [],
        });
        continue;
      }
      if (inst) {
        this.schedulePitched(inst, note, t0, timeline.secPerTick);
        continue;
      }
      // Fallback to synthesized voice when the soundfont failed to load.
      const kind =
        score.kind === "bass"
          ? "bass"
          : score.kind === "piano"
            ? "piano"
            : "guitar";
      pitchedVoice(ctx, master, note.midi, at, dur, kind, {
        velocity: note.velocity,
        muted: false,
        pm: note.effects.includes("pm"),
        vibrato: note.effects.includes("v"),
        bend: note.bend,
        legato: note.legato,
        waypoints: note.waypoints.map((w) => ({
          at: t0 + w.tick * timeline.secPerTick,
          midi: w.midi,
        })),
      });
    }

    this.endAt = t0 + timeline.totalSeconds + 1.4;
    this.lastMark = -2;
    this.setState("playing");

    const tick = () => {
      if (!this.ctx || this.state === "stopped") return;
      const currentTick = (ctx.currentTime - t0) / this.secPerTick;
      let mark = -1;
      for (let i = 0; i < this.marks.length; i++) {
        if (this.marks[i].tick <= currentTick + 0.001) mark = i;
        else break;
      }
      if (mark !== this.lastMark) {
        this.lastMark = mark;
        if (mark >= 0)
          this.emit?.(this.marks[mark].measure, this.marks[mark].event);
      }
      if (ctx.currentTime >= this.endAt) {
        this.finish();
        return;
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  pause() {
    if (this.state !== "playing" || !this.ctx) return;
    void this.ctx.suspend();
    this.setState("paused");
  }

  resume() {
    if (this.state !== "paused" || !this.ctx) return;
    void this.ctx.resume();
    this.setState("playing");
  }

  stop() {
    this.session++;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    for (const stop of this.stops) {
      try {
        stop();
      } catch {
        // voice already ended
      }
    }
    this.stops = [];
    if (this.ctx && this.ctx.state === "running") void this.ctx.suspend();
    this.lastMark = -2;
    this.emit?.(null, null);
    this.setState("stopped");
  }

  private finish() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.stops = [];
    if (this.ctx && this.ctx.state === "running") void this.ctx.suspend();
    this.emit?.(null, null);
    this.setState("stopped");
  }

  private setState(state: PlayerState) {
    this.state = state;
    this.stateCb?.(state);
  }
}
