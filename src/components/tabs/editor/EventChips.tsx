import type { TabEvent, TabMeasure } from "../../../lib/tabTypes";

export function EventChips({
  measureIndex,
  measure,
  selectedEvent,
  eventIndex,
  drums,
  usedTicks,
  capacity,
  onSelect,
}: {
  measureIndex: number;
  measure?: TabMeasure;
  selectedEvent?: TabEvent;
  eventIndex: number;
  drums: boolean;
  usedTicks: number;
  capacity: number;
  onSelect: (measure: number, event?: number) => void;
}) {
  return (
    <>
      <div className="visual-tab-event-heading">
        <strong>
          Такт {measureIndex + 1} ·{" "}
          {selectedEvent ? `событие ${eventIndex + 1}` : "новый момент"}
        </strong>
        <span
          className={
            usedTicks > capacity ? "visual-tab-overflow" : "visual-tab-help"
          }
        >
          Заполнение:{" "}
          {capacity > 0 ? Math.round((usedTicks / capacity) * 100) : 0}% ·{" "}
          {measure?.events.length ?? 0}/64 событий
        </span>
      </div>
      <div
        className="visual-tab-event-list"
        role="group"
        aria-label={`События такта ${measureIndex + 1}`}
      >
        {measure?.events.map((event, index) => (
          <button
            type="button"
            key={event.id}
            aria-label={`Событие ${index + 1}`}
            aria-pressed={event.id === selectedEvent?.id}
            onClick={() => onSelect(measureIndex, index)}
          >
            <span>{index + 1}</span>
            <small>
              {event.notes.length
                ? drums
                  ? `${event.notes.length} уд.`
                  : `${event.notes.length} нот.`
                : "Пауза"}{" "}
              · 1/{event.duration}
              {event.dotted ? " ·" : ""}
              {event.triplet ? " (3)" : ""}
              {event.strum === "down" ? " ↓" : event.strum === "up" ? " ↑" : ""}
            </small>
          </button>
        ))}
        <button
          type="button"
          aria-pressed={!selectedEvent}
          onClick={() => onSelect(measureIndex)}
        >
          Новый момент
        </button>
      </div>
      {!measure?.events.length && (
        <p className="visual-tab-help">
          Такт пуст. Добавьте ноту, удар или паузу, затем выберите дорожки в
          этом моменте.
        </p>
      )}
    </>
  );
}
