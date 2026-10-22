import { createVocalProject } from "./model";
import type { VocalProject } from "./model";
/** Original short studies, explicitly not transcriptions of commercial recordings. */
export const exerciseNames = [
  "Плавная фраза",
  "Ритм и восьмые",
  "Длинные ноты",
];
export function vocalExercise(index = 0): VocalProject {
  const p = createVocalProject([84, 104, 72][index] ?? 84);
  const pitches = [
    [60, 62, 64, 65, 67, 67, 65, 64, 62, 60, 62, 64, 62, 60],
    [57, 60, 62, 64, 62, 60, 57, 59, 60, 64, 62, 60, 59, 57, 57, 60],
    [55, 57, 59, 60, 62, 60, 59, 55],
  ][index] ?? [60];
  let start = 0;
  p.notes = pitches.map((midi, i) => {
    const duration =
      index === 1
        ? i % 4 === 3
          ? 1.5
          : 0.5
        : index === 2
          ? 3
          : i % 4 === 3
            ? 2
            : 1;
    const note = { id: "study-" + index + "-" + i, midi, start, duration };
    start += duration + (i % 4 === 3 ? 1 : 0);
    return note;
  });
  p.length = Math.ceil((start + 1) / 4) * 4;
  p.settings.loopEnd = p.length;
  p.source = "Авторское учебное упражнение «" + exerciseNames[index] + "»";
  return p;
}
