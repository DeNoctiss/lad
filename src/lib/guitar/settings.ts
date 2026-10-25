import { LICKS } from "./model";
import { PROGRESSIONS } from "./progressions";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
export const SETTINGS_KEY = "lad-guitar-practice-v1";
export const defaults = {
  pageTab: "practice",
  mode: "boxes",
  root: 9,
  major: false,
  box: 0,
  adjacent: false,
  all: false,
  blue: false,
  labels: "both",
  lickId: 0,
  bpm: "80",
  loop: false,
  animate: true,
  genre: "Все",
  progression: 8,
  backing: false,
  durations: [] as number[],
};
type Settings = typeof defaults;
const choices: Partial<Record<keyof Settings, string[]>> = {
  pageTab: ["practice", "scales", "chords", "keys"],
  mode: ["boxes", "licks", "progressions"],
  labels: ["both", "notes", "degrees", "fingers"],
  genre: ["Все", "Поп", "Рок", "Джаз", "Блюз"],
};
export function parseSettings(raw: string | null): Settings {
  const result = { ...defaults };
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw ?? "{}");
    if (!data || typeof data !== "object") return result;
  } catch {
    return result;
  }
  for (const name of Object.keys(defaults) as (keyof Settings)[]) {
    const v = data[name];
    if (choices[name]) {
      if (typeof v === "string" && choices[name]!.includes(v))
        Object.assign(result, { [name]: v });
    } else if (typeof defaults[name] === "boolean") {
      if (typeof v === "boolean") Object.assign(result, { [name]: v });
    } else if (name === "durations") {
      if (
        Array.isArray(v) &&
        v.length <= 12 &&
        v.every((x) => [0.5, 1, 2, 3, 4, 6, 8].includes(x))
      )
        result.durations = v;
    } else if (name === "bpm") {
      if (typeof v === "string" && Number(v) >= 40 && Number(v) <= 160)
        result.bpm = v;
    } else if (
      typeof v === "number" &&
      Number.isInteger(v) &&
      v >= 0 &&
      v <=
        ({
          root: 11,
          box: 4,
          lickId: LICKS.length - 1,
          progression: PROGRESSIONS.length - 1,
        }[name as "root"] ?? 0)
    ) {
      Object.assign(result, { [name]: v });
    }
  }
  return result;
}
function read() {
  try {
    return parseSettings(localStorage.getItem(SETTINGS_KEY));
  } catch {
    return { ...defaults };
  }
}
/** Playback state is deliberately not persisted; only explicit user preferences. */
export function usePracticeSetting<K extends keyof Settings>(
  key: K,
): [Settings[K], Dispatch<SetStateAction<Settings[K]>>] {
  const [value, setValue] = useState<Settings[K]>(() => read()[key]);
  useEffect(() => {
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({ ...read(), [key]: value }),
      );
    } catch {
      /* Preferences must not prevent use if storage is full or blocked. */
    }
  }, [key, value]);
  return [value, setValue];
}
