import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Music2, Loader2, Pause, Play, Square } from "lucide-react";
import type {
  NoteEffect,
  NoteLink,
  TabEvent,
  TabNote,
  TabScore,
} from "./tabTypes";
import { durationTicks, lanesFor, measureTicks } from "./tablature";
import { TabPlayer, laneLabels } from "./playback";
import "./tabScore.css";
import { PianoNotation } from "./PianoNotation";

export type TabScoreViewProps = {
  score: TabScore;
  selectedMeasure?: number;
  selectedEvent?: number;
  onSelect?: (measure: number, event: number) => void;
  onLaneClick?: (measure: number, event: number, lane: string) => void;
  /** Beats per minute for playback. */
  bpm?: number;
  /** Instrument tuning text, e.g. "E A D G B e". */
  tuning?: string;
  /** Currently playing position (for highlight). */
  playingMeasure?: number;
  playingEvent?: number;
};

const ROW_SIZE = 3;
const LEFT = 56;
const RIGHT = 16;
const TOP = 84;
const ROW = 26;
const effectLabels: Record<NoteEffect, string> = {
  pm: "P.M.",
  v: "~",
  "b0.5": "b½",
  b1: "b1",
  accent: ">",
  ghost: "( )",
  open: "○",
};
const effectNames: Record<NoteEffect, string> = {
  pm: "приглушение ладонью",
  v: "вибрато",
  "b0.5": "бенд на полтона",
  b1: "бенд на тон",
  accent: "акцент",
  ghost: "призрачная нота",
  open: "открытый звук",
};
const linkLabels: Record<NoteLink, string> = {
  h: "H",
  p: "P",
  "/": "/",
  "\\": "\\",
  tie: "лига",
};
const linkNames: Record<NoteLink, string> = {
  h: "хаммер-он",
  p: "пулл-офф",
  "/": "слайд вверх",
  "\\": "слайд вниз",
  tie: "лига продления",
};
const instruments = {
  guitar: "Гитара",
  bass: "Бас-гитара",
  drums: "Ударные",
  piano: "Пианино",
};
const drumNames: Record<string, string> = {
  HH: "Хай-хэт",
  SD: "Малый барабан",
  BD: "Бас-барабан",
  HT: "Высокий том",
  MT: "Средний том",
  LT: "Низкий том",
  CC: "Крэш",
  SP: "Сплэш",
  RD: "Райд",
};
const cymbalLanes = new Set(["HH", "CC", "SP", "RD"]);

function activate(event: KeyboardEvent<SVGElement>, action: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    event.stopPropagation();
    action();
  }
}

function rhythmLabel(event: TabEvent) {
  return `1/${event.duration}${event.dotted ? " ·" : ""}${event.triplet ? " · 3" : ""}`;
}

function eventDescription(event: TabEvent, index: number) {
  const notes = event.notes.length
    ? event.notes
        .map(
          (note) =>
            `${note.lane}: ${note.fret === "x" ? "заглушенный звук" : `лад ${note.fret}`}${note.effects.length ? `, ${note.effects.map((effect) => effectNames[effect]).join(", ")}` : ""}${note.link ? `, ${linkNames[note.link]} к следующему событию` : ""}`,
        )
        .join("; ")
    : "пауза";
  return `Событие ${index + 1}, длительность 1/${event.duration}${event.dotted ? " с точкой" : ""}${event.triplet ? ", триоль" : ""}. ${notes}`;
}

function eventOnsets(events: TabEvent[]) {
  let elapsed = 0;
  return events.map((event) => {
    const onset = elapsed;
    elapsed += durationTicks(event);
    return onset;
  });
}

function usedTicks(events: TabEvent[]) {
  return events.reduce((sum, event) => sum + durationTicks(event), 0);
}

function canConnect(source: TabNote, target: TabNote | undefined) {
  if (!target || !source.link || source.fret === "x" || target.fret === "x")
    return false;
  if (source.link === "tie") return source.fret === target.fret;
  if (source.link === "h" || source.link === "/")
    return target.fret > source.fret;
  return target.fret < source.fret;
}

function orderedLanes(score: TabScore, tuningText?: string) {
  const lanes = [...lanesFor(score.kind)];
  const order =
    score.kind === "drums"
      ? ["CC", "SP", "RD", "HH", "HT", "MT", "SD", "LT", "BD"]
      : score.kind === "bass"
        ? ["G", "D", "A", "E"]
        : ["e", "B", "G", "D", "A", "E"];
  const rank = (lane: { id: string; label: string }) => {
    const exact = order.indexOf(lane.id);
    const label = order.indexOf(lane.label);
    return exact >= 0 ? exact : label >= 0 ? label : lanes.indexOf(lane);
  };
  const sorted = lanes.sort((a, b) => rank(a) - rank(b));
  if (tuningText && (score.kind === "guitar" || score.kind === "bass")) {
    const fallback = new Map(sorted.map((lane) => [lane.id, lane.label]));
    const labels = laneLabels(score.kind, tuningText, fallback);
    return sorted.map((lane) => ({
      ...lane,
      label: labels.get(lane.id) ?? lane.label,
    }));
  }
  return sorted;
}

function remainingLabel(used: number, total: number, beats: number) {
  if (used > total) return "Такт переполнен — исправьте длительности";
  if (used === total) return "Такт заполнен";
  const remaining = (total - used) / (total / beats);
  return `Свободно ${Number(remaining.toFixed(2)).toLocaleString("ru-RU")} доли`;
}

function Rhythm({ event, x }: { event: TabEvent; x: number }) {
  const flags = event.duration === 16 ? 2 : event.duration === 8 ? 1 : 0;
  return (
    <g className="tab-score-rhythm" aria-hidden="true">
      {event.notes.length === 0 ? (
        <g className="tab-score-rest-symbol">
          {event.duration <= 2 ? (
            <>
              <path d={`M ${x - 12} 42 H ${x + 12}`} />
              <rect
                x={x - 7}
                y={event.duration === 1 ? 42 : 36}
                width={14}
                height={6}
                className="tab-score-head"
              />
            </>
          ) : event.duration === 4 ? (
            <path d={`M ${x + 3} 27 l -7 11 8 10 q -12 -3 -7 12`} />
          ) : (
            <>
              <path d={`M ${x + 7} 29 L ${x - 2} 61`} />
              {Array.from(
                { length: event.duration === 16 ? 2 : 1 },
                (_, flag) => (
                  <g key={flag}>
                    <path
                      d={`M ${x + 6 - flag * 2} ${33 + flag * 10} Q ${x - 1} ${43 + flag * 10} ${x - 7} ${35 + flag * 10}`}
                    />
                    <circle
                      cx={x - 7}
                      cy={35 + flag * 10}
                      r={3}
                      className="tab-score-head"
                    />
                  </g>
                ),
              )}
            </>
          )}
        </g>
      ) : (
        <>
          <ellipse
            cx={x}
            cy={53}
            rx={5}
            ry={3.5}
            transform={`rotate(-20 ${x} 53)`}
            className={
              event.duration <= 2 ? "tab-score-head-open" : "tab-score-head"
            }
          />
          {event.duration !== 1 && <path d={`M ${x + 4} 52 V 26`} />}
          {Array.from({ length: flags }, (_, flag) => (
            <path key={flag} d={`M ${x + 4} ${26 + flag * 7} q 13 5 7 14`} />
          ))}
        </>
      )}
      {event.dotted && (
        <circle cx={x + 12} cy={51} r={2} className="tab-score-head" />
      )}
      {event.triplet && (
        <text x={x} y={19} textAnchor="middle">
          3
        </text>
      )}
      <text x={x} y={75} textAnchor="middle" className="tab-score-duration">
        {rhythmLabel(event)}
      </text>
    </g>
  );
}

function StringMeasure({
  score,
  measureIndex,
  width,
  selectedMeasure,
  selectedEvent,
  onSelect,
  onLaneClick,
  playingMeasure,
  playingEvent,
  tuning,
}: TabScoreViewProps & { measureIndex: number; width: number }) {
  const id = useId();
  const measure = score.measures[measureIndex];
  const lanes = orderedLanes(score, tuning);
  const total = measureTicks(score.meter);
  const used = usedTicks(measure.events);
  const onsets = eventOnsets(measure.events);
  const available = width - LEFT - RIGHT;
  const position = (tick: number) => LEFT + (tick / total) * available;
  const height = TOP + (lanes.length - 1) * ROW + 69;
  const interactive = Boolean(onSelect || onLaneClick);
  const previous = score.measures[measureIndex - 1];
  const previousEvent = previous?.events.at(-1);
  const beatSize = total / score.meter.beats;
  const subdivisions = score.meter.unit === 4 ? 2 : 1;
  const visibleWidth = Math.max(width, position(used) + RIGHT);
  return (
    <svg
      className="tab-score-staff"
      width={visibleWidth}
      height={height}
      viewBox={`0 0 ${visibleWidth} ${height}`}
      role={interactive ? "group" : "img"}
      aria-labelledby={`${id}-title ${id}-desc`}
    >
      <title id={`${id}-title`}>
        {instruments[score.kind]}, такт {measureIndex + 1}, размер{" "}
        {score.meter.beats}/{score.meter.unit}
      </title>
      <desc id={`${id}-desc`}>
        {measure.events.length
          ? measure.events.map(eventDescription).join(". ")
          : "Пустой такт. Добавьте ноту или паузу в редакторе."}{" "}
        {remainingLabel(used, total, score.meter.beats)}.{" "}
        {interactive
          ? "Выберите событие или струну клавишами Enter или Пробел."
          : "Струны сверху вниз от высокой к низкой. Расстояния соответствуют музыкальному времени."}
      </desc>
      {used < total && (
        <rect
          x={position(used)}
          y={88}
          width={position(total) - position(used)}
          height={height - 118}
          className="tab-score-unused"
        />
      )}
      {Array.from(
        { length: score.meter.beats * subdivisions + 1 },
        (_, tick) => {
          const x = position((tick * beatSize) / subdivisions);
          const strong = tick % subdivisions === 0;
          return (
            <g key={tick} aria-hidden="true">
              <line
                x1={x}
                x2={x}
                y1={88}
                y2={height - 39}
                className={strong ? "tab-score-beat" : "tab-score-subbeat"}
              />
              {tick < score.meter.beats * subdivisions && (
                <text
                  x={x}
                  y={height - 16}
                  className="tab-score-beat-label"
                  textAnchor="middle"
                >
                  {strong ? tick / subdivisions + 1 : "и"}
                </text>
              )}
            </g>
          );
        },
      )}
      {lanes.map((lane, laneIndex) => (
        <g key={lane.id} aria-hidden="true">
          <text
            x={22}
            y={TOP + laneIndex * ROW + 5}
            className="tab-score-string-label"
          >
            {lane.label}
          </text>
          <line
            x1={0}
            x2={width}
            y1={TOP + laneIndex * ROW}
            y2={TOP + laneIndex * ROW}
            className="tab-score-string"
            style={{ strokeWidth: 1 + laneIndex * 0.13 }}
          />
        </g>
      ))}
      <path
        d={`M 0 ${TOP} V ${TOP + (lanes.length - 1) * ROW} M ${width} ${TOP} V ${TOP + (lanes.length - 1) * ROW}`}
        className="tab-score-barline"
        aria-hidden="true"
      />
      {measure.events.map((event, eventIndex) => {
        const x = position(onsets[eventIndex]);
        const selected =
          selectedMeasure === measureIndex && selectedEvent === eventIndex;
        const playing =
          playingMeasure === measureIndex && playingEvent === eventIndex;
        const slotWidth = Math.max(
          24,
          (durationTicks(event) / total) * available,
        );
        const next =
          measure.events[eventIndex + 1] ??
          (used === total
            ? score.measures[measureIndex + 1]?.events[0]
            : undefined);
        const crossBar = eventIndex === measure.events.length - 1;
        return (
          <g
            key={event.id}
            className={`tab-score-event${selected ? " tab-score-event-selected" : ""}${playing ? " tab-score-event-playing" : ""}`}
          >
            <g
              className={
                onSelect
                  ? "tab-score-event-target tab-score-interactive"
                  : "tab-score-event-target"
              }
              role={onSelect ? "button" : undefined}
              tabIndex={onSelect ? 0 : undefined}
              aria-label={
                onSelect
                  ? `Такт ${measureIndex + 1}. ${eventDescription(event, eventIndex)}`
                  : undefined
              }
              aria-pressed={onSelect ? selected : undefined}
              onClick={
                onSelect ? () => onSelect(measureIndex, eventIndex) : undefined
              }
              onKeyDown={
                onSelect
                  ? (key) =>
                      activate(key, () => onSelect(measureIndex, eventIndex))
                  : undefined
              }
            >
              <title>{eventDescription(event, eventIndex)}</title>
              <rect
                x={x - 15}
                y={10}
                width={Math.max(30, slotWidth - 2)}
                height={height - 46}
                rx={7}
                className="tab-score-event-focus"
              />
              {playing && (
                <line
                  x1={x}
                  x2={x}
                  y1={18}
                  y2={height - 40}
                  className="tab-score-playhead"
                  aria-hidden="true"
                />
              )}
              <Rhythm event={event} x={x} />
              {event.notes.length === 0 && (
                <text
                  x={x + 6}
                  y={TOP + (ROW * (lanes.length - 1)) / 2 + 6}
                  textAnchor="middle"
                  className="tab-score-rest-label"
                >
                  пауза
                </text>
              )}
            </g>
            {lanes.map((lane, laneIndex) => {
              const note = event.notes.find(
                (candidate) => candidate.lane === lane.id,
              );
              const y = TOP + laneIndex * ROW;
              const action = onLaneClick
                ? () => onLaneClick(measureIndex, eventIndex, lane.id)
                : onSelect
                  ? () => onSelect(measureIndex, eventIndex)
                  : undefined;
              const incoming =
                eventIndex === 0 &&
                previous &&
                usedTicks(previous.events) === total
                  ? previousEvent?.notes.find(
                      (candidate) =>
                        candidate.lane === lane.id &&
                        canConnect(candidate, note),
                    )
                  : undefined;
              const validLink =
                note &&
                canConnect(
                  note,
                  next?.notes.find((candidate) => candidate.lane === lane.id),
                );
              const nextX = crossBar
                ? position(total) + 12
                : position(onsets[eventIndex + 1]);
              return (
                <g key={lane.id}>
                  {incoming?.link && (
                    <text
                      x={LEFT - 27}
                      y={y - 15}
                      textAnchor="middle"
                      className="tab-score-link-label"
                      aria-hidden="true"
                    >
                      {linkLabels[incoming.link]} ←{measureIndex}
                    </text>
                  )}
                  {note?.link && (
                    <g className="tab-score-link" aria-hidden="true">
                      <title>
                        {validLink
                          ? `${linkNames[note.link]}${crossBar ? ` в такт ${measureIndex + 2}` : ""}`
                          : `${linkNames[note.link]}: нет подходящей следующей ноты`}
                      </title>
                      {validLink &&
                        (note.link === "/" || note.link === "\\" ? (
                          <path
                            d={`M ${x + 14} ${y + (note.link === "/" ? 8 : -8)} L ${nextX - 14} ${y + (note.link === "/" ? -8 : 8)}`}
                          />
                        ) : (
                          <path
                            d={`M ${x + 12} ${y - 7} Q ${(x + nextX) / 2} ${y - 31} ${nextX - 12} ${y - 7}`}
                          />
                        ))}
                      <text
                        x={validLink ? (x + nextX) / 2 : x + 19}
                        y={y - 17}
                        textAnchor={validLink ? "middle" : "start"}
                        className="tab-score-link-label"
                      >
                        {linkLabels[note.link]}
                        {validLink
                          ? crossBar
                            ? ` → т. ${measureIndex + 2}`
                            : ""
                          : "?"}
                      </text>
                    </g>
                  )}
                  <g
                    className={`tab-score-note${action ? " tab-score-interactive" : ""}${note ? " tab-score-note-filled" : ""}`}
                    role={action ? "button" : undefined}
                    tabIndex={action ? 0 : undefined}
                    aria-label={
                      action
                        ? `Такт ${measureIndex + 1}, событие ${eventIndex + 1}, струна ${lane.label}: ${note ? `${note.fret === "x" ? "заглушено" : `лад ${note.fret}`}${note.effects.length ? `, ${note.effects.map((effect) => effectNames[effect]).join(", ")}` : ""}` : "нет ноты"}. ${onLaneClick ? "Изменить ноту" : "Выбрать событие"}`
                        : undefined
                    }
                    onClick={
                      action
                        ? (click) => {
                            click.stopPropagation();
                            action();
                          }
                        : undefined
                    }
                    onKeyDown={
                      action ? (key) => activate(key, action) : undefined
                    }
                  >
                    {action && (
                      <rect
                        x={x - 16}
                        y={y - 12}
                        width={32}
                        height={24}
                        rx={5}
                        className="tab-score-lane-target"
                      />
                    )}
                    {note && (
                      <>
                        <rect
                          x={x - 13}
                          y={y - 11}
                          width={26}
                          height={22}
                          rx={4}
                          className="tab-score-fret-background"
                        />
                        <text
                          x={x}
                          y={y + 6}
                          textAnchor="middle"
                          className="tab-score-fret"
                        >
                          {note.effects.includes("ghost")
                            ? `(${note.fret})`
                            : note.fret}
                        </text>
                        <text
                          x={x}
                          y={y + 17}
                          textAnchor="middle"
                          className="tab-score-effect"
                        >
                          {note.effects
                            .filter((effect) => effect !== "ghost")
                            .map((effect) => effectLabels[effect])
                            .join(" ")}
                        </text>
                      </>
                    )}
                  </g>
                </g>
              );
            })}
          </g>
        );
      })}
      {measure.events.length === 0 && (
        <text
          x={width / 2}
          y={TOP + ROW * 2 + 17}
          textAnchor="middle"
          className="tab-score-empty-svg"
        >
          Пустой такт · добавьте ноту или паузу
        </text>
      )}
    </svg>
  );
}

function DrumMeasure({
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

export function TabScoreView({
  score,
  selectedMeasure,
  selectedEvent,
  onSelect,
  onLaneClick,
  bpm = 92,
  tuning = "E A D G B e",
}: TabScoreViewProps) {
  const id = useId();
  const stripRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<TabPlayer | null>(null);
  const [playerState, setPlayerState] = useState<
    "stopped" | "loading" | "playing" | "paused"
  >("stopped");
  const [playhead, setPlayhead] = useState<{
    measure: number;
    event: number;
  } | null>(null);
  const measureCount = score.measures.length;
  const multiRow = measureCount > ROW_SIZE;

  useEffect(
    () => () => {
      playerRef.current?.stop();
    },
    [],
  );

  const hasNotes = score.measures.some((m) =>
    m.events.some((e) => e.notes.length > 0),
  );

  function togglePlay() {
    const player = (playerRef.current ??= new TabPlayer());
    if (playerState === "playing") {
      player.pause();
      return;
    }
    if (playerState === "paused") {
      player.resume();
      return;
    }
    if (playerState === "loading") return;
    void player.play(score, {
      bpm,
      tuningText: tuning,
      onEvent: (measure, event) => {
        setPlayhead(
          measure === null || event === null ? null : { measure, event },
        );
      },
      onStateChange: setPlayerState,
    });
  }

  function stopPlayback() {
    playerRef.current?.stop();
  }

  useEffect(() => {
    if (selectedMeasure === undefined) return;
    const strip = stripRef.current;
    const bar = strip?.querySelector<HTMLElement>(
      `[data-measure="${selectedMeasure}"]`,
    );
    if (strip && bar)
      bar.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [selectedMeasure]);

  useEffect(() => {
    if (!playhead) return;
    const strip = stripRef.current;
    const bar = strip?.querySelector<HTMLElement>(
      `[data-measure="${playhead.measure}"]`,
    );
    if (strip && bar)
      bar.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [playhead]);
  function jumpToMeasure(value: number) {
    const strip = stripRef.current;
    const bar = strip?.querySelector<HTMLElement>(
      `[data-measure="${value - 1}"]`,
    );
    if (strip && bar) bar.scrollIntoView({ block: "start", inline: "start" });
  }
  const total = measureTicks(score.meter);
  let shortest = total / score.meter.beats / 2;
  for (const measure of score.measures)
    for (const event of measure.events) {
      const ticks = durationTicks(event);
      if (ticks > 0) shortest = Math.min(shortest, ticks);
    }
  const width = Math.max(320, LEFT + RIGHT + Math.ceil(total / shortest) * 32);
  const props = {
    score,
    selectedMeasure,
    selectedEvent,
    onSelect,
    onLaneClick,
    width,
    playingMeasure: playhead?.measure,
    playingEvent: playhead?.event,
    tuning,
  };
  return (
    <section className="tab-score-view" aria-labelledby={`${id}-heading`}>
      <header className="tab-score-header">
        <div className="tab-score-heading">
          <span className="tab-score-icon">
            <Music2 size={20} aria-hidden="true" />
          </span>
          <div>
            <h3 id={`${id}-heading`}>
              {instruments[score.kind]} <span>Табулатура</span>
            </h3>
            <p>
              {score.meter.beats}/{score.meter.unit} · {measureCount} такт(ов) ·{" "}
              {onSelect || onLaneClick ? "Режим редактирования" : "Просмотр"}
            </p>
          </div>
        </div>
        <div className="tab-score-transport">
          {hasNotes && (
            <>
              <button
                type="button"
                className="btn-icon tab-score-play"
                aria-label={
                  playerState === "playing"
                    ? "Пауза"
                    : playerState === "paused"
                      ? "Продолжить"
                      : playerState === "loading"
                        ? "Загрузка звука"
                        : "Играть"
                }
                disabled={playerState === "loading"}
                onClick={togglePlay}
              >
                {playerState === "loading" ? (
                  <Loader2
                    size={16}
                    className="tab-score-spin"
                    aria-hidden="true"
                  />
                ) : playerState === "playing" ? (
                  <Pause size={16} aria-hidden="true" />
                ) : (
                  <Play size={16} aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                className="btn-icon tab-score-stop"
                aria-label="Стоп"
                disabled={playerState === "stopped"}
                onClick={stopPlayback}
              >
                <Square size={14} aria-hidden="true" />
              </button>
              <span className="tab-score-bpm">{bpm} BPM</span>
            </>
          )}
          {multiRow && (
            <nav className="tab-score-pagination" aria-label="Переход к такту">
              <label htmlFor={`${id}-jump`}>К такту</label>
              <input
                id={`${id}-jump`}
                type="number"
                min={1}
                max={measureCount}
                placeholder="1"
                onBlur={(event) => {
                  const bar = Number(event.currentTarget.value);
                  if (Number.isInteger(bar) && bar >= 1 && bar <= measureCount)
                    jumpToMeasure(bar);
                  else event.currentTarget.value = "";
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    event.currentTarget.blur();
                  }
                }}
              />
              <span className="tab-score-pagination-hint">
                по {ROW_SIZE} в ряд
              </span>
            </nav>
          )}
        </div>
      </header>
      {measureCount === 0 ? (
        <p className="tab-score-empty">
          Пока нет тактов. Создайте первый такт в редакторе.
        </p>
      ) : score.kind === "piano" ? (
        <PianoNotation {...props} start={0} end={measureCount} />
      ) : (
        <div
          className="tab-score-strip"
          ref={stripRef}
          tabIndex={0}
          role="region"
          aria-label="Такты по три в ряд, прокрутка и изменение высоты"
        >
          <div className="tab-score-measures">
            {score.measures.map((measure, measureIndex) => {
              const used = usedTicks(measure.events);
              return (
                <article
                  className={`tab-score-measure${selectedMeasure === measureIndex ? " tab-score-measure-selected" : ""}`}
                  key={measure.id}
                  aria-labelledby={`${id}-measure-${measureIndex}`}
                  data-measure={measureIndex}
                >
                  <div className="tab-score-measure-header">
                    <h4 id={`${id}-measure-${measureIndex}`}>
                      <span className="tab-score-measure-number">
                        {measureIndex + 1}
                      </span>
                      Такт{" "}
                      <span className="tab-score-meter">
                        {score.meter.beats}/{score.meter.unit}
                      </span>
                    </h4>
                    <span
                      className={`tab-score-capacity${used > total ? " tab-score-capacity-error" : ""}`}
                    >
                      {remainingLabel(used, total, score.meter.beats)}
                    </span>
                  </div>
                  <div className="tab-score-scroll">
                    {score.kind === "drums" ? (
                      <DrumMeasure {...props} measureIndex={measureIndex} />
                    ) : (
                      <StringMeasure {...props} measureIndex={measureIndex} />
                    )}
                  </div>
                  {used < total && (
                    <p className="tab-score-measure-hint">
                      {measure.events.length === 0
                        ? "Пустой такт — это ещё не пауза."
                        : "Светлая область не заполнена: добавьте ноты или явные паузы."}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}
      {score.kind !== "piano" && (
        <details className="tab-score-legend">
          <summary>Обозначения и управление</summary>
          {score.kind === "drums" ? (
            <p>
              <strong>Обозначения</strong> · точка — продление на половину · 3 —
              триоль · &gt; — акцент · (удар) — ghost · ⊗ — открытый хай-хэт ·
              дорожки: CC — крэш, SP — сплэш, RD — райд, HH — хай-хэт, HT/MT/LT
              — томы, SD — малый, BD — бочка
            </p>
          ) : (
            <p>
              <strong>Обозначения</strong> · точка — продление на половину · 3 —
              триоль · P.M. — приглушение · ~ — вибрато · b½ / b1 — бенд · &gt;
              — акцент · (нота) — ghost
            </p>
          )}
          {score.kind !== "drums" && (
            <p>
              H — хаммер-он · P — пулл-офф · / и \ — слайды · лига — продление ·
              ? — связь без подходящей следующей ноты. Струны: высокая сверху,
              низкая снизу.
            </p>
          )}
          {(onSelect || onLaneClick) && (
            <p>
              {onLaneClick
                ? score.kind === "drums"
                  ? "Нажмите на ячейку, чтобы изменить удар."
                  : "Нажмите на струну у существующего события, чтобы изменить ноту."
                : "Нажмите на событие, чтобы выбрать его."}{" "}
              Клавиатура: Tab, затем Enter или Пробел.
            </p>
          )}
        </details>
      )}
    </section>
  );
}
