import { emptySlots } from "../../../lib/tabEditing";
import type { Rhythm } from "../../../lib/tabEditing";
import type { TabScore } from "../../../lib/tabTypes";
import { durationTicks } from "../../../lib/tablature";
import { pianoLabel } from "../../../lib/piano";
import { rhythm, eventLabel } from "./pianoShared";

export function KeysStrip({
  score,
  start,
  end,
  barWidth,
  columns,
  capacity,
  entryRhythm,
  selectedTick,
  onEmptyPick,
  barIndex,
  eventIndex,
  playingMeasure,
  playingEvent,
  onPick,
}: {
  score: TabScore;
  start: number;
  end: number;
  barWidth: number;
  columns: number;
  capacity: number;
  entryRhythm?: Rhythm;
  selectedTick?: number;
  onEmptyPick?: (measure: number, tick: number) => void;
  barIndex: number;
  eventIndex: number;
  playingMeasure?: number;
  playingEvent?: number;
  onPick: (measure: number, event: number) => void;
}) {
  const pick = onPick;
  return (
    <div
      className="tab-score-strip piano-strip"
      tabIndex={0}
      role="region"
      aria-label="Лента клавиш пианино"
    >
      <div
        className="tab-score-measures"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {score.measures.slice(start, end).map((bar, offset) => {
          const m = start + offset;
          const used = bar.events.reduce(
            (sum, event) => sum + durationTicks(event),
            0,
          );
          const blanks =
            onEmptyPick && entryRhythm ? emptySlots(score, m, entryRhythm) : [];
          const remaining =
            capacity - used - blanks.reduce((sum, slot) => sum + slot.ticks, 0);
          return (
            <article
              className={`tab-score-measure piano-measure${m === barIndex ? " tab-score-measure-selected" : ""}`}
              data-measure={m}
              key={bar.id}
            >
              <header className="piano-measure-header">
                Такт {m + 1}
                <span>
                  {score.meter.beats}/{score.meter.unit}
                </span>
              </header>
              <div className="piano-events-scroll">
                <div className="piano-events" style={{ minWidth: barWidth }}>
                  {bar.events.map((event, index) => (
                    <button
                      type="button"
                      className={`piano-event${m === playingMeasure && index === playingEvent ? " piano-event-playing" : ""}`}
                      key={event.id}
                      style={{
                        width: (durationTicks(event) / capacity) * barWidth,
                      }}
                      aria-label={eventLabel(event, m, index)}
                      aria-pressed={m === barIndex && index === eventIndex}
                      onClick={() => pick(m, index)}
                    >
                      <span className="piano-event-duration">
                        {rhythm(event)}
                      </span>
                      <span className="piano-event-notes">
                        {event.notes.length ? (
                          event.notes.slice(0, 4).map((note) => (
                            <span key={note.lane} title={pianoLabel(note.lane)}>
                              {note.lane}
                              {note.link === "tie" ? " ↔" : ""}
                              {note.effects.includes("accent") ? " >" : ""}
                              {note.effects.includes("ghost") ? " (тихо)" : ""}
                            </span>
                          ))
                        ) : (
                          <span>пауза</span>
                        )}
                        {event.notes.length > 4 && (
                          <small>ещё {event.notes.length - 4}</small>
                        )}
                      </span>
                    </button>
                  ))}
                  {blanks.map(({ tick, ticks, rhythm: slotRhythm }) => (
                    <button
                      type="button"
                      key={tick}
                      className="piano-event piano-empty-event"
                      style={{
                        width: (ticks / capacity) * barWidth,
                      }}
                      aria-label={`Такт ${m + 1}, позиция ${Number((tick / 480 + 1).toFixed(2))}: новое созвучие`}
                      aria-pressed={m === barIndex && tick === selectedTick}
                      onClick={() => onEmptyPick!(m, tick)}
                    >
                      <span className="piano-event-duration">
                        {slotRhythm ? rhythm(slotRhythm) : "Свободно"}
                      </span>
                      <span>+</span>
                    </button>
                  ))}
                  {remaining > 0 && (
                    <div
                      className="piano-unfilled"
                      style={{
                        width: (remaining / capacity) * barWidth,
                      }}
                    >
                      Свободно
                    </div>
                  )}
                </div>
                <div
                  className="piano-beat-ruler"
                  style={{ minWidth: barWidth }}
                >
                  {Array.from({ length: score.meter.beats }, (_, i) => (
                    <span key={i}>{i + 1}</span>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
