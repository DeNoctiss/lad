export const strings = ["E", "A", "D", "G", "B", "e"];
export const roots = [
  "C",
  "C♯ / D♭",
  "D",
  "D♯ / E♭",
  "E",
  "F",
  "F♯ / G♭",
  "G",
  "G♯ / A♭",
  "A",
  "A♯ / B♭",
  "B",
];
const notes: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
  H: 11,
};
export const normalize = (value: string) =>
  value.trim().replaceAll("♯", "#").replaceAll("♭", "b").toLowerCase();

export function chordRoot(name: string) {
  const match = name.trim().match(/^([A-Ha-h])([#♯b♭]?)/);
  if (!match || notes[match[1].toUpperCase()] === undefined) return -1;
  const alteration =
    match[2] === "#" || match[2] === "♯" ? 1 : match[2] ? -1 : 0;
  return (notes[match[1].toUpperCase()] + alteration + 12) % 12;
}
