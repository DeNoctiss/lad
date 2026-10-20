import type { ReactNode } from "react";
import type { TabKind } from "../../lib/tabTypes";

const INSTRUMENTS = [
  "Ритм-гитара",
  "Соло-гитара",
  "Бас-гитара",
  "Барабаны",
  "Пианино",
  "Другое",
];

export function PartMetaFields({
  name,
  instrument,
  tuning,
  kind,
  onNameChange,
  onInstrumentChange,
  onTuningChange,
  children,
  autoFocus = false,
}: {
  name: string;
  instrument: string;
  tuning: string;
  kind: TabKind;
  onNameChange: (value: string) => void;
  onInstrumentChange: (value: string) => void;
  onTuningChange: (value: string) => void;
  children?: ReactNode;
  autoFocus?: boolean;
}) {
  return (
    <>
      <div className="form-grid">
        <label className="field">
          Название партии
          <input
            autoFocus={autoFocus}
            required
            maxLength={80}
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Вступление, куплет, соло…"
          />
        </label>
        <label className="field">
          Инструмент
          <select
            aria-label="Инструмент"
            value={instrument}
            onChange={(event) => onInstrumentChange(event.target.value)}
          >
            {INSTRUMENTS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>
      <details className="part-sound-settings">
        <summary>Строй и звучание инструмента</summary>
        <div>
          <label className="field">
            Строй / обозначения дорожек
            <input
              value={tuning}
              onChange={(event) => onTuningChange(event.target.value)}
              placeholder="E A D G B e"
            />
            <span className="field-help">
              {kind === "piano"
                ? "C4 — среднее до. Доступны клавиши A0–C8; это поле служит заметкой о партии."
                : "Для струнных строй влияет на подписи и звук: указывайте от толстой струны к тонкой, например D A D G B e. На схеме тонкая струна сверху."}
            </span>
          </label>
          {children}
        </div>
      </details>
    </>
  );
}
