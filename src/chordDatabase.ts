import type { Chord } from "./model";
import { CHORDS_DB } from "./chordsDb";

export const CHORD_ROOTS = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export type ChordType = {
  suffix: string;
  intervals: number[];
  label: string;
};

export const CHORD_TYPES: ChordType[] = [
  { suffix: "", intervals: [0, 4, 7], label: "Мажор" },
  { suffix: "m", intervals: [0, 3, 7], label: "Минор" },
  { suffix: "dim", intervals: [0, 3, 6], label: "Уменьшенный" },
  { suffix: "aug", intervals: [0, 4, 8], label: "Увеличенный" },
  {
    suffix: "maj7",
    intervals: [0, 4, 7, 11],
    label: "Большой мажорный септаккорд",
  },
  { suffix: "7", intervals: [0, 4, 7, 10], label: "Доминантсептаккорд" },
  {
    suffix: "m7",
    intervals: [0, 3, 7, 10],
    label: "Малый минорный септаккорд",
  },
  { suffix: "dim7", intervals: [0, 3, 6, 9], label: "Уменьшенный септаккорд" },
  {
    suffix: "m(maj7)",
    intervals: [0, 3, 7, 11],
    label: "Минорный большой мажорный",
  },
  { suffix: "m7b5", intervals: [0, 3, 6, 10], label: "Полууменьшенный" },
  { suffix: "sus2", intervals: [0, 2, 7], label: "Сус2" },
  { suffix: "sus4", intervals: [0, 5, 7], label: "Сус4" },
  { suffix: "6", intervals: [0, 4, 7, 9], label: "Секстаккорд" },
  { suffix: "6/9", intervals: [0, 4, 7, 9, 2], label: "Шесть-девять" },
  { suffix: "9", intervals: [0, 4, 7, 10, 2], label: "Нонаккорд" },
  { suffix: "11", intervals: [0, 4, 7, 10, 2, 5], label: "Ундецимаккорд" },
  { suffix: "13", intervals: [0, 4, 7, 10, 2, 5, 9], label: "Терцдецимаккорд" },
  { suffix: "5", intervals: [0, 7], label: "Квинтаккорд" },
];

export function chordName(rootIndex: number, suffix: string): string {
  return CHORD_ROOTS[rootIndex] + suffix;
}

export function parseChordName(
  name: string,
): { root: number; suffix: string } | null {
  const trimmed = name
    .trim()
    .replace(/\u266f/g, "#")
    .replace(/\u266d/g, "b");
  const match = trimmed.match(/^([A-G])([#b]?)(.*)$/);
  if (!match) return null;
  const letter = match[1];
  const accidental = match[2];
  const suffix = match[3];
  const baseNotes: Record<string, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  };
  const base = baseNotes[letter];
  if (base === undefined) return null;
  let root = base;
  if (accidental === "#") root += 1;
  else if (accidental === "b") root -= 1;
  root = ((root % 12) + 12) % 12;
  return { root, suffix };
}

/* ------------------------------------------------------------------ */
/*  Built-in chord database from chords-db                              */
/* ------------------------------------------------------------------ */

let cachedChords: Chord[] | null = null;

/**
 * Convert a chords-db position into our Chord model.
 * Frets in chords-db are absolute; we keep them absolute and compute baseFret.
 */
function dbPositionToChord(
  pos: (typeof CHORDS_DB)[number],
  index: number,
): Chord {
  return {
    id: `db-${pos.name}-${index}`,
    name: pos.name,
    frets: [...pos.frets],
    baseFret: pos.baseFret,
    fingers: pos.fingers.length ? [...pos.fingers] : undefined,
    barres: pos.barres.length ? [...pos.barres] : undefined,
  };
}

/**
 * Generate all built-in chord voicings from the chords-db database.
 * Results are cached after first call.
 */
export function generateBuiltinChords(): Chord[] {
  if (cachedChords) return cachedChords;
  const all: Chord[] = CHORDS_DB.map((pos, i) => dbPositionToChord(pos, i));

  // Sort: group by name, then by baseFret (lowest first = easiest)
  all.sort((a, b) => {
    if (a.name !== b.name) return a.name.localeCompare(b.name);
    return a.baseFret - b.baseFret;
  });

  cachedChords = all;
  return all;
}

/**
 * Combine built-in chords with user-added chords.
 * Built-in voicings hidden by the user or shadowed by a saved user
 * voicing with the same id are excluded.
 */
export function allChords(
  userChords: Chord[],
  hidden?: ReadonlySet<string> | string[],
): Chord[] {
  const hiddenIds =
    hidden === undefined
      ? undefined
      : hidden instanceof Set
        ? hidden
        : new Set(hidden);
  const userIds = new Set(userChords.map((chord) => chord.id));
  return [
    ...generateBuiltinChords().filter(
      (chord) => !hiddenIds?.has(chord.id) && !userIds.has(chord.id),
    ),
    ...userChords,
  ];
}

/**
 * Find all voicings for a given chord name (built-in + user).
 */
export function findVoicings(
  name: string,
  userChords: Chord[],
  hidden?: ReadonlySet<string> | string[],
): Chord[] {
  return allChords(userChords, hidden).filter((chord) => chord.name === name);
}

/* ------------------------------------------------------------------ */
/*  CAGED system shapes                                                 */
/* ------------------------------------------------------------------ */

export type CagedShape = {
  shapeName: string;
  rootName: string;
  frets: number[];
  description: string;
};

/**
 * The 5 CAGED open shapes for major chords.
 * Each can be moved up the neck to produce the same chord type at different roots.
 */
export const CAGED_MAJOR_SHAPES: CagedShape[] = [
  {
    shapeName: "C-форма",
    rootName: "C",
    frets: [-1, 3, 2, 0, 1, 0],
    description:
      "Открытый аккорд C. Корень на 5-й струне (лад 3) и 2-й струне (лад 1). " +
      "При перемещении на 2 лада вверх получается D, на 5 — F и т.д.",
  },
  {
    shapeName: "A-форма",
    rootName: "A",
    frets: [-1, 0, 2, 2, 2, 0],
    description:
      "Открытый аккорд A. Корень на 5-й струне (открытая). " +
      "При перемещении на 3 лада вверх получается C (x35553) — классическое баррэ.",
  },
  {
    shapeName: "G-форма",
    rootName: "G",
    frets: [3, 2, 0, 0, 0, 3],
    description:
      "Открытый аккорд G. Корень на 6-й струне (лад 3) и 1-й струне (лад 3). " +
      "Наименее удобная для баррэ, но важна для понимания грифа.",
  },
  {
    shapeName: "E-форма",
    rootName: "E",
    frets: [0, 2, 2, 1, 0, 0],
    description:
      "Открытый аккорд E. Корень на 6-й струне (открытая). " +
      "При перемещении на 1 лад вверх получается F (133211) — самое распространённое баррэ.",
  },
  {
    shapeName: "D-форма",
    rootName: "D",
    frets: [-1, -1, 0, 2, 3, 2],
    description:
      "Открытый аккорд D. Корень на 4-й струне (открытая). " +
      "Удобна для высоких позиций и соло-аккомпанемента.",
  },
];

/**
 * The 5 CAGED open shapes for minor chords.
 * Cm and Gm don't have practical open forms, so they show the movable shape.
 */
export const CAGED_MINOR_SHAPES: CagedShape[] = [
  {
    shapeName: "C-форма",
    rootName: "C",
    frets: [-1, 3, 1, 0, 1, 0],
    description:
      "Минорная C-форма. На открытой позиции используется редко, " +
      "но как баррэ применяется для мажорных аккордов с пониженной терцией.",
  },
  {
    shapeName: "A-форма",
    rootName: "A",
    frets: [-1, 0, 2, 2, 1, 0],
    description:
      "Открытый Am. Корень на 5-й струне. " +
      "При перемещении на 3 лада вверх получается Cm (x35543).",
  },
  {
    shapeName: "G-форма",
    rootName: "G",
    frets: [3, 1, 0, 0, 0, 3],
    description:
      "Минорная G-форма. Открытый Gm используется редко, " +
      "но форма важна для грифа.",
  },
  {
    shapeName: "E-форма",
    rootName: "E",
    frets: [0, 2, 2, 0, 0, 0],
    description:
      "Открытый Em. Корень на 6-й струне. " +
      "При перемещении на 1 лад вверх получается Fm (133111).",
  },
  {
    shapeName: "D-форма",
    rootName: "D",
    frets: [-1, -1, 0, 2, 3, 1],
    description:
      "Открытый Dm. Корень на 4-й струне. " + "Удобна для высоких позиций.",
  },
];
