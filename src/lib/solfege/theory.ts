/** Scientific pitch notation: middle C = C4 = MIDI 60. */
export const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
export const SOLFEGE = ["до", "ре", "ми", "фа", "соль", "ля", "си"];
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
export const SHARPS = ["F", "C", "G", "D", "A", "E", "B"];
export const FLATS = ["B", "E", "A", "D", "G", "C", "F"];
export const MAJOR = [0, 2, 4, 5, 7, 9, 11];
export const INTERVALS = [
  "Прима",
  "Малая секунда",
  "Большая секунда",
  "Малая терция",
  "Большая терция",
  "Чистая кварта",
  "Тритон",
  "Чистая квинта",
  "Малая секста",
  "Большая секста",
  "Малая септима",
  "Большая септима",
  "Октава",
];
export const CHORDS = [
  {
    name: "Мажорное трезвучие",
    steps: [0, 4, 7],
    hint: "Большая терция + малая терция: 4 + 3 полутона.",
  },
  {
    name: "Минорное трезвучие",
    steps: [0, 3, 7],
    hint: "Малая терция + большая терция: 3 + 4 полутона.",
  },
  {
    name: "Уменьшённое трезвучие",
    steps: [0, 3, 6],
    hint: "Две малые терции: 3 + 3 полутона.",
  },
  {
    name: "Увеличенное трезвучие",
    steps: [0, 4, 8],
    hint: "Две большие терции: 4 + 4 полутона.",
  },
];
export type Key = {
  fifths: number;
  tonic: string;
  minor: string;
  notes: string[];
  midi: number[];
  signs: string[];
};
export function keyFor(fifths: number): Key {
  if (!Number.isInteger(fifths) || fifths < -7 || fifths > 7)
    throw new Error("Допустимо от −7 до 7 знаков");
  const alterations = new Map(
    (fifths > 0 ? SHARPS : FLATS)
      .slice(0, Math.abs(fifths))
      .map((l) => [l, fifths > 0 ? 1 : -1]),
  );
  const start = (((fifths * 4) % 7) + 7) % 7;
  const notes = Array.from({ length: 7 }, (_, i) => {
    const letter = LETTERS[(start + i) % 7],
      a = alterations.get(letter) ?? 0;
    return letter + (a === 1 ? "♯" : a === -1 ? "♭" : "");
  });
  const tonicPc =
    (((NATURAL[start] + (alterations.get(LETTERS[start]) ?? 0)) % 12) + 12) %
    12;
  return {
    fifths,
    tonic: notes[0],
    minor: notes[5],
    notes,
    midi: MAJOR.map((v) => 60 + tonicPc + v),
    signs: [...alterations].map(([l, a]) => l + (a > 0 ? "♯" : "♭")),
  };
}
export const CIRCLE = [0, 1, 2, 3, 4, 5, 6, -5, -4, -3, -2, -1];
export const ALL_KEYS = Array.from({ length: 15 }, (_, i) => keyFor(i - 7));
export function diatonicChords(key: Key) {
  return key.notes.map((name, i) => ({
    name: name + (i === 6 ? "dim" : [1, 2, 5].includes(i) ? "m" : ""),
    numeral: ["I", "ii", "iii", "IV", "V", "vi", "vii°"][i],
    midi: [i, i + 2, i + 4].map((n) => key.midi[n % 7] + (n >= 7 ? 12 : 0)),
  }));
}
export function signLabel(fifths: number) {
  return fifths === 0
    ? "Без знаков"
    : `${Math.abs(fifths)} ${fifths > 0 ? "♯ — диезы" : "♭ — бемоли"}`;
}
export function pitchLabel(midi: number) {
  const pc = ((Math.round(midi) % 12) + 12) % 12;
  return (
    ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"][pc] +
    (Math.floor(Math.round(midi) / 12) - 1)
  );
}
export function centsFrom(midi: number, target: number) {
  return Math.round((midi - target) * 100);
}
