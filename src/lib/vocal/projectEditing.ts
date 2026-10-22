import { MAX_BEATS, MAX_MIDI, MIN_MIDI, validateVocalProject } from "./model";
import type { VocalNote, VocalProject } from "./model";
/** Change the grid while preserving absolute playback time. */
export function regridProject(
  project: VocalProject,
  bpm: number,
): VocalProject {
  const ratio = bpm / project.bpm;
  const audio = Object.fromEntries(
    Object.entries(project.audio ?? {}).map(([kind, meta]) => [
      kind,
      meta && {
        ...meta,
        originalBpm: meta.originalBpm * ratio,
        offset: meta.offset * ratio,
      },
    ]),
  );
  return validateVocalProject({
    ...project,
    bpm,
    audio,
    length: project.length * ratio,
    notes: project.notes.map((n) => ({
      ...n,
      start: n.start * ratio,
      duration: n.duration * ratio,
    })),
    settings: {
      ...project.settings,
      loopStart: project.settings.loopStart * ratio,
      loopEnd: project.settings.loopEnd * ratio,
    },
  });
}
/** A new melody resets speed; recordings keep their absolute offset. */
export function replaceMelody(
  project: VocalProject,
  melody: Pick<VocalProject, "notes" | "bpm" | "meter" | "length" | "source">,
): VocalProject {
  const ratio = melody.bpm / project.bpm;
  const audio = Object.fromEntries(
    Object.entries(project.audio ?? {}).map(([kind, meta]) => [
      kind,
      meta && { ...meta, originalBpm: melody.bpm, offset: meta.offset * ratio },
    ]),
  );
  return validateVocalProject({
    ...project,
    ...melody,
    audio,
    settings: {
      ...project.settings,
      speed: 1,
      transpose: 0,
      loop: false,
      loopStart: 0,
      loopEnd: melody.length,
    },
  });
}
/** Edit source pitches, without transposing the audio. */
export function shiftNotes(notes: VocalNote[], semitones: number): VocalNote[] {
  if (
    !Number.isInteger(semitones) ||
    notes.some(
      (n) => n.midi + semitones < MIN_MIDI || n.midi + semitones > MAX_MIDI,
    )
  )
    throw new Error("Сдвиг выходит за диапазон A0–C8. Ноты не изменены.");
  return notes.map((n) => ({ ...n, midi: n.midi + semitones }));
}
export const audioEndBeat = (duration: number, bpm: number, offset: number) =>
  Math.min(MAX_BEATS, Math.max(0, (duration * bpm) / 60 + offset));
