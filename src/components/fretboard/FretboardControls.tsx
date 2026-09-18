import type { ReactNode } from "react";
import { TUNINGS } from "../../lib/scales";

export function FretboardControls({ children }: { children: ReactNode }) {
  return <div className="fretboard-controls">{children}</div>;
}

export function TuningSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string) => void;
}) {
  return (
    <label className="fretboard-field">
      <span>Строй</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {TUNINGS.map((t) => (
          <option key={t.name} value={t.name}>
            {t.name}
          </option>
        ))}
        <option value="Свой строй">Свой строй</option>
      </select>
    </label>
  );
}

export function NamesCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="fretboard-checkbox">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>Показывать названия нот</span>
    </label>
  );
}
