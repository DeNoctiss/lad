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
import { EditorHeading } from "./editor/EditorHeading";
import { IssuesBox } from "./editor/IssuesBox";
import { BarTools } from "./editor/BarTools";
import { EventChips } from "./editor/EventChips";
import { DurationPanel } from "./editor/DurationPanel";
import { NotePanel } from "./editor/NotePanel";
import { effects } from "./editor/editorShared";
import type { Rhythm } from "./editor/editorShared";

type Props = {
  score: TabScore;
  onChange: (score: TabScore) => void;
  sound?: string;
  bpm?: number;
};

export function VisualTabEditor(props: Props) {
  return <VisualTabEditorBody key={props.score.kind} {...props} />;
}

function VisualTabEditorBody({ score, onChange, sound, bpm }: Props) {
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

  /** Palm mute is moment-wide: a note joining a muted event inherits it. */
  function applyEventPm(notes: TabNote[]): TabNote[] {
    if (!notes.some((note) => note.effects.includes("pm"))) return notes;
    return notes.map((note) =>
      note.effects.includes("pm")
        ? note
        : { ...note, effects: [...note.effects, "pm"] },
    );
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
    // Palm mute marks the whole moment, not a single string.
    if (effect === "pm") {
      updateEvent(eventIndex, (previous) => ({
        ...previous,
        notes: previous.notes.map((note) => ({
          ...note,
          effects: checked
            ? [...note.effects.filter((item) => item !== "pm"), "pm"]
            : note.effects.filter((item) => item !== "pm"),
        })),
      }));
      return;
    }
    changeSelectedNote((previous) => ({ ...previous, effects: next }));
  }

  function changeLink(value: NoteLink | "") {
    setNoteLink(value);
    changeSelectedNote((previous) => {
      const next = { ...previous };
      if (value) next.link = value;
      else delete next.link;
      return next;
    });
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
      notes: applyEventPm([...previous.notes, makeNote()]),
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
        notes: applyEventPm(
          existing
            ? previous.notes.filter((note) => note.lane !== targetLane)
            : [...previous.notes, makeNote(targetLane)],
        ),
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
      <EditorHeading
        drums={drums}
        piano={piano}
        meter={score.meter}
        onMeterChange={(meter) => onChange({ ...score, meter })}
      />
      <IssuesBox issues={issues} />
      <BarTools
        measures={score.measures}
        measureIndex={measureIndex}
        onSelect={select}
        onAddMeasure={addMeasure}
        onRemoveMeasure={removeMeasure}
      />
      <div className="visual-tab-preview">
        <TabScoreView
          score={score}
          selectedMeasure={measureIndex}
          selectedEvent={eventIndex >= 0 ? eventIndex : undefined}
          onSelect={select}
          onLaneClick={laneClick}
          sound={sound}
          bpm={bpm}
        />
      </div>
      <EventChips
        measureIndex={measureIndex}
        measure={measure}
        selectedEvent={selectedEvent}
        eventIndex={eventIndex}
        drums={drums}
        usedTicks={usedTicks}
        capacity={capacity}
        onSelect={select}
      />
      <div className="visual-tab-panels">
        <DurationPanel
          selectedEvent={Boolean(selectedEvent)}
          currentRhythm={currentRhythm}
          drums={drums}
          measure={measure}
          onChangeRhythm={changeRhythm}
          onAddEvent={addEvent}
          onRemoveEvent={removeEvent}
        />
        <NotePanel
          piano={piano}
          drums={drums}
          lanes={lanes}
          lane={lane}
          selectedEvent={selectedEvent}
          selectedNote={selectedNote}
          currentFret={currentFret}
          currentLink={currentLink}
          currentEffects={currentEffects}
          visibleEffects={visibleEffects}
          onChooseLane={chooseLane}
          onChangeFret={changeFret}
          onAddToMoment={addToMoment}
          onRemoveNote={removeNote}
          onLinkChange={changeLink}
          onToggleEffect={toggleEffect}
          onRememberNote={rememberNote}
        />
      </div>
      {issues.length === 0 && (
        <p className="visual-tab-valid" role="status">
          Размер и связи нот: ошибок нет.
        </p>
      )}
    </section>
  );
}
