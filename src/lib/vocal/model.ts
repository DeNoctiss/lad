/** Quarter-note beats are the single clock for notes, loops and audio offsets. */
export type VocalNote = {
  id: string;
  midi: number;
  start: number;
  duration: number;
};
export type PitchPoint = {
  beat: number;
  midi: number | null;
  confidence: number;
};
export type AudioTrackMeta = {
  name: string;
  duration: number;
  originalBpm: number;
  offset: number;
};
export type VocalSettings = {
  speed: number;
  transpose: number;
  referenceVolume: number;
  acapellaVolume: number;
  backingVolume: number;
  monitorVolume: number;
  metronome: boolean;
  countIn: boolean;
  tolerance: number;
  latencyMs: number;
  analysisMode?: "fast" | "stable";
  loop: boolean;
  loopStart: number;
  loopEnd: number;
};
export type VocalProject = {
  version: 1;
  bpm: number;
  meter: { beats: number; unit: 4 | 8 };
  length: number;
  notes: VocalNote[];
  source: string;
  settings: VocalSettings;
  audio?: { acapella?: AudioTrackMeta; backing?: AudioTrackMeta };
};
export const MAX_BEATS = 4096;
export const MAX_NOTES = 10000;
export const MIN_MIDI = 21;
export const MAX_MIDI = 108;
export const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
export const noteId = () => {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
};
export const barLength = (p: VocalProject) =>
  (p.meter.beats * 4) / p.meter.unit;
export const noteName = (midi: number) => {
  const n = Math.round(midi);
  return (
    ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"][
      ((n % 12) + 12) % 12
    ] +
    (Math.floor(n / 12) - 1)
  );
};
export function createVocalProject(bpm = 90): VocalProject {
  return {
    version: 1,
    bpm: clamp(bpm, 20, 300),
    meter: { beats: 4, unit: 4 },
    length: 32,
    notes: [],
    source: "Создано вручную",
    settings: {
      speed: 1,
      transpose: 0,
      referenceVolume: 0.65,
      acapellaVolume: 0.5,
      backingVolume: 0.55,
      monitorVolume: 0,
      metronome: false,
      countIn: true,
      tolerance: 50,
      latencyMs: 100,
      analysisMode: "fast",
      loop: false,
      loopStart: 0,
      loopEnd: 16,
    },
  };
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const number = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
export function validateVocalProject(raw: unknown): VocalProject {
  const fail = (message: string): never => {
    throw new Error("Вокальная партия: " + message);
  };
  if (
    !object(raw) ||
    raw.version !== 1 ||
    !number(raw.bpm, 20, 300) ||
    !number(raw.length, 0.25, MAX_BEATS) ||
    typeof raw.source !== "string" ||
    raw.source.length > 500
  )
    return fail("неверный формат проекта");
  if (
    !object(raw.meter) ||
    !Number.isInteger(raw.meter.beats) ||
    !number(raw.meter.beats, 1, 12) ||
    ![4, 8].includes(raw.meter.unit as number)
  )
    return fail("неверный размер такта");
  if (!Array.isArray(raw.notes) || raw.notes.length > MAX_NOTES)
    return fail("слишком много нот");
  const ids = new Set<string>();
  for (const n of raw.notes) {
    if (
      !object(n) ||
      typeof n.id !== "string" ||
      !n.id ||
      n.id.length > 120 ||
      ids.has(n.id) ||
      !Number.isInteger(n.midi) ||
      !number(n.midi, MIN_MIDI, MAX_MIDI) ||
      !number(n.start, 0, raw.length) ||
      !number(n.duration, 1 / 64, raw.length) ||
      n.start + n.duration > raw.length + 0.00001
    )
      return fail("неверные ноты или повторяющиеся идентификаторы");
    ids.add(n.id);
  }
  if (overlaps(raw.notes as VocalNote[]))
    return fail(
      "пересекающиеся ноты: вокальная линия должна быть одноголосной",
    );
  const s = raw.settings;
  if (!object(s)) return fail("нет настроек");
  if (
    s.analysisMode !== undefined &&
    !["fast", "stable"].includes(s.analysisMode as string)
  )
    return fail("неверный режим микрофона");
  const ranges: Record<string, [number, number]> = {
    speed: [0.5, 1.5],
    transpose: [-12, 12],
    referenceVolume: [0, 1],
    acapellaVolume: [0, 1],
    backingVolume: [0, 1],
    monitorVolume: [0, 1],
    tolerance: [10, 100],
    latencyMs: [0, 500],
    loopStart: [0, raw.length],
    loopEnd: [0, raw.length],
  };
  for (const [key, [min, max]] of Object.entries(ranges))
    if (!number(s[key], min, max))
      return fail("неверная настройка «" + key + "»");
  if (
    !Number.isInteger(s.transpose) ||
    ["loop", "metronome", "countIn"].some((k) => typeof s[k] !== "boolean") ||
    (s.loopEnd as number) - (s.loopStart as number) < 0.25
  )
    return fail("неверная петля или параметры");
  if (raw.audio !== undefined) {
    if (!object(raw.audio)) return fail("неверные аудиодорожки");
    for (const key of ["acapella", "backing"]) {
      const a = raw.audio[key];
      if (
        a !== undefined &&
        (!object(a) ||
          typeof a.name !== "string" ||
          a.name.length > 255 ||
          !number(a.duration, 0, 360) ||
          !number(a.originalBpm, 20, 300) ||
          !number(a.offset, -MAX_BEATS, MAX_BEATS))
      )
        return fail("неверные сведения об аудио");
    }
  }
  return structuredClone(raw) as unknown as VocalProject;
}
/** Highest/lowest sounding voice, split at ALL boundaries, not just note onsets. */
export function monophonic(
  notes: VocalNote[],
  voice: "high" | "low",
): VocalNote[] {
  const edges = [
    ...new Set(notes.flatMap((n) => [n.start, n.start + n.duration])),
  ].sort((a, b) => a - b);
  const out: VocalNote[] = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const start = edges[i],
      end = edges[i + 1];
    const active = notes.filter(
      (n) => n.start <= start + 1e-7 && n.start + n.duration >= end - 1e-7,
    );
    if (!active.length || end - start < 1 / 64) continue;
    const midi = (voice === "high" ? Math.max : Math.min)(
      ...active.map((n) => n.midi),
    );
    const last = out.at(-1);
    // Keep repeated attacks, merge only fragments of a held note.
    if (
      last &&
      last.midi === midi &&
      Math.abs(last.start + last.duration - start) < 1e-7 &&
      !active.some((n) => n.midi === midi && n.start === start)
    )
      last.duration += end - start;
    else out.push({ id: noteId(), midi, start, duration: end - start });
  }
  return out;
}
export function overlaps(notes: VocalNote[]): boolean {
  const sorted = [...notes].sort((a, b) => a.start - b.start);
  return sorted.some(
    (n, i) =>
      i > 0 && sorted[i - 1].start + sorted[i - 1].duration > n.start + 1e-6,
  );
}
export function placeNote(notes: VocalNote[], note: VocalNote): VocalNote[] {
  // One vocal line: insertion trims/splits notes it covers. Undo restores them.
  const end = note.start + note.duration;
  const out = notes
    .filter((n) => n.id !== note.id)
    .flatMap((n) => {
      const e = n.start + n.duration;
      if (e <= note.start || n.start >= end) return [n];
      const parts: VocalNote[] = [];
      if (note.start - n.start >= 1 / 64)
        parts.push({ ...n, duration: note.start - n.start });
      if (e - end >= 1 / 64)
        parts.push({
          ...n,
          id: parts.length ? noteId() : n.id,
          start: end,
          duration: e - end,
        });
      return parts;
    });
  return [...out, note].sort((a, b) => a.start - b.start);
}
