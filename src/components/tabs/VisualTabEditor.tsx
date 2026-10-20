import { useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { uid } from "../../lib/model";
import { durationTicks, measureTicks, scoreIssues } from "../../lib/tablature";
import {
  barLength,
  emptyPositions,
  entryRhythmAt,
  eventAtCursor,
  eventPositions,
  readFretDigit,
  replaceEvent,
  writeAtCursor,
} from "../../lib/tabEditing";
import type { Rhythm, ScoreCursor } from "../../lib/tabEditing";
import type {
  NoteEffect,
  NoteLink,
  StrumDirection,
  TabEvent,
  TabNote,
  TabScore,
} from "../../lib/tabTypes";
import { TabScoreView } from "./TabScoreView";
import { orderedLanes } from "./score/scoreShared";
import { EditorHeading } from "./editor/EditorHeading";
import { IssuesBox } from "./editor/IssuesBox";
import { BarTools } from "./editor/BarTools";
import { EditorToolbar } from "./editor/EditorToolbar";
import { useScoreHistory } from "./editor/useScoreHistory";
import "../../styles/visualTabEditor.css";

type Props = {
  score: TabScore;
  onChange: (score: TabScore) => void;
  sound?: string;
  bpm?: number;
  tuning?: string;
};

export function VisualTabEditor(props: Props) {
  return <VisualTabEditorBody key={props.score.kind} {...props} />;
}

function VisualTabEditorBody({ score, onChange, sound, bpm, tuning }: Props) {
  const helpId = useId();
  const drums = score.kind === "drums";
  const piano = score.kind === "piano";
  const stringed = !drums && !piano;
  const lanes = orderedLanes(score, tuning);
  const [position, setPosition] = useState<ScoreCursor>({
    measure: 0,
    tick: 0,
    lane: piano ? "C4" : lanes[0].id,
  });
  const [rhythm, setRhythm] = useState<Rhythm>({
    duration: drums ? 8 : 4,
    dotted: false,
    triplet: false,
  });
  const [message, setMessage] = useState("");
  const preview = useRef<HTMLDivElement>(null);
  const digitBuffer = useRef({ text: "", at: 0, key: "" });
  const history = useScoreHistory(score, onChange);
  const cursor = {
    ...position,
    measure: Math.min(position.measure, score.measures.length - 1),
  };
  const measure = score.measures[cursor.measure];
  // Undo or a meter/rhythm change can put an old tick inside another event.
  // Keep the editing cursor on a real onset rather than in an unwritable gap.
  if (measure && cursor.tick < barLength(measure.events)) {
    const starts = eventPositions(measure.events);
    cursor.tick = starts.filter((tick) => tick <= cursor.tick).at(-1) ?? 0;
  }
  const eventIndex = eventAtCursor(score, cursor);
  const event = measure?.events[eventIndex];
  const note = event?.notes.find((n) => n.lane === cursor.lane);
  const currentRhythm = entryRhythmAt(score, cursor, rhythm);
  const used = barLength(measure?.events ?? []);
  const capacity = measureTicks(score.meter);
  const issues = scoreIssues(score);

  function focus() {
    preview.current?.focus({ preventScroll: true });
  }
  function resetDigits() {
    digitBuffer.current = { text: "", at: 0, key: "" };
  }
  function move(next: ScoreCursor) {
    setPosition(next);
    setMessage("");
    resetDigits();
    setRhythm(entryRhythmAt(score, next, rhythm));
    focus();
  }
  function commit(action: () => TabScore) {
    try {
      history.commit(action());
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Не удалось изменить ноту.",
      );
    }
  }
  function select(bar: number, index?: number, lane?: string) {
    const events = score.measures[bar]?.events;
    if (!events) return;
    const tick =
      index === undefined || index < 0
        ? bar === cursor.measure
          ? cursor.tick
          : barLength(events)
        : eventPositions(events)[index];
    move({
      ...cursor,
      measure: bar,
      tick,
      lane:
        lane ??
        (piano && index !== undefined
          ? events[index]?.notes[0]?.lane
          : undefined) ??
        cursor.lane,
    });
  }
  function selectNote(bar: number, index: number, lane: string) {
    const events = score.measures[bar]?.events ?? [];
    const tick =
      index < 0
        ? bar === cursor.measure
          ? cursor.tick
          : barLength(events)
        : eventPositions(events)[index];
    const next = { measure: bar, tick, lane };
    move(next);
    if (!stringed) write(piano ? 0 : "x", next, true);
  }
  function selectEmpty(bar: number, tick: number, lane: string) {
    const next = { measure: bar, tick, lane };
    move(next);
    if (drums) write("x", next);
  }
  function write(fret: TabNote["fret"], target = cursor, toggle = false) {
    const selected =
      score.measures[target.measure]?.events[eventAtCursor(score, target)];
    const old = selected?.notes.find((n) => n.lane === target.lane);
    const next: TabNote = {
      lane: target.lane,
      fret,
      effects:
        stringed && fret === "x"
          ? (old?.effects.filter((value) =>
              ["pm", "accent", "ghost"].includes(value),
            ) ?? [])
          : (old?.effects ?? []),
    };
    if (old?.link && fret !== "x") next.link = old.link;
    // A drum click selects and writes in one React event; do not depend on setState.
    commit(() =>
      writeAtCursor(
        score,
        target,
        entryRhythmAt(score, target, rhythm),
        next,
        toggle,
      ),
    );
  }
  function updateEvent(change: (old: TabEvent) => TabEvent) {
    if (!event) return;
    commit(() => replaceEvent(score, cursor.measure, eventIndex, change));
  }
  function changeRhythm(patch: Partial<Rhythm>) {
    const next = {
      duration: currentRhythm.duration,
      dotted: currentRhythm.dotted,
      triplet: currentRhythm.triplet,
      ...patch,
    };
    // A dot and a triplet are distinct subdivisions.
    if (patch.dotted) next.triplet = false;
    if (patch.triplet) next.dotted = false;
    if (event && used - durationTicks(event) + durationTicks(next) > capacity) {
      setMessage(
        "Эта длительность переполнит такт. Сначала освободите место или выберите более короткую ноту.",
      );
      return;
    }
    if (!event && cursor.tick + durationTicks(next) > capacity) {
      setMessage(
        "Эта длительность не помещается в оставшуюся часть такта. Выберите более короткую ноту.",
      );
      return;
    }
    setRhythm(next);
    updateEvent((old) => ({ ...old, ...next }));
    resetDigits();
    focus();
  }
  function effect(value: NoteEffect) {
    if (!note) return;
    const enabled = !note.effects.includes(value);
    updateEvent((old) => ({
      ...old,
      notes: old.notes.map((n) => {
        if (value !== "pm" && n.lane !== cursor.lane) return n;
        const effects = n.effects.filter(
          (v) =>
            v !== value &&
            !(
              enabled &&
              (value === "b1" || value === "b0.5") &&
              (v === "b1" || v === "b0.5")
            ),
        );
        if (enabled) effects.push(value);
        return { ...n, effects };
      }),
    }));
    focus();
  }
  function link(value: NoteLink | "") {
    updateEvent((old) => ({
      ...old,
      notes: old.notes.map((n) => {
        if (n.lane !== cursor.lane) return n;
        const next = { ...n };
        if (value) next.link = value;
        else delete next.link;
        return next;
      }),
    }));
    focus();
  }
  function strum(direction: StrumDirection) {
    updateEvent((old) => {
      const next = { ...old };
      if (next.strum === direction) delete next.strum;
      else next.strum = direction;
      return next;
    });
    focus();
  }
  function rest() {
    commit(() => writeAtCursor(score, cursor, currentRhythm, null));
    focus();
  }
  function removeNote() {
    if (!note) return;
    updateEvent((old) => {
      const next = {
        ...old,
        notes: old.notes.filter((n) => n.lane !== cursor.lane),
      };
      if (!next.notes.length) delete next.strum;
      return next;
    });
    resetDigits();
    focus();
  }
  function removeEvent() {
    if (!event) return;
    commit(() => ({
      ...score,
      measures: score.measures.map((bar, m) =>
        m === cursor.measure
          ? { ...bar, events: bar.events.filter((e) => e.id !== event.id) }
          : bar,
      ),
    }));
    resetDigits();
    focus();
  }
  function addMeasure(copy = false) {
    if (score.measures.length >= 128) {
      setMessage("Достигнут предел: 128 тактов.");
      return;
    }
    const next = {
      id: uid(),
      events: copy
        ? measure.events.map((e) => ({ ...structuredClone(e), id: uid() }))
        : [],
    };
    const measures = [...score.measures];
    measures.splice(cursor.measure + 1, 0, next);
    history.commit({ ...score, measures });
    move({ ...cursor, measure: cursor.measure + 1, tick: 0 });
  }
  function removeMeasure() {
    if (score.measures.length <= 1) return;
    if (
      measure.events.length &&
      !window.confirm(
        `Удалить такт ${cursor.measure + 1}? Действие можно отменить.`,
      )
    )
      return;
    history.commit({
      ...score,
      measures: score.measures.filter((_, m) => m !== cursor.measure),
    });
    move({ ...cursor, measure: Math.max(0, cursor.measure - 1), tick: 0 });
  }
  function nextMoment() {
    const tick = event
      ? cursor.tick + durationTicks(event)
      : cursor.tick + durationTicks(currentRhythm);
    if (tick < capacity) move({ ...cursor, tick });
    else if (cursor.measure + 1 < score.measures.length)
      move({ ...cursor, measure: cursor.measure + 1, tick: 0 });
    else addMeasure();
  }
  function navigate(key: string) {
    if (key === "ArrowRight" || key === "Enter") {
      nextMoment();
      return;
    }
    if (key === "ArrowLeft") {
      const ticks = [
        ...eventPositions(measure.events),
        ...emptyPositions(score, cursor.measure, rhythm),
      ].filter((t) => t < cursor.tick);
      if (ticks.length) move({ ...cursor, tick: ticks.at(-1)! });
      else if (cursor.measure > 0) {
        const m = cursor.measure - 1;
        move({
          ...cursor,
          measure: m,
          tick: eventPositions(score.measures[m].events).at(-1) ?? 0,
        });
      }
      return;
    }
    const index = lanes.findIndex((l) => l.id === cursor.lane);
    const direction = piano
      ? key === "ArrowUp"
        ? 1
        : -1
      : key === "ArrowUp"
        ? -1
        : 1;
    move({
      ...cursor,
      lane: lanes[Math.max(0, Math.min(lanes.length - 1, index + direction))]
        .id,
    });
  }
  function keyDown(key: KeyboardEvent<HTMLDivElement>) {
    const target = key.target as Element;
    if (target.closest("input, select, textarea, [contenteditable=true]"))
      return;
    if (
      target !== preview.current &&
      !target.closest(".tab-score-staff, .tab-score-drum-cell, .piano-key")
    )
      return;
    if (key.nativeEvent.isComposing || key.altKey) return;
    if ((key.ctrlKey || key.metaKey) && key.code === "KeyZ") {
      key.preventDefault();
      key.stopPropagation();
      resetDigits();
      if (key.shiftKey) history.redo();
      else history.undo();
      return;
    }
    if (key.ctrlKey || key.metaKey) return;
    if (stringed && /^[0-9]$/.test(key.key)) {
      key.preventDefault();
      key.stopPropagation();
      const now = Date.now();
      const id = `${cursor.measure}:${cursor.tick}:${cursor.lane}`;
      const previous = digitBuffer.current;
      const value = readFretDigit(
        previous.key === id && now - previous.at < 1200 ? previous.text : "",
        key.key,
      );
      digitBuffer.current = { text: value.text, at: now, key: id };
      write(value.fret);
      return;
    }
    const handled =
      [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Enter",
        "Delete",
        "Backspace",
        "+",
        "=",
        "-",
        ".",
      ].includes(key.key) ||
      ["KeyX", "KeyR", "KeyM", "KeyH", "KeyP"].includes(key.code);
    if (!handled) return;
    key.preventDefault();
    key.stopPropagation();
    resetDigits();
    if (key.key.startsWith("Arrow") || key.key === "Enter") navigate(key.key);
    else if (key.key === "Delete" || key.key === "Backspace") {
      if (key.shiftKey) removeEvent();
      else removeNote();
    } else if (key.code === "KeyX" && stringed) write("x");
    else if (key.code === "KeyR") rest();
    else if (key.code === "KeyM" && stringed) effect("pm");
    else if (key.code === "KeyH" && stringed && note?.fret !== "x")
      link(note?.link === "h" ? "" : "h");
    else if (key.code === "KeyP" && stringed && note?.fret !== "x")
      link(note?.link === "p" ? "" : "p");
    else if (key.key === ".") changeRhythm({ dotted: !currentRhythm.dotted });
    else if (["+", "=", "-"].includes(key.key)) {
      const values = [1, 2, 4, 8, 16] as const;
      const i = values.indexOf(currentRhythm.duration);
      changeRhythm({
        duration:
          values[Math.max(0, Math.min(4, i + (key.key === "-" ? -1 : 1)))],
      });
    }
  }

  return (
    <section
      className="visual-tab-editor"
      aria-label="Визуальный редактор табулатуры"
    >
      <EditorHeading
        drums={drums}
        piano={piano}
        meter={score.meter}
        onMeterChange={(meter) => history.commit({ ...score, meter })}
      />
      <BarTools
        measures={score.measures}
        measureIndex={cursor.measure}
        onSelect={(m) => move({ ...cursor, measure: m, tick: 0 })}
        onAddMeasure={addMeasure}
        onRemoveMeasure={removeMeasure}
      />
      <div
        className="visual-tab-preview"
        ref={preview}
        tabIndex={0}
        onKeyDownCapture={keyDown}
        aria-label="Поле ввода нот. Стрелки — навигация, цифры — лад, X — заглушённая струна"
        aria-describedby={helpId}
      >
        <TabScoreView
          score={score}
          selectedMeasure={cursor.measure}
          selectedEvent={eventIndex >= 0 ? eventIndex : undefined}
          selectedLane={cursor.lane}
          selectedTick={cursor.tick}
          entryRhythm={rhythm}
          onSelect={select}
          onLaneClick={selectNote}
          onEmptyClick={selectEmpty}
          sound={sound}
          bpm={bpm}
          tuning={tuning}
        />
      </div>
      <EditorToolbar
        kind={score.kind}
        rhythm={currentRhythm}
        note={note}
        event={event}
        lane={cursor.lane}
        measure={cursor.measure}
        tick={cursor.tick}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onRhythm={changeRhythm}
        onEffect={effect}
        onLink={link}
        onStrum={strum}
        onMute={() => {
          write("x");
          focus();
        }}
        onFret={(fret) => write(fret)}
        onRest={rest}
        onNext={nextMoment}
        onRemoveNote={removeNote}
        onRemoveEvent={removeEvent}
        onUndo={() => {
          history.undo();
          resetDigits();
          focus();
        }}
        onRedo={() => {
          history.redo();
          resetDigits();
          focus();
        }}
      />
      {message && (
        <p className="editor-feedback" role="status">
          {message}
        </p>
      )}
      <IssuesBox issues={issues} />
      <details className="editor-shortcuts" id={helpId}>
        <summary>Как вводить ноты · горячие клавиши</summary>
        <p>
          {stringed
            ? "Кликните по струне и введите лад 0–24. Две цифры подряд (например, 1 и 2) дают лад 12. X — заглушённая струна; M — palm mute; H / P — хаммер-он / пулл-офф."
            : piano
              ? "Клавиши добавляют и убирают ноты текущего созвучия. «Следующая позиция» переходит к новой группе; максимум 10 клавиш одновременно."
              : "Клик по сетке включает или выключает удар. В свободной части такта доступна сетка выбранной длительности."}
        </p>
        <p>
          ← → — предыдущая / следующая позиция; ↑ ↓ — струна или клавиша; Enter
          — следующая позиция; R — пауза; + / − — короче / длиннее; точка —
          длительность с точкой; Delete — убрать ноту, сохранив ритм;
          Shift+Delete — удалить событие со сдвигом последующих; Ctrl / ⌘ Z —
          отменить, Shift+Ctrl / ⌘ Z — вернуть.
        </p>
        <p>
          При вводе после пустого промежутка он заполняется явными паузами.
          Остаток такта доступен для выбора, даже если он короче выбранной ноты:
          панель подставит подходящую длительность для новой ноты. Длительность
          меняет весь столбец нот. Связь H / P / слайд задаётся на первой из
          двух нот.
        </p>
      </details>
    </section>
  );
}
