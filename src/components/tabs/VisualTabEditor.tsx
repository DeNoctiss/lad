import { useState } from "react";
import { uid } from "../../lib/model";
import {
  durationTicks,
  lanesFor,
  measureTicks,
  scoreIssues,
} from "../../lib/tablature";
import { TabScoreView } from "./TabScoreView";
import type {
  NoteEffect,
  NoteLink,
  TabEvent,
  TabMeasure,
  TabNote,
  TabScore,
} from "../../lib/tabTypes";
import "../../styles/visualTabEditor.css";

type Props = { score: TabScore; onChange: (score: TabScore) => void };
type Rhythm = Pick<TabEvent, "duration" | "dotted" | "triplet">;

const durations: { value: TabEvent["duration"]; label: string }[] = [
  { value: 1, label: "Целая" },
  { value: 2, label: "Половинная" },
  { value: 4, label: "Четверть" },
  { value: 8, label: "Восьмая" },
  { value: 16, label: "Шестнадцатая" },
];
const effects: { value: NoteEffect; label: string }[] = [
  { value: "pm", label: "pm · глушение" },
  { value: "v", label: "v · вибрато" },
  { value: "b0.5", label: "b0.5 · бенд ½ тона" },
  { value: "b1", label: "b1 · бенд 1 тон" },
  { value: "accent", label: "Акцент" },
  { value: "ghost", label: "Призрачная нота" },
  { value: "open", label: "Открытый хай-хэт" },
];
const links: { value: NoteLink | ""; label: string }[] = [
  { value: "", label: "Нет" },
  { value: "h", label: "h · hammer-on" },
  { value: "p", label: "p · pull-off" },
  { value: "/", label: "/ · слайд вверх" },
  { value: "\\", label: "\\ · слайд вниз" },
  { value: "tie", label: "tie · лига" },
];

export function VisualTabEditor(props: Props) {
  return <VisualTabEditorBody key={props.score.kind} {...props} />;
}

function VisualTabEditorBody({ score, onChange }: Props) {
  const drums = score.kind === "drums";
  const piano = score.kind === "piano";
  const lanes = lanesFor(score.kind);
  const [measureId, setMeasureId] = useState(score.measures[0]?.id);
  const [eventId, setEventId] = useState<string>();
  const [laneId, setLaneId] = useState(piano ? "C4" : (lanes[0]?.id ?? ""));
  const [rhythm, setRhythm] = useState<Rhythm>({
    duration: drums ? 8 : 4,
    dotted: false,
    triplet: false,
  });
  const [fret, setFret] = useState<TabNote["fret"]>(0);
  const [noteEffects, setNoteEffects] = useState<NoteEffect[]>([]);
  const [noteLink, setNoteLink] = useState<NoteLink | "">("");
  const measureIndex = Math.max(
    0,
    score.measures.findIndex((item) => item.id === measureId),
  );
  const measure = score.measures[measureIndex];
  const eventIndex =
    measure?.events.findIndex((item) => item.id === eventId) ?? -1;
  const selectedEvent = measure?.events[eventIndex];
  const lane = lanes.some((item) => item.id === laneId)
    ? laneId
    : (lanes[0]?.id ?? "");
  const selectedNote = selectedEvent?.notes.find((note) => note.lane === lane);
  const currentRhythm: Rhythm = selectedEvent ?? rhythm;
  const currentFret = selectedNote?.fret ?? fret;
  const currentEffects = selectedNote?.effects ?? noteEffects;
  const currentLink = selectedNote?.link ?? (selectedNote ? "" : noteLink);
  const issues = scoreIssues(score);
  const usedTicks =
    measure?.events.reduce((total, event) => total + durationTicks(event), 0) ??
    0;
  const capacity = measureTicks(score.meter);
  const visibleEffects = effects.filter(({ value }) =>
    piano
      ? value === "accent" || value === "ghost"
      : drums
        ? value === "accent" ||
          value === "ghost" ||
          (value === "open" && lane.toUpperCase() === "HH")
        : value !== "open",
  );

  function updateMeasure(
    index: number,
    change: (previous: TabMeasure) => TabMeasure,
  ) {
    onChange({
      ...score,
      measures: score.measures.map((item, itemIndex) =>
        itemIndex === index ? change(item) : item,
      ),
    });
  }

  function updateEvent(
    index: number,
    change: (previous: TabEvent) => TabEvent,
    barIndex = measureIndex,
  ) {
    updateMeasure(barIndex, (previous) => ({
      ...previous,
      events: previous.events.map((item, itemIndex) =>
        itemIndex === index ? change(item) : item,
      ),
    }));
  }

  function rememberNote(note: TabNote) {
    setLaneId(note.lane);
    setFret(note.fret);
    setNoteEffects([...note.effects]);
    setNoteLink(note.link ?? "");
  }

  function select(barIndex: number, momentIndex?: number) {
    const bar = score.measures[barIndex];
    if (!bar) return;
    const moment =
      momentIndex === undefined ? undefined : bar.events[momentIndex];
    setMeasureId(bar.id);
    setEventId(moment?.id);
    if (moment) {
      setRhythm({
        duration: moment.duration,
        dotted: moment.dotted,
        triplet: moment.triplet,
      });
      const note =
        moment.notes.find((item) => item.lane === lane) ?? moment.notes[0];
      if (note) rememberNote(note);
    }
  }

  function changeRhythm(patch: Partial<Rhythm>) {
    const next = {
      duration: currentRhythm.duration,
      dotted: currentRhythm.dotted,
      triplet: currentRhythm.triplet,
      ...patch,
    };
    setRhythm(next);
    if (selectedEvent)
      updateEvent(eventIndex, (previous) => ({ ...previous, ...next }));
  }

  function allowedEffects(values: NoteEffect[], targetLane: string) {
    return values.filter((effect) =>
      piano
        ? effect === "accent" || effect === "ghost"
        : drums
          ? effect === "accent" ||
            effect === "ghost" ||
            (effect === "open" && targetLane.toUpperCase() === "HH")
          : effect !== "open",
    );
  }

  function makeNote(targetLane = lane): TabNote {
    return {
      lane: targetLane,
      fret: piano ? 0 : drums ? "x" : currentFret,
      effects: allowedEffects(currentEffects, targetLane),
      ...(!drums && currentLink ? { link: currentLink } : {}),
    };
  }

  function addEvent(rest: boolean) {
    if (!measure || measure.events.length >= 64) return;
    const moment: TabEvent = {
      id: uid(),
      duration: currentRhythm.duration,
      dotted: currentRhythm.dotted,
      triplet: currentRhythm.triplet,
      notes: rest ? [] : [makeNote()],
    };
    if (selectedEvent && moment.notes[0]) delete moment.notes[0].link;
    setNoteLink("");
    updateMeasure(measureIndex, (previous) => ({
      ...previous,
      events: [...previous.events, moment],
    }));
    setEventId(moment.id);
    setMeasureId(measure.id);
    setRhythm({
      duration: moment.duration,
      dotted: moment.dotted,
      triplet: moment.triplet,
    });
  }

  function changeSelectedNote(change: (previous: TabNote) => TabNote) {
    if (!selectedEvent || !selectedNote) return;
    updateEvent(eventIndex, (previous) => ({
      ...previous,
      notes: previous.notes.map((note) =>
        note.lane === lane ? change(note) : note,
      ),
    }));
  }

  function chooseLane(nextLane: string) {
    setLaneId(nextLane);
    const note = selectedEvent?.notes.find((item) => item.lane === nextLane);
    if (note) rememberNote(note);
  }

  function changeFret(next: TabNote["fret"]) {
    setFret(next);
    changeSelectedNote((previous) => ({ ...previous, fret: next }));
  }

  function toggleEffect(effect: NoteEffect, checked: boolean) {
    let next = allowedEffects(currentEffects, lane).filter(
      (item) => item !== effect,
    );
    if (checked) {
      if (effect === "b0.5" || effect === "b1")
        next = next.filter((item) => item !== "b0.5" && item !== "b1");
      next = [...next, effect];
    }
    setNoteEffects(next);
    changeSelectedNote((previous) => ({ ...previous, effects: next }));
  }

  function addToMoment() {
    if (
      !selectedEvent ||
      selectedNote ||
      selectedEvent.notes.length >= (piano ? 10 : 6)
    )
      return;
    updateEvent(eventIndex, (previous) => ({
      ...previous,
      notes: [...previous.notes, makeNote()],
    }));
  }

  function removeNote(targetLane: string) {
    if (!selectedEvent) return;
    updateEvent(eventIndex, (previous) => ({
      ...previous,
      notes: previous.notes.filter((note) => note.lane !== targetLane),
    }));
  }

  function laneClick(
    barIndex: number,
    momentIndex: number,
    targetLane: string,
  ) {
    const moment = score.measures[barIndex]?.events[momentIndex];
    if (!lanes.some((item) => item.id === targetLane)) return;
    if (piano && !moment && momentIndex === -1) {
      const bar = score.measures[barIndex];
      if (!bar || bar.events.length >= 64) return;
      const next: TabEvent = {
        id: uid(),
        ...rhythm,
        notes: [
          {
            lane: targetLane,
            fret: 0,
            effects: allowedEffects(noteEffects, targetLane),
          },
        ],
      };
      updateMeasure(barIndex, (previous) => ({
        ...previous,
        events: [...previous.events, next],
      }));
      setMeasureId(bar.id);
      setEventId(next.id);
      setLaneId(targetLane);
      setNoteLink("");
      return;
    }
    if (!moment) return;
    if (
      piano &&
      moment.notes.length >= 10 &&
      !moment.notes.some((note) => note.lane === targetLane)
    )
      return;
    select(barIndex, momentIndex);
    setLaneId(targetLane);
    const existing = moment.notes.find((note) => note.lane === targetLane);
    if (existing && !drums && !piano) {
      rememberNote(existing);
      return;
    }
    updateEvent(
      momentIndex,
      (previous) => ({
        ...previous,
        notes: existing
          ? previous.notes.filter((note) => note.lane !== targetLane)
          : [...previous.notes, makeNote(targetLane)],
      }),
      barIndex,
    );
  }

  function addMeasure(copy = false) {
    if (score.measures.length >= 128) return;
    const next: TabMeasure = {
      id: uid(),
      events:
        copy && measure
          ? measure.events.map((event) => ({
              ...event,
              id: uid(),
              notes: event.notes.map((note) => ({
                ...note,
                effects: [...note.effects],
              })),
            }))
          : [],
    };
    const measures = [...score.measures];
    measures.splice(measureIndex + 1, 0, next);
    onChange({ ...score, measures });
    setMeasureId(next.id);
    setEventId(undefined);
  }

  function removeMeasure() {
    if (!measure || score.measures.length <= 1) return;
    if (
      measure.events.length &&
      !window.confirm(`Удалить такт ${measureIndex + 1} со всеми событиями?`)
    )
      return;
    const measures = score.measures.filter((item) => item.id !== measure.id);
    onChange({ ...score, measures });
    setMeasureId(measures[Math.min(measureIndex, measures.length - 1)]?.id);
    setEventId(undefined);
  }

  function removeEvent() {
    if (!measure || !selectedEvent) return;
    const remaining = measure.events.filter(
      (event) => event.id !== selectedEvent.id,
    );
    updateMeasure(measureIndex, (previous) => ({
      ...previous,
      events: remaining,
    }));
    const next = remaining[Math.min(eventIndex, remaining.length - 1)];
    setEventId(next?.id);
    if (next) {
      setRhythm({
        duration: next.duration,
        dotted: next.dotted,
        triplet: next.triplet,
      });
      const note =
        next.notes.find((item) => item.lane === lane) ?? next.notes[0];
      if (note) rememberNote(note);
    }
  }

  return (
    <section
      className="visual-tab-editor"
      aria-label="Визуальный редактор табулатуры"
    >
      <div className="visual-tab-heading">
        <div>
          <h3>Ноты и ритм</h3>
          <p className="visual-tab-help">
            Нажмите ноту, чтобы изменить её. Для следующего момента используйте{" "}
            {drums ? "«Добавить удар»" : "«Добавить ноту»"} или «Добавить
            паузу».
            {piano
              ? " Клавиатура добавляет и убирает клавиши выбранного момента. Для нового созвучия нажмите «Новый момент»; максимум 10 клавиш одновременно."
              : drums
                ? " Клик по клетке включает или выключает удар."
                : " Клик по пустой струне добавляет ноту в тот же момент."}
          </p>
        </div>
        <div
          className="visual-tab-meter"
          role="group"
          aria-label="Размер всех тактов"
        >
          <span>Размер</span>
          <label className="visual-tab-field">
            <span className="visual-tab-sr-only">Долей в такте</span>
            <select
              value={score.meter.beats}
              onChange={(event) =>
                onChange({
                  ...score,
                  meter: { ...score.meter, beats: Number(event.target.value) },
                })
              }
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map(
                (value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ),
              )}
            </select>
          </label>
          <span>/</span>
          <label className="visual-tab-field">
            <span className="visual-tab-sr-only">Единица размера</span>
            <select
              value={score.meter.unit}
              onChange={(event) =>
                onChange({
                  ...score,
                  meter: {
                    ...score.meter,
                    unit: Number(event.target.value) as 4 | 8,
                  },
                })
              }
            >
              <option value={4}>4</option>
              <option value={8}>8</option>
            </select>
          </label>
        </div>
      </div>

      {issues.length > 0 && (
        <div className="visual-tab-issues" role="alert">
          <strong>Перед сохранением исправьте табулатуру</strong>
          <p>
            Ноты не обрезаются при изменении размера или длительности. Исправьте
            переполнение и связи вручную.
          </p>
          <ul>
            {issues.map((issue, index) => (
              <li key={`${issue.measure}-${issue.event ?? "bar"}-${index}`}>
                Такт {issue.measure}
                {issue.event === undefined
                  ? ""
                  : `, событие ${issue.event}`}: {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="visual-tab-bar-tools">
        <div className="visual-tab-navigation" aria-label="Навигация по тактам">
          <button
            type="button"
            aria-label="Предыдущий такт"
            disabled={measureIndex === 0}
            onClick={() => select(measureIndex - 1)}
          >
            ←
          </button>
          <label className="visual-tab-field">
            <span className="visual-tab-sr-only">Выбранный такт</span>
            <select
              value={measureIndex}
              onChange={(event) => select(Number(event.target.value))}
            >
              {score.measures.map((bar, index) => (
                <option key={bar.id} value={index}>
                  Такт {index + 1} из {score.measures.length}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            aria-label="Следующий такт"
            disabled={measureIndex >= score.measures.length - 1}
            onClick={() => select(measureIndex + 1)}
          >
            →
          </button>
        </div>
        <div className="visual-tab-actions">
          <button
            type="button"
            disabled={score.measures.length >= 128}
            onClick={() => addMeasure()}
          >
            Добавить такт
          </button>
          <button
            type="button"
            disabled={!measure || score.measures.length >= 128}
            onClick={() => addMeasure(true)}
          >
            Копировать такт
          </button>
          <button
            type="button"
            className="visual-tab-danger"
            disabled={score.measures.length <= 1}
            onClick={removeMeasure}
          >
            Удалить такт
          </button>
        </div>
      </div>
      {score.measures.length >= 128 && (
        <p className="visual-tab-help" role="status">
          Достигнут предел: 128 тактов.
        </p>
      )}

      <div className="visual-tab-preview">
        <TabScoreView
          score={score}
          selectedMeasure={measureIndex}
          selectedEvent={eventIndex >= 0 ? eventIndex : undefined}
          onSelect={select}
          onLaneClick={laneClick}
        />
      </div>

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
            onClick={() => select(measureIndex, index)}
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
            </small>
          </button>
        ))}
        <button
          type="button"
          aria-pressed={!selectedEvent}
          onClick={() => select(measureIndex)}
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

      <div className="visual-tab-panels">
        <fieldset className="visual-tab-panel">
          <legend>
            Длительность{" "}
            {selectedEvent ? "выбранного события" : "следующего события"}
          </legend>
          <div
            className="visual-tab-durations"
            role="group"
            aria-label="Длительность"
          >
            {durations.map(({ value, label }) => (
              <button
                type="button"
                key={value}
                aria-label={`${label}, 1/${value}`}
                aria-pressed={currentRhythm.duration === value}
                onClick={() => changeRhythm({ duration: value })}
              >
                <strong>1/{value}</strong>
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="visual-tab-checks">
            <label>
              <input
                type="checkbox"
                checked={currentRhythm.dotted}
                onChange={(event) =>
                  changeRhythm({
                    dotted: event.target.checked,
                    ...(event.target.checked ? { triplet: false } : {}),
                  })
                }
              />
              С точкой · +½
            </label>
            <label>
              <input
                type="checkbox"
                checked={currentRhythm.triplet}
                onChange={(event) =>
                  changeRhythm({
                    triplet: event.target.checked,
                    ...(event.target.checked ? { dotted: false } : {}),
                  })
                }
              />
              Триоль · ⅔
            </label>
          </div>
          <p className="visual-tab-help">
            Все ноты одного момента звучат одновременно и имеют общую
            длительность{drums ? "." : " — это аккорд."} Следующее событие
            добавляется с текущей длительностью.
          </p>
          <div className="visual-tab-actions">
            <button
              type="button"
              className="visual-tab-primary"
              disabled={!measure || measure.events.length >= 64}
              onClick={() => addEvent(false)}
            >
              {drums ? "Добавить удар" : "Добавить ноту"}
            </button>
            <button
              type="button"
              disabled={!measure || measure.events.length >= 64}
              onClick={() => addEvent(true)}
            >
              Добавить паузу
            </button>
          </div>
          <p className="visual-tab-help">
            Эти кнопки добавляют новое событие в конец такта, а не в выбранный
            момент.
          </p>
          {measure && measure.events.length >= 64 && (
            <p className="visual-tab-overflow" role="status">
              Предел — 64 события. Добавьте следующий такт.
            </p>
          )}
          <button
            type="button"
            className="visual-tab-danger"
            disabled={!selectedEvent}
            onClick={removeEvent}
          >
            Удалить выбранное событие
          </button>
        </fieldset>

        <fieldset className="visual-tab-panel">
          <legend>
            {piano
              ? "Клавиша и исполнение"
              : drums
                ? "Дорожка и удар"
                : "Струна и нота"}
          </legend>
          <div className="visual-tab-note-fields">
            <label className="visual-tab-field">
              {piano ? "Клавиша" : drums ? "Дорожка" : "Струна"}
              <select
                value={lane}
                onChange={(event) => chooseLane(event.target.value)}
              >
                {lanes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                    {selectedEvent?.notes.some((note) => note.lane === item.id)
                      ? " · есть нота"
                      : ""}
                  </option>
                ))}
              </select>
            </label>
            {!drums && !piano && (
              <>
                <label className="visual-tab-field">
                  Лад · 0–24
                  <input
                    type="number"
                    min={0}
                    max={24}
                    step={1}
                    value={currentFret === "x" ? "" : currentFret}
                    disabled={currentFret === "x"}
                    onChange={(event) => {
                      const value = event.target.valueAsNumber;
                      if (Number.isInteger(value) && value >= 0 && value <= 24)
                        changeFret(value);
                    }}
                  />
                </label>
                <label className="visual-tab-check">
                  <input
                    type="checkbox"
                    checked={currentFret === "x"}
                    onChange={(event) =>
                      changeFret(event.target.checked ? "x" : 0)
                    }
                  />
                  x · приглушённая
                </label>
              </>
            )}
          </div>
          <p className="visual-tab-help">
            {selectedNote
              ? "Изменения применяются к выбранной ноте сразу."
              : selectedEvent
                ? "На этой дорожке пока пауза. Добавьте ноту в выбранный момент."
                : "Настройки для новой ноты. Выберите событие, чтобы изменить существующую."}
          </p>
          <div className="visual-tab-actions">
            <button
              type="button"
              disabled={!selectedEvent || Boolean(selectedNote)}
              onClick={addToMoment}
            >
              {drums ? "Удар в этот момент" : "Нота в этот момент"}
            </button>
            <button
              type="button"
              disabled={!selectedNote}
              onClick={() => removeNote(lane)}
            >
              Убрать {drums ? "удар" : "ноту"} с дорожки
            </button>
          </div>
          {!drums && (
            <label className="visual-tab-field visual-tab-link">
              {piano
                ? "Продлить эту клавишу в следующем событии"
                : "Связь со следующей нотой на этой струне"}
              <select
                value={currentLink}
                onChange={(event) => {
                  const value = event.target.value as NoteLink | "";
                  setNoteLink(value);
                  changeSelectedNote((previous) => {
                    const next = { ...previous };
                    if (value) next.link = value;
                    else delete next.link;
                    return next;
                  });
                }}
              >
                {links
                  .filter(
                    (link) =>
                      !piano || link.value === "" || link.value === "tie",
                  )
                  .map((link) => (
                    <option key={link.value} value={link.value}>
                      {link.label}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <div
            className="visual-tab-checks visual-tab-effects"
            role="group"
            aria-label="Эффекты выбранной ноты"
          >
            {visibleEffects.map(({ value, label }) => (
              <label key={value}>
                <input
                  type="checkbox"
                  checked={currentEffects.includes(value)}
                  onChange={(event) =>
                    toggleEffect(value, event.target.checked)
                  }
                />
                {label}
              </label>
            ))}
          </div>
          {selectedEvent && (
            <div className="visual-tab-chord-notes">
              <strong>{drums ? "Удары в моменте" : "Ноты в моменте"}</strong>
              {!selectedEvent.notes.length ? (
                <p className="visual-tab-help">Пауза — ни одной ноты.</p>
              ) : (
                selectedEvent.notes.map((note) => {
                  const label =
                    lanes.find((item) => item.id === note.lane)?.label ??
                    note.lane;
                  return (
                    <div className="visual-tab-note-row" key={note.lane}>
                      <button
                        type="button"
                        aria-pressed={note.lane === lane}
                        onClick={() => rememberNote(note)}
                      >
                        {label}
                        {piano ? "" : drums ? " · удар" : ` · ${note.fret}`}
                      </button>
                      <button
                        type="button"
                        aria-label={`Убрать ноту: ${label}`}
                        onClick={() => removeNote(note.lane)}
                      >
                        Убрать
                      </button>
                    </div>
                  );
                })
              )}
              <p className="visual-tab-help">
                Удаление последней ноты превращает событие в паузу.
              </p>
            </div>
          )}
        </fieldset>
      </div>

      {issues.length === 0 && (
        <p className="visual-tab-valid" role="status">
          Размер и связи нот: ошибок нет.
        </p>
      )}
    </section>
  );
}
