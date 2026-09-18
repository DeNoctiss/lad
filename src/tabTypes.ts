export type TabKind = "guitar" | "bass" | "drums" | "piano";
export type NoteEffect =
  | "pm"
  | "v"
  | "b0.5"
  | "b1"
  | "accent"
  | "ghost"
  | "open";
export type NoteLink = "h" | "p" | "/" | "\\" | "tie";
export type TabNote = {
  lane: string;
  fret: number | "x";
  effects: NoteEffect[];
  link?: NoteLink;
};
export type TabEvent = {
  id: string;
  duration: 1 | 2 | 4 | 8 | 16;
  dotted: boolean;
  triplet: boolean;
  notes: TabNote[];
};
export type TabMeasure = { id: string; events: TabEvent[] };
export type TabScore = {
  version: 1;
  kind: TabKind;
  meter: { beats: number; unit: 4 | 8 };
  measures: TabMeasure[];
};
export type TabIssue = { measure: number; event?: number; message: string };
