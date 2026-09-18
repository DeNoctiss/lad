// Converts chords-db guitar chords into a TypeScript data file for our app.
// Reads: F:/tmp/chords-db/src/db/guitar/chords/<KEY>/<SUFFIX>.js
// Writes: src/chordsDb.ts
//
// Each chord file exports:
//   { key, suffix, positions: [{ frets: 'x32010', fingers: '032010', barres?: 3, capo?: true }] }
// frets string uses hex chars: 'x' = muted, '0'-'9' = 0-9, 'a' = 10, 'b' = 11, ...
// We convert to absolute fret numbers and keep barres as absolute frets.

import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "F:/tmp/chords-db/src/db/guitar/chords";
const OUT = "F:/Code for fun/Chords tablet/src/chordsDb.ts";

// Map chords-db key names to our sharp-based root names.
const KEY_MAP = {
  C: "C",
  "C#": "C#",
  D: "D",
  Eb: "D#",
  E: "E",
  F: "F",
  "F#": "F#",
  G: "G",
  Ab: "G#",
  A: "A",
  Bb: "A#",
  B: "B",
};

// Map chords-db suffixes to our display suffixes.
// We keep most as-is but normalize a few.
const SUFFIX_MAP = {
  major: "",
  minor: "m",
  dim: "dim",
  dim7: "dim7",
  sus: "sus4",
  sus2: "sus2",
  sus4: "sus4",
  sus2sus4: "sus2sus4",
  "7sus4": "7sus4",
  alt: "alt",
  aug: "aug",
  "5": "5",
  "6": "6",
  "69": "6/9",
  "7": "7",
  "7b5": "7b5",
  aug7: "aug7",
  "9": "9",
  "9b5": "9b5",
  aug9: "aug9",
  "7b9": "7b9",
  "7#9": "7#9",
  "11": "11",
  "9#11": "9#11",
  "13": "13",
  maj7: "maj7",
  maj7b5: "maj7b5",
  "maj7#5": "maj7#5",
  maj7sus2: "maj7sus2",
  maj9: "maj9",
  maj11: "maj11",
  maj13: "maj13",
  m6: "m6",
  m69: "m6/9",
  m7: "m7",
  m7b5: "m7b5",
  m9: "m9",
  m11: "m11",
  mmaj7: "m(maj7)",
  mmaj7b5: "m(maj7b5)",
  mmaj9: "m(maj9)",
  mmaj11: "m(maj11)",
  add9: "add9",
  madd9: "madd9",
  add11: "add11",
};

// Convert a frets/fingers string to an array of numbers.
// 'x' => -1, '0'-'9' => 0-9, 'a'-'f' => 10-15
function strChord2array(str) {
  return str.split("").map((char) =>
    char.toLowerCase() === "x" ? -1 : parseInt(char, 16),
  );
}

// Parse a single chord JS file content to extract key, suffix, positions.
// The files use ES module export: `export default { ... };`
function parseChordFile(content) {
  // Use eval-like approach: transform export default to a variable.
  // The content is plain JS object literal, safe to eval in a sandbox.
  const code = content
    .replace(/export\s+default\s+/, "module.exports = ")
    .replace(/export\s+const\s+\w+\s*=\s*[^;]+;/g, "");
  // eslint-disable-next-line no-new-func
  const fn = new Function(`const module = { exports: {} }; ${code}; return module.exports;`);
  return fn();
}

// Compute baseFret from absolute frets.
function computeBaseFret(frets) {
  const positive = frets.filter((f) => f > 0);
  if (positive.length === 0) return 1;
  const max = Math.max(...positive);
  const min = Math.min(...positive);
  return max > 4 ? min : 1;
}

function processPosition(pos) {
  const frets = strChord2array(pos.frets);
  const fingers = pos.fingers ? strChord2array(pos.fingers) : [];
  // barres can be a number or array; normalize to absolute fret array
  let barres = [];
  if (pos.barres !== undefined) {
    const raw = Array.isArray(pos.barres) ? pos.barres : [pos.barres];
    barres = raw.map((b) => parseInt(b, 16));
  }
  return {
    frets,
    fingers,
    barres,
    baseFret: computeBaseFret(frets),
  };
}

function main() {
  const keys = readdirSync(ROOT).filter((name) => {
    const stat = statSync(join(ROOT, name));
    return stat.isDirectory();
  });

  const allChords = [];

  for (const keyDir of keys) {
    const ourKey = KEY_MAP[keyDir] ?? keyDir;
    const keyPath = join(ROOT, keyDir);
    const files = readdirSync(keyPath).filter((f) => f.endsWith(".js") && f !== "index.js");

    for (const file of files) {
      const content = readFileSync(join(keyPath, file), "utf-8");
      const chord = parseChordFile(content);
      if (!chord || !chord.positions) continue;

      const dbSuffix = chord.suffix;
      const ourSuffix = SUFFIX_MAP[dbSuffix] ?? dbSuffix;
      const chordName = ourKey + ourSuffix;

      for (const pos of chord.positions) {
        const processed = processPosition(pos);
        allChords.push({
          name: chordName,
          key: ourKey,
          suffix: ourSuffix,
          ...processed,
        });
      }
    }
  }

  // Generate TypeScript
  const ts = `// AUTO-GENERATED from chords-db (https://github.com/tombatossals/chords-db)
// Do not edit by hand. Run scripts/convert-chords-db.mjs to regenerate.

export type ChordDbPosition = {
  name: string;
  key: string;
  suffix: string;
  frets: number[];
  fingers: number[];
  barres: number[];
  baseFret: number;
};

export const CHORDS_DB: ChordDbPosition[] = ${JSON.stringify(allChords, null, 2)};

export const CHORD_DB_KEYS = ${JSON.stringify([...new Set(allChords.map((c) => c.key))])};
export const CHORD_DB_SUFFIXES = ${JSON.stringify([...new Set(allChords.map((c) => c.suffix))])};
`;

  mkdirSync("F:/Code for fun/Chords tablet/src", { recursive: true });
  writeFileSync(OUT, ts, "utf-8");
  console.log(`Wrote ${allChords.length} chord positions to ${OUT}`);
  console.log(`Keys: ${[...new Set(allChords.map((c) => c.key))].length}`);
  console.log(`Suffixes: ${[...new Set(allChords.map((c) => c.suffix))].length}`);
}

main();
