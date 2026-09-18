import type { TabScore } from "./tabTypes";
import { kindForInstrument, validateScore } from "./tablature";

export type Band = {
  id: string;
  name: string;
  genre: string;
  color: string;
  initials: string;
};
export type TabPart = {
  id: string;
  name: string;
  instrument: string;
  tuning: string;
  content: string;
  format?: "text" | "visual";
  score?: TabScore;
  /** SoundFont timbre id from lib/partSounds; missing means the instrument default. */
  sound?: string;
};
export type Song = {
  id: string;
  bandId: string;
  title: string;
  key: string;
  bpm: number;
  capo: number;
  favorite: boolean;
  lyrics: string;
  chords: string[];
  /** Maps chord name → chord id for the default voicing shown on the song page. */
  defaultVoicings?: Record<string, string>;
  parts: TabPart[];
  updatedAt: string;
};
export type Chord = {
  id: string;
  name: string;
  frets: number[];
  baseFret: number;
  /** Finger numbers per string (0 = open/none, 1-4 = fingers). Optional. */
  fingers?: number[];
  /** Absolute fret numbers where a barre is placed. Optional. */
  barres?: number[];
};
export type Library = {
  version: 1;
  bands: Band[];
  songs: Song[];
  chords: Chord[];
  /** Built-in voicing ids (db-*) hidden by the user. */
  hiddenChords?: string[];
};
export const STORAGE_KEY = "lad-library-v1";
export function uid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function extractChords(lyrics: string): string[] {
  return [
    ...new Set(
      [...lyrics.matchAll(/\[([^\]\n]+)\]/g)]
        .map((match) => match[1].trim())
        .filter(Boolean),
    ),
  ];
}

export function parseLyricLine(
  line: string,
): { chord: string; text: string }[] {
  const chunks: { chord: string; text: string }[] = [];
  const pattern = /\[([^\]\n]+)\]/g;
  let cursor = 0;
  let chord = "";
  for (const match of line.matchAll(pattern)) {
    if (match.index > cursor || chord)
      chunks.push({ chord, text: line.slice(cursor, match.index) });
    chord = match[1].trim();
    cursor = match.index + match[0].length;
  }
  chunks.push({ chord, text: line.slice(cursor) });
  return chunks;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string";
const int = (value: unknown, min: number, max: number) =>
  Number.isInteger(value) &&
  (value as number) >= min &&
  (value as number) <= max;
const uniqueIds = (items: { id: string }[]) =>
  items.every((item) => item.id.length > 0) &&
  new Set(items.map((item) => item.id)).size === items.length;

export function validateLibrary(value: unknown): Library {
  if (
    !isObject(value) ||
    value.version !== 1 ||
    !Array.isArray(value.bands) ||
    !Array.isArray(value.songs) ||
    !Array.isArray(value.chords)
  )
    throw new Error("Неверный формат резервной копии");
  for (const band of value.bands) {
    if (
      !isObject(band) ||
      !["id", "name", "genre", "color", "initials"].every((key) =>
        text(band[key]),
      ) ||
      !(band.name as string).trim()
    )
      throw new Error("Некорректные данные группы");
  }
  const bandIds = new Set(value.bands.map((band) => band.id));
  for (const song of value.songs) {
    if (
      !isObject(song) ||
      !["id", "bandId", "title", "key", "lyrics", "updatedAt"].every((key) =>
        text(song[key]),
      ) ||
      !(song.title as string).trim() ||
      !bandIds.has(song.bandId) ||
      typeof song.favorite !== "boolean" ||
      !int(song.bpm, 20, 300) ||
      !int(song.capo, 0, 12) ||
      !Array.isArray(song.chords) ||
      !song.chords.every(text) ||
      !Array.isArray(song.parts)
    )
      throw new Error("Некорректные данные песни");
    if (
      song.defaultVoicings !== undefined &&
      (typeof song.defaultVoicings !== "object" ||
        song.defaultVoicings === null ||
        Array.isArray(song.defaultVoicings))
    )
      throw new Error("Некорректные аппликатуры песни");
    for (const part of song.parts) {
      if (
        !isObject(part) ||
        !["id", "name", "instrument", "tuning", "content"].every((key) =>
          text(part[key]),
        ) ||
        !(part.name as string).trim()
      )
        throw new Error("Некорректная партия");
      if (
        part.format !== undefined &&
        part.format !== "text" &&
        part.format !== "visual"
      )
        throw new Error("Неизвестный формат партии");
      if (part.format === "visual" && part.score === undefined)
        throw new Error("Визуальная партия должна содержать ноты");
      if (part.score !== undefined)
        validateScore(part.score, kindForInstrument(part.instrument as string));
    }
    if (!uniqueIds(song.parts)) throw new Error("Повторяющиеся партии");
  }
  for (const chord of value.chords) {
    if (
      !isObject(chord) ||
      !text(chord.id) ||
      !text(chord.name) ||
      !chord.name.trim() ||
      !int(chord.baseFret, 1, 20) ||
      !Array.isArray(chord.frets) ||
      chord.frets.length !== 6 ||
      !chord.frets.every(
        (fret) =>
          int(fret, -1, 24) &&
          (fret <= 0 ||
            int(
              fret,
              chord.baseFret as number,
              (chord.baseFret as number) + 4,
            )),
      )
    )
      throw new Error("Некорректная аппликатура");
  }
  if (
    value.hiddenChords !== undefined &&
    (!Array.isArray(value.hiddenChords) || !value.hiddenChords.every(text))
  )
    throw new Error("Некорректный список скрытых аппликатур");
  const library = value as unknown as Library;
  if (![library.bands, library.songs, library.chords].every(uniqueIds))
    throw new Error("Повторяющиеся идентификаторы");
  return library;
}

export function readLibrary(): {
  library: Library | null;
  error: string | null;
} {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { library: null, error: null };
    const library = validateLibrary(JSON.parse(raw));
    // Migration: remove old built-in chord seed entries (IDs: chord-*, barre-*)
    // Built-in chords are now generated at runtime by chordDatabase.ts.
    library.chords = library.chords.filter(
      (chord) =>
        !chord.id.startsWith("chord-") && !chord.id.startsWith("barre-"),
    );
    return { library, error: null };
  } catch {
    return {
      library: null,
      error:
        "Не удалось прочитать сохранённую библиотеку. Исходные данные не перезаписаны. Экспортируйте текущую библиотеку перед перезагрузкой.",
    };
  }
}

export function emptyTab(instrument: string): string {
  if (instrument === "Пианино") return "Правая рука: C4 E4 G4\nЛевая рука: C3";
  if (instrument === "Барабаны")
    return "CC |----------------|\nSP |----------------|\nRD |----------------|\nHH |x-x-x-x-x-x-x-x-|\nHT |----------------|\nMT |----------------|\nSD |----o-------o---|\nLT |----------------|\nBD |o-------o-------|";
  if (instrument === "Бас-гитара")
    return "G |----------------|\nD |----------------|\nA |----------------|\nE |----------------|";
  return "e |----------------|\nB |----------------|\nG |----------------|\nD |----------------|\nA |----------------|\nE |----------------|";
}
