import type { TabScore } from "../../../lib/tabTypes";

type Meter = TabScore["meter"];

export function EditorHeading({
  drums,
  piano,
  meter,
  onMeterChange,
}: {
  drums: boolean;
  piano: boolean;
  meter: Meter;
  onMeterChange: (meter: Meter) => void;
}) {
  return (
    <div className="visual-tab-heading">
      <div>
        <h3>Редактор партитуры</h3>
        <p className="visual-tab-help">
          {piano
            ? "Выберите позицию в такте и соберите созвучие на клавишах."
            : drums
              ? "Поставьте удары прямо в сетке. Повторный клик убирает удар."
              : "Кликните по струне и введите лад с клавиатуры. Стрелки перемещают курсор."}
        </p>
      </div>
      <div
        className="visual-tab-meter"
        role="group"
        aria-label="Размер всех тактов"
      >
        <span>Размер</span>
        <label className="visual-tab-field">
          <span className="visual-tab-sr-only">Долей в такте</span>
          <select
            value={meter.beats}
            onChange={(event) =>
              onMeterChange({ ...meter, beats: Number(event.target.value) })
            }
          >
            {Array.from({ length: 12 }, (_, index) => index + 1).map(
              (value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ),
            )}
          </select>
        </label>
        <span>/</span>
        <label className="visual-tab-field">
          <span className="visual-tab-sr-only">Единица размера</span>
          <select
            value={meter.unit}
            onChange={(event) =>
              onMeterChange({
                ...meter,
                unit: Number(event.target.value) as 4 | 8,
              })
            }
          >
            <option value={4}>4</option>
            <option value={8}>8</option>
          </select>
        </label>
      </div>
    </div>
  );
}
