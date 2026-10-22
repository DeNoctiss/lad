import type { Band, Library, Song, TabPart } from "../model";
import { createScore } from "../tablature";
import type { TabEvent, TabScore } from "../tabTypes";
import { pianoName } from "../piano";
import type { VocalProject } from "./model";
import { createVocalProject } from "./model";
import { vocalExercise, exerciseNames } from "./exercises";
export const songSources = [
  {
    id: "splin",
    artist: "Сплин",
    title: "Выхода нет",
    url: "https://www.songsterr.com/a/wsa/tab-s523259",
  },
  {
    id: "zveri",
    artist: "Звери",
    title: "Районы-кварталы",
    url: "https://www.songsterr.com/a/wsa/tab-s391621",
  },
  {
    id: "dozhd",
    artist: "Три дня дождя",
    title: "Отпускай",
    url: "https://www.songsterr.com/a/wsa/tab-s565342",
  },
] as const;
/** A playable piano reference for the original studies, including rests and ties. */
function studyPianoScore(project: VocalProject): TabScore {
  const score = createScore("piano");
  const lengths: {
    beats: number;
    duration: TabEvent["duration"];
    dotted: boolean;
  }[] = [
    { beats: 4, duration: 1, dotted: false },
    { beats: 3, duration: 2, dotted: true },
    { beats: 2, duration: 2, dotted: false },
    { beats: 1.5, duration: 4, dotted: true },
    { beats: 1, duration: 4, dotted: false },
    { beats: 0.5, duration: 8, dotted: false },
  ];
  score.measures = [];
  for (let bar = 0; bar < project.length; bar += 4) {
    const events: TabEvent[] = [];
    for (let beat = bar; beat < bar + 4; ) {
      const note = project.notes.find(
        (n) => n.start <= beat && n.start + n.duration > beat,
      );
      const boundary = Math.min(
        bar + 4,
        note
          ? note.start + note.duration
          : (project.notes.find((n) => n.start > beat)?.start ??
              project.length),
      );
      const length = lengths.find((l) => l.beats <= boundary - beat);
      if (!length)
        throw new Error("Учебная мелодия должна использовать сетку восьмых");
      events.push({
        id: "study-event-" + beat,
        duration: length.duration,
        dotted: length.dotted,
        triplet: false,
        notes: note
          ? [
              {
                lane: pianoName(note.midi),
                fret: 0,
                effects: [],
                ...(note.start + note.duration > beat + length.beats
                  ? { link: "tie" as const }
                  : {}),
              },
            ]
          : [],
      });
      beat += length.beats;
    }
    score.measures.push({ id: "study-bar-" + bar, events });
  }
  return score;
}
export function demoSong(index: number): { band: Band; song: Song } {
  const vocal = vocalExercise(index);
  const piano: TabPart = {
    id: "reference",
    name: "Эталон мелодии",
    instrument: "Пианино",
    tuning: "A0–C8",
    content: "",
    format: "visual",
    score: studyPianoScore(vocal),
  };
  // These independent original exercises are not attributed to the artists below.
  return {
    band: {
      id: "lad-vocal-studies",
      name: "Вокальная мастерская",
      genre: "Учебные мелодии",
      color: "lavender",
      initials: "ВМ",
    },
    song: {
      id: "lad-vocal-study-" + index,
      bandId: "lad-vocal-studies",
      title: exerciseNames[index],
      key: ["C", "Am", "G"][index],
      bpm: vocal.bpm,
      capo: 0,
      favorite: false,
      lyrics:
        "{Учебная мелодия}\nАвторское упражнение для проверки вокального тренажёра.\nОткройте вкладку «Вокальный тренажёр», прослушайте мелодию и спойте её на удобном гласном звуке.\n\nНоты можно менять, а тренировку — замедлять и повторять фрагментами.",
      chords: [],
      parts: [piano],
      vocal,
      updatedAt: new Date().toISOString(),
    },
  };
}
export function sourceSong(index: number): { band: Band; song: Song } {
  const s = songSources[index],
    bandId = "lad-source-" + s.id;
  const parts: TabPart[] = (
    [
      ["guitar", "Ритм-гитара", "E A D G B e"],
      ["guitar", "Соло-гитара", "E A D G B e"],
      ["bass", "Бас-гитара", "E A D G"],
      ["drums", "Барабаны", "HH SD BD"],
    ] as const
  ).map(([kind, instrument, tuning], i) => ({
    id: "source-part-" + i,
    name: instrument + " · для заполнения",
    instrument,
    tuning,
    content: "",
    format: "visual",
    score: createScore(kind),
  }));
  const vocal = createVocalProject(90);
  vocal.source = "Заготовка · импортируйте точную вокальную партию";
  return {
    band: {
      id: bandId,
      name: s.artist,
      genre: "Рок",
      color: ["ocean", "sage", "rose"][index],
      initials: ["СП", "ЗВ", "ТД"][index],
    },
    song: {
      id: "lad-source-song-" + s.id,
      bandId,
      title: s.title,
      key: "—",
      bpm: 90,
      capo: 0,
      favorite: false,
      lyrics:
        "{Заготовка для разбора}\nТочные ноты и оригинальная фонограмма пока не загружены. Темп 90 BPM — временная настройка, замените его по вашей версии.\n\n{Источник табулатур}\n" +
        s.url +
        "\n\n{Как начать}\nПартии гитар, баса и ударных подготовлены для заполнения. Вокальную линию импортируйте из своего MIDI или распознайте из акапеллы. Это заготовка, а не транскрипция оригинальной записи.",
      chords: [],
      parts,
      vocal,
      updatedAt: new Date().toISOString(),
    },
  };
}
/** Add-only installation. Duplicate artist names are reused; user edits are never replaced. */
export function installSong(
  library: Library,
  entry: { band: Band; song: Song },
): Library {
  if (library.songs.some((s) => s.id === entry.song.id)) return library;
  const existingBand = library.bands.find(
    (b) =>
      b.id === entry.band.id ||
      b.name.toLocaleLowerCase("ru") ===
        entry.band.name.toLocaleLowerCase("ru"),
  );
  return {
    ...library,
    bands: existingBand ? library.bands : [...library.bands, entry.band],
    songs: [
      ...library.songs,
      { ...entry.song, bandId: existingBand?.id ?? entry.band.id },
    ],
  };
}
