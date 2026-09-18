/**
 * Note names using sharps, indexed by semitone (0 = C, 11 = B).
 */
export const NOTE_NAMES = [
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

/**
 * Flat note names for alternative display.
 */
export const NOTE_NAMES_FLAT = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
] as const;

export type ScaleType = {
  name: string;
  shortName: string;
  intervals: number[];
};

/**
 * Database of scale types with their interval patterns.
 * Intervals are semitones from the root note.
 */
export const SCALE_TYPES: ScaleType[] = [
  {
    name: "Мажор (Ионийский)",
    shortName: "мажор",
    intervals: [0, 2, 4, 5, 7, 9, 11],
  },
  {
    name: "Натуральный минор (Эолийский)",
    shortName: "минор",
    intervals: [0, 2, 3, 5, 7, 8, 10],
  },
  {
    name: "Гармонический минор",
    shortName: "гарм. минор",
    intervals: [0, 2, 3, 5, 7, 8, 11],
  },
  {
    name: "Мелодический минор",
    shortName: "мел. минор",
    intervals: [0, 2, 3, 5, 7, 9, 11],
  },
  {
    name: "Мажорная пентатоника",
    shortName: "маж. пентатоника",
    intervals: [0, 2, 4, 7, 9],
  },
  {
    name: "Минорная пентатоника",
    shortName: "мин. пентатоника",
    intervals: [0, 3, 5, 7, 10],
  },
  { name: "Блюзовая", shortName: "блюзовая", intervals: [0, 3, 5, 6, 7, 10] },
  {
    name: "Дорийский",
    shortName: "дорийский",
    intervals: [0, 2, 3, 5, 7, 9, 10],
  },
  {
    name: "Фригийский",
    shortName: "фригийский",
    intervals: [0, 1, 3, 5, 7, 8, 10],
  },
  {
    name: "Лидийский",
    shortName: "лидийский",
    intervals: [0, 2, 4, 6, 7, 9, 11],
  },
  {
    name: "Миксолидийский",
    shortName: "миксолидийский",
    intervals: [0, 2, 4, 5, 7, 9, 10],
  },
  {
    name: "Локрийский",
    shortName: "локрийский",
    intervals: [0, 1, 3, 5, 6, 8, 10],
  },
  {
    name: "Гармонический мажор",
    shortName: "гарм. мажор",
    intervals: [0, 2, 4, 5, 7, 8, 11],
  },
  {
    name: "Венгерский минор",
    shortName: "венг. минор",
    intervals: [0, 2, 3, 6, 7, 8, 11],
  },
  {
    name: "Фригийский доминантный",
    shortName: "фриг. доминантный",
    intervals: [0, 1, 4, 5, 7, 8, 10],
  },
  {
    name: "Целотонная",
    shortName: "целотонная",
    intervals: [0, 2, 4, 6, 8, 10],
  },
  {
    name: "Хроматическая",
    shortName: "хроматическая",
    intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  },
];

export type Tuning = {
  name: string;
  /** Open string notes, low E (string 6) to high e (string 1), as semitone values 0-11. */
  notes: number[];
};

/**
 * Common guitar tunings.
 * Notes are semitone values (0 = C, 4 = E, etc.), ordered low to high.
 */
export const TUNINGS: Tuning[] = [
  { name: "Стандартный (E A D G B E)", notes: [4, 9, 2, 7, 11, 4] },
  { name: "Drop D (D A D G B E)", notes: [2, 9, 2, 7, 11, 4] },
  { name: "Drop C (C G C F A D)", notes: [0, 7, 0, 5, 9, 2] },
  { name: "DADGAD (D A D G A D)", notes: [2, 9, 2, 7, 9, 2] },
  { name: "Open G (D G D G B D)", notes: [2, 7, 2, 7, 11, 2] },
  { name: "Open D (D A D F# A D)", notes: [2, 9, 2, 6, 9, 2] },
  { name: "Open E (E B E G# B E)", notes: [4, 11, 4, 8, 11, 4] },
  { name: "Open A (E A E A C# E)", notes: [4, 9, 4, 9, 1, 4] },
  { name: "Half Step Down (Eb Ab Db Gb Bb Eb)", notes: [3, 8, 1, 6, 10, 3] },
  { name: "Whole Step Down (D G C F A D)", notes: [2, 7, 0, 5, 9, 2] },
  { name: "Standard B (B E A D F# B)", notes: [11, 4, 9, 2, 6, 11] },
];

/**
 * Standard guitar tuning as semitone values, low E to high e.
 */
export const STANDARD_TUNING = [4, 9, 2, 7, 11, 4];

export const NUM_FRETS = 24;

/**
 * Fret positions that get inlay markers (single dot).
 */
export const FRET_MARKERS = [3, 5, 7, 9, 15, 17, 19, 21];

/**
 * Fret positions that get double inlay markers.
 */
export const DOUBLE_FRET_MARKERS = [12, 24];

/**
 * Get the note name for a semitone value.
 */
export function noteName(semitone: number): string {
  return NOTE_NAMES[((semitone % 12) + 12) % 12];
}

/**
 * Get the note at a given string and fret.
 * @param stringNote - open note of the string (semitone 0-11)
 * @param fret - fret number (0 = open)
 */
export function noteAt(stringNote: number, fret: number): number {
  return (stringNote + fret) % 12;
}

/**
 * Get all notes in a scale.
 * @param root - root note (semitone 0-11)
 * @param intervals - interval pattern
 */
export function scaleNotes(root: number, intervals: number[]): number[] {
  return intervals.map((i) => (root + i) % 12);
}

/**
 * Get a set of scale notes for quick lookup.
 */
export function scaleNoteSet(root: number, intervals: number[]): Set<number> {
  return new Set(scaleNotes(root, intervals));
}

/**
 * Count how many of the selected notes are in a scale.
 */
export function matchCount(
  selected: number[],
  scaleRoot: number,
  intervals: number[],
): { matches: number; total: number; missing: number[]; extra: number[] } {
  const scaleSet = scaleNoteSet(scaleRoot, intervals);
  const selectedSet = new Set(selected);
  const matches = [...selectedSet].filter((n) => scaleSet.has(n)).length;
  const missing = [...scaleSet].filter((n) => !selectedSet.has(n));
  const extra = [...selectedSet].filter((n) => !scaleSet.has(n));
  return { matches, total: intervals.length, missing, extra };
}

/**
 * Parse a note name string into a semitone value.
 */
export function parseNote(name: string): number | null {
  const match = name.trim().match(/^([A-Ga-hH])([#♯b♭]?)/);
  if (!match) return null;
  const base: Record<string, number> = {
    c: 0,
    d: 2,
    e: 4,
    f: 5,
    g: 7,
    a: 9,
    b: 11,
    h: 11,
  };
  const letter = match[1].toLowerCase();
  const accidental = match[2];
  if (base[letter] === undefined) return null;
  let result = base[letter];
  if (accidental === "#" || accidental === "♯") result += 1;
  else if (accidental === "b" || accidental === "♭") result -= 1;
  return ((result % 12) + 12) % 12;
}
