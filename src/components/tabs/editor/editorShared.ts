import type {
  NoteEffect,
  NoteLink,
  TabEvent,
  TabScore,
} from "../../../lib/tabTypes";

export type EditorProps = {
  score: TabScore;
  onChange: (score: TabScore) => void;
};
export type Rhythm = Pick<TabEvent, "duration" | "dotted" | "triplet">;

export const durations: { value: TabEvent["duration"]; label: string }[] = [
  { value: 1, label: "Целая" },
  { value: 2, label: "Половинная" },
  { value: 4, label: "Четверть" },
  { value: 8, label: "Восьмая" },
  { value: 16, label: "Шестнадцатая" },
];

export const effects: { value: NoteEffect; label: string }[] = [
  { value: "pm", label: "P.M. · приглушение ладонью всего созвучия" },
  { value: "v", label: "v · вибрато" },
  { value: "harm", label: "harm · флажолет" },
  { value: "b0.5", label: "b0.5 · бенд ½ тона" },
  { value: "b1", label: "b1 · бенд 1 тон" },
  { value: "accent", label: "Акцент" },
  { value: "ghost", label: "Призрачная нота" },
  { value: "open", label: "Открытый хай-хэт" },
];

export const links: { value: NoteLink | ""; label: string }[] = [
  { value: "", label: "Нет" },
  { value: "h", label: "H · хаммер-он" },
  { value: "p", label: "P · пулл-офф" },
  { value: "/", label: "/ · слайд вверх" },
  { value: "\\", label: "\\ · слайд вниз" },
  { value: "tie", label: "Лига продления" },
];
