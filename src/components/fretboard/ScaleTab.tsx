import { useMemo, useState } from "react";
import {
  NOTE_NAMES,
  SCALE_TYPES,
  TUNINGS,
  STANDARD_TUNING,
  noteName,
  scaleNoteSet,
} from "../../lib/scales";
import { FretboardView } from "./FretboardView";
import {
  FretboardControls,
  TuningSelect,
  NamesCheckbox,
} from "./FretboardControls";

export function ScaleTab() {
  const [tuning, setTuning] = useState<number[]>([...STANDARD_TUNING]);
  const [tuningPreset, setTuningPreset] = useState("Стандартный (E A D G B E)");
  const [rootNote, setRootNote] = useState(0);
  const [scaleIdx, setScaleIdx] = useState(0);
  const [showNames, setShowNames] = useState(true);

  const scale = SCALE_TYPES[scaleIdx];
  const highlighted = useMemo(
    () => scaleNoteSet(rootNote, scale.intervals),
    [rootNote, scale],
  );

  const handleTuningPreset = (name: string) => {
    setTuningPreset(name);
    const preset = TUNINGS.find((t) => t.name === name);
    if (preset) setTuning([...preset.notes]);
  };

  const handleTuningChange = (stringIdx: number, note: number) => {
    setTuning((prev) => prev.map((n, i) => (i === stringIdx ? note : n)));
    setTuningPreset("Свой строй");
  };

  return (
    <div className="fretboard-tab">
      <FretboardControls>
        <TuningSelect value={tuningPreset} onChange={handleTuningPreset} />
        <label className="fretboard-field">
          <span>Тоника</span>
          <select
            value={rootNote}
            onChange={(e) => setRootNote(Number(e.target.value))}
          >
            {NOTE_NAMES.map((name, idx) => (
              <option key={name} value={idx}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="fretboard-field">
          <span>Гамма</span>
          <select
            value={scaleIdx}
            onChange={(e) => setScaleIdx(Number(e.target.value))}
          >
            {SCALE_TYPES.map((s, idx) => (
              <option key={s.name} value={idx}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <NamesCheckbox checked={showNames} onChange={setShowNames} />
      </FretboardControls>
      <div className="fretboard-info">
        <strong>
          {noteName(rootNote)} {scale.name}
        </strong>
        <span>
          Ноты: {scale.intervals.map((i) => noteName(rootNote + i)).join(" — ")}
        </span>
      </div>
      <FretboardView
        tuning={tuning}
        highlightedNotes={highlighted}
        showNoteNames={showNames}
        tuningEditable={true}
        onTuningChange={handleTuningChange}
        rootNote={rootNote}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chord identifier tab                                               */
/* ------------------------------------------------------------------ */
