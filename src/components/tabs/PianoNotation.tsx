import { useEffect, useRef, useState } from "react";
import type { TabScoreViewProps } from "./TabScoreView";
import { durationTicks, measureTicks } from "../../lib/tablature";
import {
  pianoBlack,
  pianoKeys,
  pianoLabel,
  pianoMidi,
  pianoName,
} from "../../lib/piano";
import type { TabEvent } from "../../lib/tabTypes";
import "../../styles/piano.css";

function rhythm(event: TabEvent) {
  return `1/${event.duration}${event.dotted ? "." : ""}${event.triplet ? " · 3" : ""}`;
}
function eventLabel(event: TabEvent, bar: number, index: number) {
  return `Такт ${bar + 1}, событие ${index + 1}: ${event.notes.length ? event.notes.map((note) => note.lane).join(", ") : "пауза"}; ${rhythm(event)}`;
}

export function PianoKeyboard({
  notes,
  onKey,
  focusKey = "C4",
}: {
  notes: string[];
  onKey?: (key: string) => void;
  focusKey?: string;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = viewport.current;
    const key = container?.querySelector<HTMLElement>(
      `[data-note="${focusKey}"]`,
    );
    if (container && key)
      container.scrollLeft = Math.max(
        0,
        key.offsetLeft - container.clientWidth / 2 + 14,
      );
  }, [focusKey]);
  let white = 0;
  const positions = pianoKeys.map((key) => ({
    ...key,
    left: key.black ? white * 28 - 9 : white++ * 28,
  }));
  return (
    <div
      className="piano-keyboard-scroll"
      ref={viewport}
      tabIndex={0}
      role="region"
      aria-label="Клавиатура пианино, A0–C8, горизонтальная прокрутка"
    >
      <div className="piano-keyboard" style={{ width: white * 28 }}>
        {positions.map((key) => (
          <button
            type="button"
            key={key.name}
            data-note={key.name}
            className={`piano-key ${key.black ? "piano-key-black" : "piano-key-white"}`}
            style={{ left: key.left }}
            aria-label={`Клавиша ${pianoLabel(key.name)}`}
            aria-pressed={notes.includes(key.name)}
            disabled={!onKey}
            onClick={() => onKey?.(key.name)}
            title={pianoLabel(key.name)}
          >
            <span>{key.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function PianoNotation({
  score,
  start,
  end,
  width,
  selectedMeasure,
  selectedEvent,
  onSelect,
  onLaneClick,
  playingMeasure,
  playingEvent,
}: TabScoreViewProps & { start: number; end: number; width: number }) {
  const [mode, setMode] = useState<"keys" | "roll">("keys");
  const [localSelection, setLocalSelection] = useState({
    measure: start,
    event: 0,
  });
  const controlled = Boolean(onSelect);
  const barIndex = controlled
    ? (selectedMeasure ?? start)
    : localSelection.measure >= start && localSelection.measure < end
      ? localSelection.measure
      : start;
  const eventIndex = controlled ? (selectedEvent ?? -1) : localSelection.event;
  const selected = score.measures[barIndex]?.events[eventIndex];
  const names = selected?.notes.map((note) => note.lane) ?? [];
  const capacity = measureTicks(score.meter);
  const barWidth = Math.max(260, width);
  const pick = (measure: number, event: number) => {
    setLocalSelection({ measure, event });
    onSelect?.(measure, event);
  };
  const pitchValues = score.measures
    .slice(start, end)
    .flatMap((bar) =>
      bar.events.flatMap((event) =>
        event.notes.map((note) => pianoMidi(note.lane)!),
      ),
    );
  const low = Math.max(
    21,
    Math.floor((pitchValues.length ? Math.min(...pitchValues) : 60) / 12) * 12,
  );
  const high = Math.min(
    108,
    Math.ceil(((pitchValues.length ? Math.max(...pitchValues) : 71) + 1) / 12) *
      12 -
      1,
  );
  const pitches = Array.from(
    { length: high - low + 1 },
    (_, index) => high - index,
  );
  const row = 19;
  const top = 32;
  const rollHeight = top + pitches.length * row;
  return (
    <div className="piano-notation">
      <div
        className="piano-display-switch"
        role="group"
        aria-label="Отображение пианино"
      >
        <button
          type="button"
          aria-pressed={mode === "keys"}
          onClick={() => setMode("keys")}
        >
          Клавиши
        </button>
        <button
          type="button"
          aria-pressed={mode === "roll"}
          onClick={() => setMode("roll")}
        >
          Пиано-ролл
        </button>
        <span>Одни ноты — два вида</span>
      </div>
      {mode === "keys" ? (
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
                              <span
                                key={note.lane}
                                title={pianoLabel(note.lane)}
                              >
                                {note.lane}
                                {note.link === "tie" ? " ↔" : ""}
                                {note.effects.includes("accent") ? " >" : ""}
                                {note.effects.includes("ghost")
                                  ? " (тихо)"
                                  : ""}
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
      ) : (
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
                  <g
                    key={bar.id}
                    className="piano-roll-measure"
                    data-measure={m}
                  >
                    <text
                      x={offset * barWidth + 8}
                      y={20}
                      className="piano-roll-bar-label"
                    >
                      Такт {m + 1}
                    </text>
                    {Array.from(
                      { length: score.meter.beats + 1 },
                      (_, beat) => (
                        <line
                          key={beat}
                          x1={
                            offset * barWidth +
                            (beat / score.meter.beats) * barWidth
                          }
                          x2={
                            offset * barWidth +
                            (beat / score.meter.beats) * barWidth
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
                      ),
                    )}
                    {bar.events.map((event, index) => {
                      const x =
                        offset * barWidth + (elapsed / capacity) * barWidth;
                      const length =
                        (durationTicks(event) / capacity) * barWidth;
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
                                const svg =
                                  click.currentTarget.ownerSVGElement!;
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
                                y={
                                  top + (high - pianoMidi(note.lane)!) * row + 2
                                }
                                width={Math.max(3, length - 2)}
                                height={row - 4}
                                rx={3}
                              />
                              <text
                                x={x + 5}
                                y={
                                  top +
                                  (high - pianoMidi(note.lane)!) * row +
                                  13
                                }
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
      )}
      <div className="piano-selection-info">
        <strong>
          {selected
            ? `Такт ${barIndex + 1} · ${rhythm(selected)}`
            : "Новый момент"}
        </strong>
        <span>
          {selected
            ? names.length
              ? names.map(pianoLabel).join(" / ")
              : "Пауза — клавиши не нажимаются"
            : onLaneClick
              ? "Нажмите клавишу, чтобы добавить первую ноту"
              : "Выберите событие в ленте"}
        </span>
      </div>
      <PianoKeyboard
        notes={names}
        focusKey={names[0] ?? "C4"}
        onKey={
          onLaneClick
            ? (key) => onLaneClick(barIndex, eventIndex, key)
            : undefined
        }
      />
      <p className="piano-help">
        C4 — среднее до. # — чёрная клавиша (диез), цифра — октава.{" "}
        {onLaneClick
          ? "Клик по клавише включает или выключает её в выбранном моменте. Для следующего созвучия нажмите «Новый момент»."
          : "Выберите группу нот — клавиатура подсветит все клавиши этого момента."}{" "}
        {mode === "roll" &&
          "Длина прямоугольника соответствует длительности ноты; прокрутка по высоте доступна для широкого диапазона."}
      </p>
    </div>
  );
}
