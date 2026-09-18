import type { KeyboardEvent } from "react";
import type {
  NoteEffect,
  NoteLink,
  TabEvent,
  TabNote,
  TabScore,
} from "../../../lib/tabTypes";
import { durationTicks, lanesFor } from "../../../lib/tablature";
import { laneLabels } from "../../../lib/playback";

export type TabScoreViewProps = {
  score: TabScore;
  selectedMeasure?: number;
  selectedEvent?: number;
  onSelect?: (measure: number, event: number) => void;
  onLaneClick?: (measure: number, event: number, lane: string) => void;
  /** Beats per minute for playback. */
  bpm?: number;
  /** Instrument tuning text, e.g. "E A D G B e". */
  tuning?: string;
  /** Timbre id from lib/partSounds for playback. */
  sound?: string;
  /** Currently playing position (for highlight). */
  playingMeasure?: number;
  playingEvent?: number;
};

export const ROW_SIZE = 3;
export const LEFT = 56;
export const RIGHT = 16;
export const TOP = 84;
export const ROW = 26;
export const effectLabels: Record<NoteEffect, string> = {
  pm: "P.M.",
  v: "~",
  harm: "◇",
  "b0.5": "b½",
  b1: "b1",
  accent: ">",
  ghost: "( )",
  open: "○",
};
export const effectNames: Record<NoteEffect, string> = {
  pm: "приглушение ладонью",
  v: "вибрато",
  harm: "искусственный флажолет",
  "b0.5": "бенд на полтона",
  b1: "бенд на тон",
  accent: "акцент",
  ghost: "призрачная нота",
  open: "открытый звук",
};
export const linkLabels: Record<NoteLink, string> = {
  h: "H",
  p: "P",
  "/": "/",
  "\\": "\\",
  tie: "лига",
};
export const linkNames: Record<NoteLink, string> = {
  h: "хаммер-он",
  p: "пулл-офф",
  "/": "слайд вверх",
  "\\": "слайд вниз",
  tie: "лига продления",
};
export const instruments = {
  guitar: "Гитара",
  bass: "Бас-гитара",
  drums: "Ударные",
  piano: "Пианино",
};
export const drumNames: Record<string, string> = {
  HH: "Хай-хэт",
  SD: "Малый барабан",
  BD: "Бас-барабан",
  HT: "Высокий том",
  MT: "Средний том",
  LT: "Низкий том",
  CC: "Крэш",
  SP: "Сплэш",
  RD: "Райд",
};
export const cymbalLanes = new Set(["HH", "CC", "SP", "RD"]);

export function activate(event: KeyboardEvent<SVGElement>, action: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    event.stopPropagation();
    action();
  }
}

export function rhythmLabel(event: TabEvent) {
  return `1/${event.duration}${event.dotted ? " ·" : ""}${event.triplet ? " · 3" : ""}`;
}

export function eventDescription(event: TabEvent, index: number) {
  const notes = event.notes.length
    ? event.notes
        .map(
          (note) =>
            `${note.lane}: ${note.fret === "x" ? "заглушенный звук" : `лад ${note.fret}`}${note.effects.length ? `, ${note.effects.map((effect) => effectNames[effect]).join(", ")}` : ""}${note.link ? `, ${linkNames[note.link]} к следующему событию` : ""}`,
        )
        .join("; ")
    : "пауза";
  const strum =
    event.strum === "down"
      ? " Бой вниз."
      : event.strum === "up"
        ? " Бой вверх."
        : "";
  return `Событие ${index + 1}, длительность 1/${event.duration}${event.dotted ? " с точкой" : ""}${event.triplet ? ", триоль" : ""}.${strum} ${notes}`;
}

export function eventOnsets(events: TabEvent[]) {
  let elapsed = 0;
  return events.map((event) => {
    const onset = elapsed;
    elapsed += durationTicks(event);
    return onset;
  });
}

export function usedTicks(events: TabEvent[]) {
  return events.reduce((sum, event) => sum + durationTicks(event), 0);
}

export function canConnect(source: TabNote, target: TabNote | undefined) {
  if (!target || !source.link || source.fret === "x" || target.fret === "x")
    return false;
  if (source.link === "tie") return source.fret === target.fret;
  if (source.link === "h" || source.link === "/")
    return target.fret > source.fret;
  return target.fret < source.fret;
}

export function orderedLanes(score: TabScore, tuningText?: string) {
  const lanes = [...lanesFor(score.kind)];
  const order =
    score.kind === "drums"
      ? ["CC", "SP", "RD", "HH", "HT", "MT", "SD", "LT", "BD"]
      : score.kind === "bass"
        ? ["G", "D", "A", "E"]
        : ["e", "B", "G", "D", "A", "E"];
  const rank = (lane: { id: string; label: string }) => {
    const exact = order.indexOf(lane.id);
    const label = order.indexOf(lane.label);
    return exact >= 0 ? exact : label >= 0 ? label : lanes.indexOf(lane);
  };
  const sorted = lanes.sort((a, b) => rank(a) - rank(b));
  if (tuningText && (score.kind === "guitar" || score.kind === "bass")) {
    const fallback = new Map(sorted.map((lane) => [lane.id, lane.label]));
    const labels = laneLabels(score.kind, tuningText, fallback);
    return sorted.map((lane) => ({
      ...lane,
      label: labels.get(lane.id) ?? lane.label,
    }));
  }
  return sorted;
}

export function remainingLabel(used: number, total: number, beats: number) {
  if (used > total) return "Такт переполнен — исправьте длительности";
  if (used === total) return "Такт заполнен";
  const remaining = (total - used) / (total / beats);
  return `Свободно ${Number(remaining.toFixed(2)).toLocaleString("ru-RU")} доли`;
}
