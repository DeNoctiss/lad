import type { Chord, Library, TabPart } from "./model";
import { emptyTab } from "./model";
import type { TabKind, TabScore } from "./tabTypes";
import { parseNotation } from "./tablature";

// Built-in chord voicings are generated at runtime by chordDatabase.ts.
// The seed carries only demonstration content: fictional artists performing
// public-domain songs so every instrument kind, view and playback can be tried.
const chords: Chord[] = [];

const now = "2026-09-01T12:00:00.000Z";
const DRUM_TUNING = "CC · SP · RD · HH · HT · MT · SD · LT · BD";
const GUITAR_TUNING = "E A D G B e";
const BASS_TUNING = "E A D G";

const visualPart = (
  id: string,
  name: string,
  instrument: string,
  tuning: string,
  kind: TabKind,
  beats: number,
  unit: TabScore["meter"]["unit"],
  notation: string,
): TabPart => ({
  id,
  name,
  instrument,
  tuning,
  content: emptyTab(instrument),
  format: "visual",
  score: parseNotation(notation, kind, { beats, unit }),
});

const risingSunLyrics =
  "{Куплет 1}\n" +
  "[Am]There is a [C]house in [D]New Or[F]leans,\n" +
  "[Am]They call the [C]Rising [E]Sun.\n" +
  "[Am]And it's been the [C]ruin of [D]many a poor [F]boy,\n" +
  "[Am]And God, I [E]know I'm [Am]one.\n\n" +
  "{Куплет 2}\n" +
  "[Am]My mother [C]was a [D]tailor[F],\n" +
  "[Am]Sewed my new [C]blue [E]jeans.\n" +
  "[Am]My father [C]was a [D]gambling [F]man,\n" +
  "[Am]Down in New [E]Or[Am]leans.";

const risingSunTab =
  "    Am           C            D            F            Am           E            \n" +
  "e |--------0---|--------0---|------2-----|----------1-|--------0---|----------0-|\n" +
  "B |------1---1-|------1---1-|----3---3---|--------1---|------1---1-|--------0---|\n" +
  "G |----2-------|----0-------|--2-------2-|------2-----|----2-------|------1-----|\n" +
  "D |--2---------|--2---------|0-----------|----3-------|--2---------|----2-------|\n" +
  "A |0-----------|3-----------|------------|--3---------|0-----------|--2---------|\n" +
  "E |------------|------------|------------|1-----------|------------|0-----------|";

const scarboroughLyrics =
  "{Куплет 1}\n" +
  "[Em]Are you going to [G]Scarborough [D]Fair?\n" +
  "[Em]Parsley, sage, rose[Am]mary and [D]thyme.\n" +
  "[Em]Remember me to [G]one who lives [D]there,\n" +
  "[Em]She once was a [D]true love of [Em]mine.";

const odeLyrics =
  "{Куплет}\n" +
  "[C]Freude, schöner [F]Götter[C]funken,\n" +
  "[G]Tochter aus [C]Ely[G]sium,\n" +
  "[C]Wir betreten [F]feuer[C]trunken,\n" +
  "[G]Himmlische, dein [C]Heilig[G]tum.";

const saintsLyrics =
  "{Куплет 1}\n" +
  "[C]Oh, when the [F]saints go [C]marching in,\n" +
  "[C]Oh, when the saints go [G]marching in,\n" +
  "[C]Oh, Lord, I [F]want to be in that [C]number,\n" +
  "[C]When the [G]saints go marching [C]in.";

export const initialLibrary: Library = {
  version: 1,
  bands: [
    {
      id: "folk",
      name: "Народные напевы",
      genre: "Фолк",
      color: "ocean",
      initials: "НН",
    },
    {
      id: "classics",
      name: "Классика для всех",
      genre: "Классика",
      color: "sage",
      initials: "КВ",
    },
  ],
  songs: [
    {
      id: "morning",
      bandId: "folk",
      title: "House of the Rising Sun",
      key: "Am",
      bpm: 76,
      capo: 0,
      favorite: true,
      lyrics: risingSunLyrics,
      chords: ["Am", "C", "D", "F", "E"],
      parts: [
        {
          id: "rhythm",
          name: "Основной рисунок",
          instrument: "Ритм-гитара",
          tuning: GUITAR_TUNING,
          content: risingSunTab,
        },
        visualPart(
          "drums",
          "Ритм-секция",
          "Барабаны",
          DRUM_TUNING,
          "drums",
          6,
          8,
          "[HH:x~open,BD:x]@8 HH:x@8 HH:x@8 [HH:x,SD:x]@8 HH:x@8 HH:x@8 | [RD:x,BD:x]@8 RD:x@8 RD:x@8 [RD:x,SD:x]@8 RD:x@8 RD:x@8 | [RD:x,BD:x]@8 RD:x~accent@8 RD:x@8 [RD:x,SD:x]@8 RD:x@8 RD:x@8 | HT:x@8 MT:x@8 LT:x@8 SD:x~accent@8 [CC:x,BD:x]@8 r@8",
        ),
      ],
      updatedAt: now,
    },
    {
      id: "scarborough",
      bandId: "folk",
      title: "Scarborough Fair",
      key: "Em",
      bpm: 80,
      capo: 0,
      favorite: false,
      lyrics: scarboroughLyrics,
      chords: ["Em", "G", "D", "Am"],
      parts: [
        visualPart(
          "melody",
          "Мелодия",
          "Соло-гитара",
          GUITAR_TUNING,
          "guitar",
          3,
          4,
          "1:0@4 1:2@8 1:0@8 2:3@4 | 2:0@4 2:1@8 2:3@8 1:0@4 | 1:2@4 1:3@8 1:5@8 1:3@4 | 2:3@4 1:0@8 1:2@8 1:0@8 2:3@8",
        ),
        visualPart(
          "bass",
          "Бас",
          "Бас-гитара",
          BASS_TUNING,
          "bass",
          3,
          4,
          "4:0@2 4:0@4 | 4:3@2 4:3@4 | 2:0@2 2:0@4 | 3:0@2 3:0@4",
        ),
      ],
      updatedAt: now,
    },
    {
      id: "ode",
      bandId: "classics",
      title: "Ода радости",
      key: "C",
      bpm: 108,
      capo: 0,
      favorite: false,
      lyrics: odeLyrics,
      chords: ["C", "F", "G"],
      parts: [
        visualPart(
          "piano",
          "Пианино",
          "Пианино",
          "A0–C8",
          "piano",
          4,
          4,
          "E4@4 E4@4 F4@4 G4@4 | G4@4 F4@4 E4@4 D4@4 | C4@4 C4@4 D4@4 E4@4 | E4@4. D4@8 D4@2",
        ),
        visualPart(
          "guitar-melody",
          "Мелодия на гитаре",
          "Соло-гитара",
          GUITAR_TUNING,
          "guitar",
          4,
          4,
          "1:0@4 1:0@4 1:1@4 1:3@4 | 1:3@4 1:1@4 1:0@4 2:3@4 | 2:1@4 2:1@4 2:3@4 1:0@4 | 1:0@4. 2:3@8 2:3@2",
        ),
      ],
      updatedAt: now,
    },
    {
      id: "saints",
      bandId: "classics",
      title: "When the Saints Go Marching In",
      key: "C",
      bpm: 112,
      capo: 0,
      favorite: true,
      lyrics: saintsLyrics,
      chords: ["C", "F", "G"],
      parts: [
        visualPart(
          "strumming",
          "Ритм-гитара",
          "Ритм-гитара",
          GUITAR_TUNING,
          "guitar",
          4,
          4,
          "[5:3,4:2,3:0,2:1,1:0]@4 [5:3,4:2,3:0,2:1,1:0]@4 [5:3,4:2,3:0,2:1,1:0]@4 [5:3,4:2,3:0,2:1,1:0]@4 | [6:1,5:3,4:3,3:2,2:1,1:1]@4 [6:1,5:3,4:3,3:2,2:1,1:1]@4 [6:1,5:3,4:3,3:2,2:1,1:1]@4 [6:1,5:3,4:3,3:2,2:1,1:1]@4 | [5:3,4:2,3:0,2:1,1:0]@4 [5:3,4:2,3:0,2:1,1:0]@4 [6:3,5:2,4:0,3:0,2:0,1:3]@4 [6:3,5:2,4:0,3:0,2:0,1:3]@4 | [5:3,4:2,3:0,2:1,1:0]@4 [5:3,4:2,3:0,2:1,1:0]@4 [6:3,5:2,4:0,3:0,2:0,1:3]@4 [6:3,5:2,4:0,3:0,2:0,1:3]@4",
        ),
        visualPart(
          "drums",
          "Барабаны",
          "Барабаны",
          DRUM_TUNING,
          "drums",
          4,
          4,
          "[HH:x,BD:x]@4 HH:x@4 [HH:x,SD:x]@4 HH:x@4 | [HH:x,BD:x]@4 HH:x@4 [HH:x,SD:x]@4 HH:x@4 | [HH:x,BD:x]@4 HH:x@4 [HH:x,SD:x]@4 SD:x@8 SD:x@8 | SD:x@8 SD:x@8 SD:x@8 SD:x@8 [CC:x,BD:x]@2",
        ),
      ],
      updatedAt: now,
    },
  ],
  chords,
};
