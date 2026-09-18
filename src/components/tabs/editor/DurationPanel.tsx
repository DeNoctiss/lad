import type { TabMeasure } from "../../../lib/tabTypes";
import { durations } from "./editorShared";
import type { Rhythm } from "./editorShared";

export function DurationPanel({
  selectedEvent,
  currentRhythm,
  drums,
  measure,
  onChangeRhythm,
  onAddEvent,
  onRemoveEvent,
}: {
  selectedEvent: boolean;
  currentRhythm: Rhythm;
  drums: boolean;
  measure?: TabMeasure;
  onChangeRhythm: (patch: Partial<Rhythm>) => void;
  onAddEvent: (rest: boolean) => void;
  onRemoveEvent: () => void;
}) {
  return (
    <fieldset className="visual-tab-panel">
      <legend>
        Длительность{" "}
        {selectedEvent ? "выбранного события" : "следующего события"}
      </legend>
      <div
        className="visual-tab-durations"
        role="group"
        aria-label="Длительность"
      >
        {durations.map(({ value, label }) => (
          <button
            type="button"
            key={value}
            aria-label={`${label}, 1/${value}`}
            aria-pressed={currentRhythm.duration === value}
            onClick={() => onChangeRhythm({ duration: value })}
          >
            <strong>1/{value}</strong>
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="visual-tab-checks">
        <label>
          <input
            type="checkbox"
            checked={currentRhythm.dotted}
            onChange={(event) =>
              onChangeRhythm({
                dotted: event.target.checked,
                ...(event.target.checked ? { triplet: false } : {}),
              })
            }
          />
          С точкой · +½
        </label>
        <label>
          <input
            type="checkbox"
            checked={currentRhythm.triplet}
            onChange={(event) =>
              onChangeRhythm({
                triplet: event.target.checked,
                ...(event.target.checked ? { dotted: false } : {}),
              })
            }
          />
          Триоль · ⅔
        </label>
      </div>
      <p className="visual-tab-help">
        Все ноты одного момента звучат одновременно и имеют общую длительность
        {drums ? "." : " — это аккорд."} Следующее событие добавляется с текущей
        длительностью.
      </p>
      <div className="visual-tab-actions">
        <button
          type="button"
          className="visual-tab-primary"
          disabled={!measure || measure.events.length >= 64}
          onClick={() => onAddEvent(false)}
        >
          {drums ? "Добавить удар" : "Добавить ноту"}
        </button>
        <button
          type="button"
          disabled={!measure || measure.events.length >= 64}
          onClick={() => onAddEvent(true)}
        >
          Добавить паузу
        </button>
      </div>
      <p className="visual-tab-help">
        Эти кнопки добавляют новое событие в конец такта, а не в выбранный
        момент.
      </p>
      {measure && measure.events.length >= 64 && (
        <p className="visual-tab-overflow" role="status">
          Предел — 64 события. Добавьте следующий такт.
        </p>
      )}
      <button
        type="button"
        className="visual-tab-danger"
        disabled={!selectedEvent}
        onClick={onRemoveEvent}
      >
        Удалить выбранное событие
      </button>
    </fieldset>
  );
}
