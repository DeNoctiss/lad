import type { TabScore } from "../../../lib/tabTypes";
import { durationTicks } from "../../../lib/tablature";
import {
  pianoBlack,
  pianoMidi,
  pianoName,
  pianoLabel,
} from "../../../lib/piano";
import { rhythm, eventLabel } from "./pianoShared";

export function PianoRoll({
  score,
  start,
  end,
  barWidth,
  capacity,
  pitches,
  high,
  barIndex,
  eventIndex,
  playingMeasure,
  playingEvent,
  onLaneClick,
  onPick,
}: {
  score: TabScore;
  start: number;
  end: number;
  barWidth: number;
  capacity: number;
  pitches: number[];
  high: number;
  barIndex: number;
  eventIndex: number;
  playingMeasure?: number;
  playingEvent?: number;
  onLaneClick?: (measure: number, event: number, lane: string) => void;
  onPick: (measure: number, event: number) => void;
}) {
  const row = 19;
  const top = 32;
  const rollHeight = top + pitches.length * row;
  const pick = onPick;
  return (
    <div
      className="piano-roll"
      role="region"
      tabIndex={0}
      aria-label="Пиано-ролл, время вправо, высота клавиш вверх"
    >
      <div className="piano-roll-content">
        <div className="piano-roll-keys">
          <div style={{ height: top }}>Клавиши</div>
          {pitches.map((midi) => (
            <div
              key={midi}
              className={pianoBlack(midi) ? "piano-roll-key-black" : ""}
              style={{ height: row }}
            >
              {pianoName(midi)}
            </div>
          ))}
        </div>
        <svg
          className="piano-roll-canvas"
          width={barWidth * (end - start)}
          height={rollHeight}
          role="group"
          aria-label="Ноты на временной сетке"
        >
          {pitches.map((midi, index) => (
            <rect
              key={midi}
              x={0}
              y={top + index * row}
              width={barWidth * (end - start)}
              height={row}
              fill={pianoBlack(midi) ? "#eef0ea" : "#fffefa"}
              stroke="#e2e8dc"
              strokeWidth={0.5}
            />
          ))}
          {score.measures.slice(start, end).map((bar, offset) => {
            const m = start + offset;
            let elapsed = 0;
            return (
              <g key={bar.id} className="piano-roll-measure" data-measure={m}>
                <text
                  x={offset * barWidth + 8}
                  y={20}
                  className="piano-roll-bar-label"
                >
                  Такт {m + 1}
                </text>
                {Array.from({ length: score.meter.beats + 1 }, (_, beat) => (
                  <line
                    key={beat}
                    x1={
                      offset * barWidth + (beat / score.meter.beats) * barWidth
                    }
                    x2={
                      offset * barWidth + (beat / score.meter.beats) * barWidth
                    }
                    y1={top}
                    y2={rollHeight}
                    stroke={
                      beat === 0 || beat === score.meter.beats
                        ? "#7f9570"
                        : "#d8e2d0"
                    }
                    strokeDasharray={
                      beat === 0 || beat === score.meter.beats
                        ? undefined
                        : "3 4"
                    }
                  />
                ))}
                {bar.events.map((event, index) => {
                  const x = offset * barWidth + (elapsed / capacity) * barWidth;
                  const length = (durationTicks(event) / capacity) * barWidth;
                  elapsed += durationTicks(event);
                  return (
                    <g key={event.id}>
                      <rect
                        className="piano-roll-event-target"
                        x={x}
                        y={top}
                        width={length}
                        height={rollHeight - top}
                        fill="transparent"
                        role="button"
                        tabIndex={0}
                        aria-label={eventLabel(event, m, index)}
                        onClick={(click) => {
                          if (onLaneClick) {
                            const svg = click.currentTarget.ownerSVGElement!;
                            const bounds = svg.getBoundingClientRect();
                            const pitch =
                              pitches[
                                Math.floor(
                                  (click.clientY - bounds.top - top) / row,
                                )
                              ];
                            if (pitch !== undefined)
                              onLaneClick(m, index, pianoName(pitch));
                          } else pick(m, index);
                        }}
                        onKeyDown={(key) => {
                          if (key.key === "Enter" || key.key === " ") {
                            key.preventDefault();
                            pick(m, index);
                          }
                        }}
                      />
                      {event.notes.map((note) => (
                        <g
                          key={note.lane}
                          className={`piano-roll-note${m === barIndex && index === eventIndex ? " piano-roll-note-selected" : ""}${m === playingMeasure && index === playingEvent ? " piano-roll-note-playing" : ""}`}
                          role="button"
                          tabIndex={0}
                          aria-label={`${eventLabel(event, m, index)}, клавиша ${pianoLabel(note.lane)}`}
                          onClick={() => pick(m, index)}
                          onKeyDown={(key) => {
                            if (key.key === "Enter" || key.key === " ") {
                              key.preventDefault();
                              pick(m, index);
                            }
                          }}
                        >
                          <rect
                            x={x + 1}
                            y={top + (high - pianoMidi(note.lane)!) * row + 2}
                            width={Math.max(3, length - 2)}
                            height={row - 4}
                            rx={3}
                          />
                          <text
                            x={x + 5}
                            y={top + (high - pianoMidi(note.lane)!) * row + 13}
                          >
                            {note.lane}
                            {note.link === "tie" ? " ↔" : ""}
                          </text>
                          <title>
                            {pianoLabel(note.lane)} · {rhythm(event)}
                            {note.effects.length
                              ? ` · ${note.effects.join(", ")}`
                              : ""}
                          </title>
                        </g>
                      ))}
                      {!event.notes.length && (
                        <text
                          x={x + 5}
                          y={top + 14}
                          className="piano-roll-rest"
                        >
                          Пауза {rhythm(event)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
