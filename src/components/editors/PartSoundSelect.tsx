import type { TabKind } from "../../lib/tabTypes";
import { soundOptions } from "../../lib/partSounds";

export function PartSoundSelect({
  kind,
  value,
  onChange,
}: {
  kind: TabKind;
  value: string;
  onChange: (sound: string | undefined) => void;
}) {
  const options = soundOptions(kind);
  if (options.length < 2) return null;
  return (
    <label className="field">
      Звук инструмента
      <select
        aria-label="Звук инструмента"
        value={value}
        onChange={(event) => onChange(event.target.value || undefined)}
      >
        {options.map((option, index) => (
          <option key={option.id} value={index === 0 ? "" : option.id}>
            {option.label}
            {index === 0 ? " · по умолчанию" : ""}
          </option>
        ))}
      </select>
      <span className="field-help">
        Влияет на прослушивание визуальной партии.
      </span>
    </label>
  );
}
