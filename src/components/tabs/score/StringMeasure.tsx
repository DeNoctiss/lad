import { useId } from "react";
import { durationTicks, measureTicks } from "../../../lib/tablature";
import {
  LEFT,
  RIGHT,
  TOP,
  ROW,
  effectLabels,
  effectNames,
  linkLabels,
  linkNames,
  instruments,
  activate,
  eventDescription,
  eventOnsets,
  usedTicks,
  canConnect,
  orderedLanes,
  remainingLabel,
} from "./scoreShared";
import type { TabScoreViewProps } from "./scoreShared";
import { Rhythm } from "./Rhythm";

export function StringMeasure({
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
        const palmMuted = event.notes.some((note) =>
          note.effects.includes("pm"),
        );
        const previousMoment =
          eventIndex > 0 ? measure.events[eventIndex - 1] : previousEvent;
        const pmContinues = Boolean(
          palmMuted &&
            previousMoment?.notes.some((note) => note.effects.includes("pm")),
        );
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
            {palmMuted && (
              <g className="tab-score-pm" aria-hidden="true">
                {!pmContinues && (
                  <text
                    x={x}
                    y={15}
                    textAnchor="middle"
                    className="tab-score-pm-label"
                  >
                    P.M.
                  </text>
                )}
                <line
                  x1={pmContinues ? x - 10 : x + 20}
                  x2={Math.max(
                    (pmContinues ? x - 10 : x + 20) + 6,
                    x + Math.max(24, slotWidth) - 2,
                  )}
                  y1={11}
                  y2={11}
                  className="tab-score-pm-line"
                />
              </g>
            )}
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
                            .filter(
                              (effect) => effect !== "ghost" && effect !== "pm",
                            )
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
