export type Progression = {
  genre: string;
  degrees: string;
  chords: string[];
  source: "Musicca" | "Hooktheory";
  minor?: boolean;
};
const p = (
  genre: string,
  degrees: string,
  chords: string,
  source: "Musicca" | "Hooktheory" = "Musicca",
  minor = false,
): Progression => ({
  genre,
  degrees,
  chords: chords.split(" "),
  source,
  minor,
});
export const PROGRESSIONS: Progression[] = [
  p("Поп", "I–V–vi–IV", "C G Am F", "Hooktheory"),
  p("Поп", "vi–IV–I–V", "Am F C G", "Hooktheory"),
  p("Поп", "I–ii–V", "C Dm G", "Hooktheory"),
  p("Поп", "I–IV–V–I", "C F G C"),
  p("Поп", "I–IV–Vsus4–V", "C F Gsus4 G"),
  p("Поп", "I–vi–ii–V", "C Am Dm G"),
  p("Поп", "I–ii–IV–V", "C Dm F G"),
  p("Поп", "I–V⁶–vi–V", "C G/B Am G"),
  p("Поп", "i–iv–V–i", "Am Dm E Am", "Musicca", true),
  p("Поп", "i–♭III–iv–v", "Am C Dm Em", "Musicca", true),
  p("Рок", "I–vi–IV–V", "C Am F G"),
  p("Рок", "I–IV–I–V", "C F C G"),
  p("Рок", "I–I–♭III–IV", "C C Eb F"),
  p("Рок", "I–III–IV–iv", "C E F Fm"),
  p("Рок", "I–I–♭VII–IV", "C C Bb F"),
  p("Джаз", "ii⁷–V⁷–Imaj⁷–Imaj⁷", "Dm7 G7 Cmaj7 Cmaj7"),
  p("Джаз", "ii⁷–V⁷–Imaj⁷–VI⁷", "Dm7 G7 Cmaj7 A7"),
  p("Джаз", "Imaj⁷–vi⁷–ii⁷–V⁷", "Cmaj7 Am7 Dm7 G7"),
  p("Джаз", "Imaj⁷–♯i°⁷–ii⁷–V⁷", "Cmaj7 C#dim7 Dm7 G7"),
  p("Джаз", "Imaj⁷–I⁷–IVmaj⁷–iv⁷", "Cmaj7 C7 Fmaj7 Fm7"),
  p("Блюз", "12-тактовый блюз", "C7 C7 C7 C7 F7 F7 C7 C7 G7 F7 C7 C7"),
];
const names = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const pc = (s: string) =>
  (({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 })[s[0]]! +
    (s[1] === "#" ? 1 : s[1] === "b" ? -1 : 0) +
    12) %
  12;
export function chordData(symbol: string, shift = 0) {
  const [chord, bass] = symbol.split("/"),
    match = chord.match(/^([A-G][#b]?)(.*)$/)!,
    root = (((pc(match[1]) + shift) % 12) + 12) % 12,
    suffix = match[2];
  let intervals = suffix.startsWith("dim")
    ? [0, 3, 6, 9]
    : suffix.startsWith("sus4")
      ? [0, 5, 7]
      : suffix.startsWith("m") && !suffix.startsWith("maj")
        ? [0, 3, 7]
        : [0, 4, 7];
  if (suffix.includes("7") && !suffix.startsWith("dim"))
    intervals = [...intervals, suffix.includes("maj") ? 11 : 10];
  const bassPc = bass ? (((pc(bass) + shift) % 12) + 12) % 12 : root;
  return {
    name: names[root] + suffix + (bass ? "/" + names[bassPc] : ""),
    tones: intervals.map((n) => (root + n) % 12),
    midi: [36 + bassPc, ...intervals.map((n) => 48 + root + n)],
  };
}
