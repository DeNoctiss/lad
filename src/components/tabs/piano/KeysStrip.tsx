import type { TabScore } from "../../../lib/tabTypes";
import { durationTicks } from "../../../lib/tablature";
import { pianoLabel } from "../../../lib/piano";
import { rhythm, eventLabel } from "./pianoShared";

export function KeysStrip({
  score,
  start,
  end,
  barWidth,
  capacity,
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
  capacity: number;
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
      <div className="tab-score-measures">
        {score.measures.slice(start, end).map((bar, offset) => {
          const m = start + offset;
          const used = bar.events.reduce(
            (sum, event) => sum + durationTicks(event),
            0,
          );
          return (
            <article
              className={`tab-score-measure piano-measure${m === barIndex ? " tab-score-measure-selected" : ""}`}
              data-measure={m}
              key={bar.id}
              style={{
                width: Math.max(barWidth, (used / capacity) * barWidth),
              }}
            >
              <header className="piano-measure-header">
                Такт {m + 1}
                <span>
                  {score.meter.beats}/{score.meter.unit}
                </span>
              </header>
              <div className="piano-events">
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
                {used < capacity && (
                  <div
                    className="piano-unfilled"
                    style={{
                      width: ((capacity - used) / capacity) * barWidth,
                    }}
                  >
                    Свободно
                  </div>
                )}
              </div>
              <div className="piano-beat-ruler">
                {Array.from({ length: score.meter.beats }, (_, i) => (
                  <span key={i}>{i + 1}</span>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
