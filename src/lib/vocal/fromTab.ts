import { buildTimeline, laneTunings } from "../playback";
import type { TabPart } from "../model";
import { monophonic, noteId, MIN_MIDI, MAX_MIDI } from "./model";
export function notesFromPart(
  part: TabPart,
  bpm: number,
  capo: number,
  voice: "high" | "low",
) {
  if (!part.score || part.score.kind === "drums")
    throw new Error(
      "Выберите визуальную гитарную, басовую или фортепианную партию",
    );
  const timeline = buildTimeline(
    part.score,
    laneTunings(part.score.kind, part.tuning),
    bpm,
  );
  const shift = part.score.kind === "guitar" ? capo : 0;
  const notes = timeline.notes
    .filter((n) => n.midi !== null && !n.muted)
    .map((n) => ({
      id: noteId(),
      midi: n.midi! + shift,
      start: n.startTick / 480,
      duration: (n.endTick - n.startTick) / 480,
    }))
    .filter(
      (n) => n.midi >= MIN_MIDI && n.midi <= MAX_MIDI && n.duration >= 1 / 64,
    );
  if (!notes.length) throw new Error("В партии нет звучащих нот");
  return {
    notes: monophonic(notes, voice),
    length: timeline.totalTicks / 480,
    meter: part.score.meter,
  };
}
