import type { TabEvent } from "../../../lib/tabTypes";

export function rhythm(event: TabEvent) {
  return `1/${event.duration}${event.dotted ? "." : ""}${event.triplet ? " · 3" : ""}`;
}
export function eventLabel(event: TabEvent, bar: number, index: number) {
  return `Такт ${bar + 1}, событие ${index + 1}: ${event.notes.length ? event.notes.map((note) => note.lane).join(", ") : "пауза"}; ${rhythm(event)}`;
}
