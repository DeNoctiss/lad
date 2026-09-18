import { durationTicks, measureTicks } from "../../../lib/tablature";
import {
  LEFT,
  RIGHT,
  effectLabels,
  effectNames,
  drumNames,
  cymbalLanes,
  rhythmLabel,
  eventDescription,
  eventOnsets,
  usedTicks,
  orderedLanes,
} from "./scoreShared";
import type { TabScoreViewProps } from "./scoreShared";

export function DrumMeasure({
  score,
  measureIndex,
  selectedMeasure,
  selectedEvent,
  onSelect,
  onLaneClick,
  playingMeasure,
  playingEvent,
  width,
}: TabScoreViewProps & { measureIndex: number; width: number }) {
  const measure = score.measures[measureIndex];
  const total = measureTicks(score.meter);
  const used = usedTicks(measure.events);
  const onsets = eventOnsets(measure.events);
  const lanes = orderedLanes(score);
  const blank = Math.max(0, total - used);
  const template = `${LEFT}px ${measure.events.map((event) => `minmax(0, ${durationTicks(event)}fr)`).join(" ")}${blank ? ` minmax(0, ${blank}fr)` : ""} ${RIGHT}px`;
  const subdivisions = score.meter.unit === 4 ? 2 : 1;
  return (
    <div className="tab-score-drum-wrap">
      <div
        className="tab-score-drum-beats"
        style={{
          marginLeft: LEFT,
          width: width - LEFT - RIGHT,
        }}
        aria-label={`Доли такта, размер ${score.meter.beats}/${score.meter.unit}`}
      >
        {Array.from({ length: score.meter.beats * subdivisions }, (_, beat) => (
          <span
            key={beat}
            style={{
              left: `${(beat / (score.meter.beats * subdivisions)) * 100}%`,
            }}
          >
            {beat % subdivisions === 0 ? beat / subdivisions + 1 : "и"}
          </span>
        ))}
      </div>
      <table className="tab-score-drum-table" style={{ width }}>
        <caption className="tab-score-sr-only">
          Ударные, такт {measureIndex + 1}. Ширина столбца соответствует
          длительности события. CC — крэш, SP — сплэш, RD — райд, HH — хай-хэт,
          HT/MT/LT — высокий, средний и низкий томы, SD — малый, BD —
          бас-барабан.
        </caption>
        <thead>
          <tr style={{ gridTemplateColumns: template }}>
            <th scope="col">Инструмент</th>
            {measure.events.map((event, eventIndex) => (
              <th
                key={event.id}
                scope="col"
                className={
                  playingMeasure === measureIndex && playingEvent === eventIndex
                    ? "tab-score-drum-playing"
                    : selectedMeasure === measureIndex &&
                        selectedEvent === eventIndex
                      ? "tab-score-drum-selected"
                      : ""
                }
              >
                {onSelect ? (
                  <button
                    type="button"
                    className="tab-score-drum-event"
                    aria-label={`Такт ${measureIndex + 1}. ${eventDescription(event, eventIndex)}`}
                    aria-pressed={
                      selectedMeasure === measureIndex &&
                      selectedEvent === eventIndex
                    }
                    onClick={() => onSelect(measureIndex, eventIndex)}
                  >
                    {rhythmLabel(event)}
                    {event.notes.length === 0 && <small>пауза</small>}
                  </button>
                ) : (
                  <span
                    className="tab-score-drum-event"
                    title={eventDescription(event, eventIndex)}
                  >
                    <span className="tab-score-sr-only">
                      Событие {eventIndex + 1}:{" "}
                    </span>
                    {rhythmLabel(event)}
                    {event.notes.length === 0 && <small>пауза</small>}
                  </span>
                )}
              </th>
            ))}
            {blank > 0 && (
              <th scope="col" className="tab-score-drum-unused">
                Свободно
              </th>
            )}
            <th scope="col">
              <span className="tab-score-sr-only">Конец такта</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {lanes.map((lane) => (
            <tr key={lane.id} style={{ gridTemplateColumns: template }}>
              <th scope="row" title={drumNames[lane.id] ?? lane.label}>
                {lane.id}
                <small>{drumNames[lane.id] ?? lane.label}</small>
              </th>
              {measure.events.map((event, eventIndex) => {
                const note = event.notes.find(
                  (candidate) => candidate.lane === lane.id,
                );
                const action = onLaneClick
                  ? () => onLaneClick(measureIndex, eventIndex, lane.id)
                  : onSelect
                    ? () => onSelect(measureIndex, eventIndex)
                    : undefined;
                const label = `Такт ${measureIndex + 1}, событие ${eventIndex + 1}, ${drumNames[lane.id] ?? lane.label}: ${note ? `удар${note.effects.length ? `, ${note.effects.map((effect) => effectNames[effect]).join(", ")}` : ""}` : "нет удара"}`;
                const isHat = cymbalLanes.has(lane.id);
                const hitGlyph = note
                  ? note.effects.includes("ghost")
                    ? isHat
                      ? "(×)"
                      : "(●)"
                    : note.effects.includes("open")
                      ? "⊗"
                      : isHat
                        ? "×"
                        : "●"
                  : "·";
                const content = (
                  <>
                    <span
                      className={
                        note ? "tab-score-drum-hit" : "tab-score-drum-empty"
                      }
                      aria-hidden="true"
                    >
                      {hitGlyph}
                    </span>
                    {note && (
                      <small aria-hidden="true" className="tab-score-effect">
                        {note.effects
                          .filter(
                            (effect) => effect !== "ghost" && effect !== "open",
                          )
                          .map((effect) => effectLabels[effect])
                          .join(" ")}
                      </small>
                    )}
                  </>
                );
                return (
                  <td
                    key={event.id}
                    className={`tab-score-note${selectedMeasure === measureIndex && selectedEvent === eventIndex ? " tab-score-drum-selected" : ""}${playingMeasure === measureIndex && playingEvent === eventIndex ? " tab-score-drum-playing" : ""}`}
                    data-onset={onsets[eventIndex]}
                  >
                    {action ? (
                      <button
                        type="button"
                        className="tab-score-drum-cell"
                        aria-label={`${label}. ${onLaneClick ? "Переключить удар" : "Выбрать событие"}`}
                        aria-pressed={
                          onLaneClick
                            ? Boolean(note)
                            : selectedMeasure === measureIndex &&
                              selectedEvent === eventIndex
                        }
                        onClick={(click) => {
                          click.stopPropagation();
                          action();
                        }}
                      >
                        {content}
                      </button>
                    ) : (
                      <span
                        className="tab-score-drum-cell"
                        role="img"
                        aria-label={label}
                      >
                        {content}
                      </span>
                    )}
                  </td>
                );
              })}
              {blank > 0 && (
                <td className="tab-score-drum-unused">
                  <span className="tab-score-sr-only">Не заполнено</span>
                </td>
              )}
              <td aria-hidden="true" />
            </tr>
          ))}
        </tbody>
      </table>
      {measure.events.length === 0 && (
        <p className="tab-score-drum-guidance">
          Пустой такт. Добавьте событие, затем отметьте удары в его столбце.
        </p>
      )}
    </div>
  );
}
