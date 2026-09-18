import { Guitar } from "lucide-react";
import type { Chord } from "../../lib/model";

export function VoicingPicker({
  chordNames,
  chords,
  defaultVoicings,
  onChange,
}: {
  chordNames: string[];
  chords: Chord[];
  defaultVoicings: Record<string, string>;
  onChange: (voicings: Record<string, string>) => void;
}) {
  if (!chordNames.length) return null;
  return (
    <div className="field">
      <span className="field-label">
        <Guitar size={15} /> Основные аппликатуры
      </span>
      <span className="field-help">
        Выберите, какой вариант взятия показывать для каждого аккорда при
        открытии песни.
      </span>
      <div className="voicing-picker">
        {chordNames.map((name) => {
          const variants = chords.filter((c) => c.name === name);
          if (!variants.length) return null;
          const current =
            variants.find((v) => v.id === defaultVoicings[name]) ?? variants[0];
          return (
            <label key={name} className="voicing-picker-item">
              <span className="voicing-picker-name">{name}</span>
              <select
                value={current.id}
                onChange={(event) =>
                  onChange({ ...defaultVoicings, [name]: event.target.value })
                }
              >
                {variants.map((variant, index) => (
                  <option key={variant.id} value={variant.id}>
                    {index + 1}: с {variant.baseFret} лада
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
    </div>
  );
}
