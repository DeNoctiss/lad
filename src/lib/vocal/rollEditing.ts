import { clamp } from "./model";
import type { VocalNote } from "./model";
export type NoteDragAction = "move" | "resize-start" | "resize-end";
export const ROLL_GRIDS = [
  { step: 1, label: "1/4 · четверть", description: "1 деление на четверть" },
  { step: 0.5, label: "1/8 · восьмая", description: "2 деления на четверть" },
  {
    step: 0.25,
    label: "1/16 · шестнадцатая",
    description: "4 деления на четверть",
  },
  {
    step: 1 / 3,
    label: "1/8T · триоль",
    description: "3 равных деления на четверть",
  },
] as const;
const snap = (beat: number, grid: number) => Math.round(beat / grid) * grid;
export function dragVocalNote(
  note: VocalNote,
  action: NoteDragAction,
  deltaBeats: number,
  deltaMidi: number,
  grid: number,
  length: number,
): VocalNote {
  const end = note.start + note.duration,
    minimum = Math.min(grid, note.duration);
  if (action === "resize-start") {
    const start = clamp(snap(note.start + deltaBeats, grid), 0, end - minimum);
    return { ...note, start, duration: end - start };
  }
  if (action === "resize-end") {
    const nextEnd = clamp(
      snap(end + deltaBeats, grid),
      note.start + minimum,
      length,
    );
    return { ...note, duration: nextEnd - note.start };
  }
  return {
    ...note,
    start:
      deltaBeats === 0
        ? note.start
        : clamp(snap(note.start + deltaBeats, grid), 0, length - note.duration),
    midi: clamp(note.midi + deltaMidi, 21, 108),
  };
}
export function noteGeometry(note: VocalNote, pixelsPerBeat: number) {
  const width = Math.max(4, note.duration * pixelsPerBeat - 2);
  return {
    x: note.start * pixelsPerBeat + 1,
    width,
    handle: Math.min(10, width / 3),
  };
}
export function sameVocalNote(a: VocalNote, b: VocalNote) {
  return (
    a.midi === b.midi &&
    Math.abs(a.start - b.start) < 1e-9 &&
    Math.abs(a.duration - b.duration) < 1e-9
  );
}
