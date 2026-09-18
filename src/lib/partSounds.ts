import type { TabKind } from "./tabTypes";

export type DriveType = "overdrive" | "distortion";

export type PartSound = {
  id: string;
  label: string;
  file: string;
  /** Web Audio amp simulation applied on top of the sample. */
  fx?: DriveType;
};

/** Selectable timbres per instrument kind; first entry is the default. */
export const PART_SOUNDS: Partial<Record<TabKind, PartSound[]>> = {
  guitar: [
    {
      id: "steel",
      label: "Акустика · сталь",
      file: "acoustic_guitar_steel-mp3.js",
    },
    {
      id: "nylon",
      label: "Акустика · нейлон",
      file: "acoustic_guitar_nylon-mp3.js",
    },
    {
      id: "clean",
      label: "Электрогитара · чистая",
      file: "mk/electric_guitar_clean-mp3.js",
    },
    {
      id: "muted",
      label: "Электрогитара · приглушённая",
      file: "mk/electric_guitar_muted-mp3.js",
    },
    {
      id: "overdrive",
      label: "Электрогитара · овердрайв",
      file: "mk/overdriven_guitar-mp3.js",
      fx: "overdrive",
    },
    {
      id: "distortion",
      label: "Электрогитара · дисторшн",
      file: "mk/distortion_guitar-mp3.js",
      fx: "distortion",
    },
  ],
  bass: [
    { id: "finger", label: "Пальцы", file: "electric_bass_finger-mp3.js" },
    { id: "pick", label: "Медиатор", file: "electric_bass_pick-mp3.js" },
    { id: "slap", label: "Слэп", file: "slap_bass_1-mp3.js" },
  ],
  piano: [
    { id: "grand", label: "Рояль", file: "acoustic_grand_piano-mp3.js" },
    {
      id: "epiano",
      label: "Электропианино",
      file: "electric_piano_1-mp3.js",
    },
    { id: "rockorgan", label: "Рок-орган", file: "rock_organ-mp3.js" },
    { id: "organ", label: "Орган", file: "church_organ-mp3.js" },
    { id: "violin", label: "Скрипка", file: "violin-mp3.js" },
    {
      id: "strings",
      label: "Струнный ансамбль",
      file: "string_ensemble_1-mp3.js",
    },
  ],
};

export function soundOptions(kind: TabKind): PartSound[] {
  return PART_SOUNDS[kind] ?? [];
}

function findSound(kind: TabKind, sound?: string): PartSound | undefined {
  const options = soundOptions(kind);
  if (!options.length) return undefined;
  return options.find((option) => option.id === sound) ?? options[0];
}

/** SoundFont file for a kind + optional sound id; falls back to the default. */
export function soundFile(kind: TabKind, sound?: string): string | undefined {
  return findSound(kind, sound)?.file;
}

/** Amp effect for a kind + optional sound id; undefined means clean playback. */
export function soundFx(kind: TabKind, sound?: string): DriveType | undefined {
  return findSound(kind, sound)?.fx;
}
