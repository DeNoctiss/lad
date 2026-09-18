const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const syllables = [
  "До",
  "До♯",
  "Ре",
  "Ре♯",
  "Ми",
  "Фа",
  "Фа♯",
  "Соль",
  "Соль♯",
  "Ля",
  "Ля♯",
  "Си",
];
const pitchClasses: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};
export function pianoMidi(name: string): number | null {
  const match = /^([A-G])([#b]?)([0-8])$/.exec(name);
  if (!match) return null;
  const midi =
    (Number(match[3]) + 1) * 12 +
    pitchClasses[match[1]] +
    (match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0);
  return midi >= 21 && midi <= 108 ? midi : null;
}
export function pianoName(midi: number): string {
  return `${names[midi % 12]}${Math.floor(midi / 12) - 1}`;
}
export function pianoLabel(name: string): string {
  const midi = pianoMidi(name);
  return midi === null ? name : `${pianoName(midi)} · ${syllables[midi % 12]}`;
}
export function pianoBlack(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(midi % 12);
}
export const pianoKeys = Array.from({ length: 88 }, (_, index) => ({
  midi: index + 21,
  name: pianoName(index + 21),
  black: pianoBlack(index + 21),
}));
