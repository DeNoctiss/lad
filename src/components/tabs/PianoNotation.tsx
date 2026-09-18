import { useState } from "react";
import type { TabScoreViewProps } from "./TabScoreView";
import { measureTicks } from "../../lib/tablature";
import { pianoLabel, pianoMidi } from "../../lib/piano";
import "../../styles/piano.css";
import { rhythm } from "./piano/pianoShared";
import { PianoKeyboard } from "./piano/PianoKeyboard";
import { KeysStrip } from "./piano/KeysStrip";
import { PianoRoll } from "./piano/PianoRoll";
export { PianoKeyboard };

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
        <KeysStrip
          score={score}
          start={start}
          end={end}
          barWidth={barWidth}
          capacity={capacity}
          barIndex={barIndex}
          eventIndex={eventIndex}
          playingMeasure={playingMeasure}
          playingEvent={playingEvent}
          onPick={pick}
        />
      ) : (
        <PianoRoll
          score={score}
          start={start}
          end={end}
          barWidth={barWidth}
          capacity={capacity}
          pitches={pitches}
          high={high}
          barIndex={barIndex}
          eventIndex={eventIndex}
          playingMeasure={playingMeasure}
          playingEvent={playingEvent}
          onLaneClick={onLaneClick}
          onPick={pick}
        />
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
