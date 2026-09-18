import type { TabMeasure } from "../../../lib/tabTypes";

export function BarTools({
  measures,
  measureIndex,
  onSelect,
  onAddMeasure,
  onRemoveMeasure,
}: {
  measures: TabMeasure[];
  measureIndex: number;
  onSelect: (index: number) => void;
  onAddMeasure: (copy: boolean) => void;
  onRemoveMeasure: () => void;
}) {
  return (
    <>
      <div className="visual-tab-bar-tools">
        <div className="visual-tab-navigation" aria-label="Навигация по тактам">
          <button
            type="button"
            aria-label="Предыдущий такт"
            disabled={measureIndex === 0}
            onClick={() => onSelect(measureIndex - 1)}
          >
            ←
          </button>
          <label className="visual-tab-field">
            <span className="visual-tab-sr-only">Выбранный такт</span>
            <select
              value={measureIndex}
              onChange={(event) => onSelect(Number(event.target.value))}
            >
              {measures.map((bar, index) => (
                <option key={bar.id} value={index}>
                  Такт {index + 1} из {measures.length}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            aria-label="Следующий такт"
            disabled={measureIndex >= measures.length - 1}
            onClick={() => onSelect(measureIndex + 1)}
          >
            →
          </button>
        </div>
        <div className="visual-tab-actions">
          <button
            type="button"
            disabled={measures.length >= 128}
            onClick={() => onAddMeasure(false)}
          >
            Добавить такт
          </button>
          <button
            type="button"
            disabled={!measures[measureIndex] || measures.length >= 128}
            onClick={() => onAddMeasure(true)}
          >
            Копировать такт
          </button>
          <button
            type="button"
            className="visual-tab-danger"
            disabled={measures.length <= 1}
            onClick={onRemoveMeasure}
          >
            Удалить такт
          </button>
        </div>
      </div>
      {measures.length >= 128 && (
        <p className="visual-tab-help" role="status">
          Достигнут предел: 128 тактов.
        </p>
      )}
    </>
  );
}
