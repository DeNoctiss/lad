import { NOTE_NAMES } from "../scales";
export const mod = (n: number) => ((n % 12) + 12) % 12;
export const OPEN = [64, 59, 55, 50, 45, 40];
export const degree = (n: number, root: number) =>
  ["1", "♭2", "2", "♭3", "3", "4", "♭5", "5", "♭6", "6", "♭7", "7"][
    mod(n - root)
  ];
export const pitchName = (m: number) =>
  NOTE_NAMES[mod(m)] + (Math.floor(m / 12) - 1);
export const BOXES = [
  [
    [0, 3],
    [0, 3],
    [0, 2],
    [0, 2],
    [0, 2],
    [0, 3],
  ],
  [
    [3, 5],
    [3, 5],
    [2, 4],
    [2, 5],
    [2, 5],
    [3, 5],
  ],
  [
    [5, 7],
    [5, 8],
    [4, 7],
    [5, 7],
    [5, 7],
    [5, 7],
  ],
  [
    [7, 10],
    [8, 10],
    [7, 9],
    [7, 9],
    [7, 10],
    [7, 10],
  ],
  [
    [10, 12],
    [10, 12],
    [9, 12],
    [9, 12],
    [10, 12],
    [10, 12],
  ],
];
export function boxPositions(
  root: number,
  major: boolean,
  box: number,
  octave = 0,
) {
  let base = mod(mod(root + (major ? 9 : 0)) - 4) + octave * 12;
  if (base + Math.max(...BOXES[box].flat()) > 24) base -= 12;
  return BOXES[box]
    .flatMap((frets, string) =>
      frets.map((f, i) => ({
        string,
        fret: base + f,
        finger: base + f === 0 ? 0 : i === 0 ? 1 : f - frets[0] + 1,
      })),
    )
    .filter((p) => p.fret >= 0 && p.fret <= 24);
}
export type Technique =
  | "pick"
  | "slide"
  | "hammer"
  | "pull"
  | "bend"
  | "release"
  | "prebend"
  | "vibrato";
export const TECHNIQUES: Record<Technique, string> = {
  pick: "Щипок",
  slide: "Слайд",
  hammer: "Hammer-on",
  pull: "Pull-off",
  bend: "Бенд · 1 тон",
  release: "Бенд и отпускание",
  prebend: "Пребенд и отпускание",
  vibrato: "Вибрато",
};
export const SYMBOLS: Record<Technique, string> = {
  pick: "",
  slide: "слайд",
  hammer: "H",
  pull: "P",
  bend: "↗ 1 тон",
  release: "↗ 1 ↘",
  prebend: "1 ↘",
  vibrato: "~",
};
export type LickNote = {
  string: number;
  fret: number;
  beats: number;
  technique: Technique;
  target?: number;
};
export type Lick = {
  id: string;
  title: string;
  goal: string;
  notes: LickNote[];
};
const n = (
  string: number,
  fret: number,
  beats = 1,
  technique: Technique = "pick",
  target?: number,
): LickNote => ({ string, fret, beats, technique, target });
export const LICKS: Lick[] = [
  {
    id: "home",
    title: "Возвращение к тонике",
    goal: "Закончите фразу на тонике. Первый бокс.",
    notes: [n(1, 5), n(2, 7), n(2, 5), n(3, 7, 1, "vibrato")],
  },
  {
    id: "slide",
    title: "Связь позиций",
    goal: "Скользите по третьей струне без повторного щипка.",
    notes: [n(2, 5, 2, "slide", 7), n(1, 5), n(0, 5)],
  },
  {
    id: "hammer",
    title: "Легато вверх",
    goal: "Извлеките вторую ноту ударом пальца.",
    notes: [n(0, 5, 0.5, "hammer", 8), n(1, 8, 0.5), n(1, 5), n(2, 7, 2)],
  },
  {
    id: "pull",
    title: "Легато вниз",
    goal: "Снимите палец со срывом, сохранив звучание.",
    notes: [n(0, 8, 1, "pull", 5), n(1, 8), n(1, 5), n(3, 7)],
  },
  {
    id: "bend",
    title: "Попадите в высоту",
    goal: "Подтяните третью струну на тон и удержите высоту.",
    notes: [n(2, 7, 2, "bend"), n(1, 5), n(0, 5)],
  },
  {
    id: "release",
    title: "Подтянуть и отпустить",
    goal: "Подъём на тон, удержание и возвращение без нового щипка.",
    notes: [n(2, 7, 2, "release"), n(2, 5), n(3, 7)],
  },
  {
    id: "prebend",
    title: "Начало с подтяжки",
    goal: "Сначала подтяните струну, затем щипните и отпустите.",
    notes: [n(2, 7, 2, "prebend"), n(2, 5), n(3, 7)],
  },
  {
    id: "vibrato",
    title: "Длинная нота",
    goal: "Дайте ноте прозвучать, затем добавьте небольшое вибрато.",
    notes: [n(1, 5), n(2, 7), n(3, 7, 2, "vibrato")],
  },
  {
    id: "cross",
    title: "Переход через струны",
    goal: "Пунктир показывает следующую позицию, а не движение одного пальца.",
    notes: [n(0, 5), n(2, 5), n(1, 5), n(3, 7)],
  },
  {
    id: "repeat",
    title: "Ритмический ответ",
    goal: "Различайте повторные щипки на одном ладу.",
    notes: [n(0, 5, 0.5), n(0, 5, 0.5), n(0, 8), n(1, 5), n(3, 7)],
  },
  {
    id: "mix",
    title: "Слайд и вибрато",
    goal: "Соедините два движения в одной фразе.",
    notes: [n(2, 5, 2, "slide", 7), n(1, 5, 2, "vibrato")],
  },
  {
    id: "sequence",
    title: "Тройки в пентатонике",
    goal: "Повторяющийся рисунок на соседних струнах.",
    notes: [
      n(2, 5, 0.5),
      n(2, 7, 0.5),
      n(1, 5, 0.5),
      n(2, 7, 0.5),
      n(1, 5, 0.5),
      n(1, 8, 0.5),
      n(0, 5),
    ],
  },
  {
    id: "low",
    title: "Нижний регистр",
    goal: "Найдите тонику на шестой струне.",
    notes: [n(5, 5), n(5, 8, 0.5), n(4, 5, 0.5), n(4, 7), n(5, 5)],
  },
  {
    id: "high",
    title: "Ответ в верхнем регистре",
    goal: "Один мотив с двумя разными окончаниями.",
    notes: [
      n(0, 5, 0.5),
      n(0, 8, 0.5),
      n(1, 8),
      n(0, 5, 0.5),
      n(0, 8, 0.5),
      n(0, 5),
    ],
  },
  {
    id: "slideDown",
    title: "Слайд вниз",
    goal: "Сохраняйте давление пальца при движении к нижнему ладу.",
    notes: [n(2, 7, 2, "slide", 5), n(3, 7, 2, "vibrato")],
  },
  {
    id: "legatoChain",
    title: "Цепочка легато",
    goal: "Сравните восходящее и нисходящее легато.",
    notes: [n(1, 5, 1, "hammer", 8), n(1, 8, 1, "pull", 5), n(2, 7), n(3, 7)],
  },
  {
    id: "bendAnswer",
    title: "Бенд и точная нота",
    goal: "Сравните высоту подтяжки с той же нотой на второй струне.",
    notes: [n(2, 7, 2, "bend"), n(1, 5, 2)],
  },
  {
    id: "octave",
    title: "Тоника в разных октавах",
    goal: "Одна ступень на разных струнах: услышьте октаву.",
    notes: [n(5, 5), n(3, 7), n(0, 5, 2, "vibrato")],
  },
  {
    id: "boxTwo",
    title: "Второй бокс",
    goal: "Фраза в соседней позиции пентатоники.",
    notes: [n(0, 8, 1, "slide", 10), n(1, 10), n(1, 8), n(1, 10)],
  },
  {
    id: "phrase",
    title: "Блюзовый ответ",
    goal: "После подтяжки сыграйте короткое нисходящее окончание.",
    notes: [
      n(2, 7, 1, "release"),
      n(2, 5, 0.5),
      n(3, 7, 0.5),
      n(3, 5),
      n(4, 7),
    ],
  },
];
export function transposeLick(lick: Lick, root: number) {
  let shift = mod(root - 9);
  if (
    Math.max(...lick.notes.map((n) => Math.max(n.fret, n.target ?? 0))) +
      shift >
    24
  )
    shift -= 12;
  return lick.notes.map((n) => ({
    ...n,
    fret: n.fret + shift,
    target: n.target === undefined ? undefined : n.target + shift,
  }));
}
export function expression(note: LickNote, p: number, seconds: number) {
  p = Math.max(0, Math.min(1, p));
  switch (note.technique) {
    case "slide":
      return (
        (note.target! - note.fret) * Math.min(1, Math.max(0, (p - 0.15) / 0.65))
      );
    case "hammer":
    case "pull":
      return p < 0.48 ? 0 : note.target! - note.fret;
    case "bend":
      return 2 * Math.min(1, p / 0.45);
    case "release":
      return p < 0.4 ? (2 * p) / 0.4 : p < 0.65 ? 2 : (2 * (1 - p)) / 0.35;
    case "prebend":
      return p < 0.3 ? 2 : (2 * (1 - p)) / 0.7;
    case "vibrato":
      return p < 0.25 ? 0 : 0.18 * (1 - Math.cos(seconds * Math.PI * 10));
    default:
      return 0;
  }
}
/** Keep the fifth-to-first transition in neighbouring octaves on a 24-fret neck. */
export function neighbouringBoxes(root: number, major: boolean, box: number) {
  const first = boxPositions(root, major, box),
    second = boxPositions(root, major, (box + 1) % 5);
  if (box !== 4) return [...first, ...second];
  const upper = second.map((p) => ({ ...p, fret: p.fret + 12 }));
  return Math.max(...upper.map((p) => p.fret)) <= 24
    ? [...first, ...upper]
    : [...first.map((p) => ({ ...p, fret: p.fret - 12 })), ...second];
}
/** All pitch locations retain a concrete fingering; preferred box wins overlaps. */
export function fullPentatonicPositions(
  root: number,
  major: boolean,
  preferredBox: number,
) {
  const positions = new Map<
    string,
    { string: number; fret: number; finger: number }
  >();
  const order = [
    preferredBox,
    ...[0, 1, 2, 3, 4].filter((b) => b !== preferredBox),
  ];
  for (const box of order)
    for (const p of boxPositions(root, major, box))
      for (const shift of [-12, 0, 12]) {
        const fret = p.fret + shift;
        if (fret < 0 || fret > 24) continue;
        const key = `${p.string}-${fret}`;
        if (!positions.has(key))
          positions.set(key, {
            ...p,
            fret,
            finger: fret === 0 ? 0 : p.finger || 1,
          });
      }
  return [...positions.values()];
}
