import { useMemo, useState } from "react";
import {
  SCALE_TYPES,
  TUNINGS,
  STANDARD_TUNING,
  noteName,
  noteAt,
  matchCount,
} from "../../lib/scales";
import { FretboardView } from "./FretboardView";
import {
  FretboardControls,
  TuningSelect,
  NamesCheckbox,
} from "./FretboardControls";

type KeyMatch = {
  root: number;
  scaleName: string;
  scaleShortName: string;
  intervals: number[];
  scaleTones: number[];
  matches: number;
  extra: number[];
  missing: number[];
};

export function KeyIdentifierTab() {
  const [tuning, setTuning] = useState<number[]>([...STANDARD_TUNING]);
  const [tuningPreset, setTuningPreset] = useState("Стандартный (E A D G B E)");
  const [selectedPositions, setSelectedPositions] = useState<
    Map<string, number>
  >(new Map());
  const [showNames, setShowNames] = useState(true);

  const selectedNotes = useMemo(
    () => [...new Set(selectedPositions.values())],
    [selectedPositions],
  );

  const matches = useMemo<KeyMatch[]>(() => {
    if (selectedNotes.length === 0) return [];
    const results: KeyMatch[] = [];
    for (let root = 0; root < 12; root++) {
      for (const scale of SCALE_TYPES) {
        const result = matchCount(selectedNotes, root, scale.intervals);
        if (result.matches === 0) continue;
        results.push({
          root,
          scaleName: scale.name,
          scaleShortName: scale.shortName,
          intervals: scale.intervals,
          scaleTones: scale.intervals.map((i) => (root + i) % 12),
          matches: result.matches,
          extra: result.extra,
          missing: result.missing,
        });
      }
    }
    // Sort: most matches, then fewest extra, then fewer scale tones
    results.sort((a, b) => {
      if (b.matches !== a.matches) return b.matches - a.matches;
      if (a.extra.length !== b.extra.length)
        return a.extra.length - b.extra.length;
      return a.intervals.length - b.intervals.length;
    });
    return results.slice(0, 30);
  }, [selectedNotes]);

  const handleTuningPreset = (name: string) => {
    setTuningPreset(name);
    const preset = TUNINGS.find((t) => t.name === name);
    if (preset) setTuning([...preset.notes]);
  };

  const handlePositionClick = (stringIdx: number, fret: number) => {
    const key = `${stringIdx}-${fret}`;
    setSelectedPositions((prev) => {
      const next = new Map(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.set(key, noteAt(tuning[stringIdx], fret));
      }
      return next;
    });
  };

  const posSet = new Set(selectedPositions.keys());

  return (
    <div className="fretboard-tab">
      <FretboardControls>
        <TuningSelect value={tuningPreset} onChange={handleTuningPreset} />
        <NamesCheckbox checked={showNames} onChange={setShowNames} />
        {selectedPositions.size > 0 && (
          <button
            className="btn btn-small"
            onClick={() => setSelectedPositions(new Map())}
          >
            Очистить
          </button>
        )}
      </FretboardControls>
      <p className="fretboard-hint">
        Кликайте по грифу, чтобы выбрать ноты. Снизу появятся подходящие
        тональности и гаммы.
      </p>
      <FretboardView
        tuning={tuning}
        highlightedNotes={
          selectedPositions.size > 0
            ? new Set(selectedPositions.values())
            : null
        }
        selectedPositions={posSet}
        onPositionClick={handlePositionClick}
        showNoteNames={showNames}
        tuningEditable={false}
      />
      {matches.length > 0 ? (
        <div className="fretboard-results">
          <h3>Подходящие тональности</h3>
          <div className="key-match-list">
            {matches.map((m, idx) => {
              const pct = Math.round((m.matches / m.scaleTones.length) * 100);
              const isPerfect = m.extra.length === 0 && m.missing.length === 0;
              const isClose =
                !isPerfect && m.extra.length === 0 && m.missing.length <= 2;
              return (
                <div
                  key={`${m.root}-${m.scaleShortName}-${idx}`}
                  className={`key-match-item${
                    isPerfect
                      ? " key-match-perfect"
                      : isClose
                        ? " key-match-close"
                        : ""
                  }`}
                >
                  <div className="key-match-header">
                    <strong>
                      {noteName(m.root)} {m.scaleShortName}
                    </strong>
                    <span className="key-match-score">
                      {pct}% ({m.matches}/{m.scaleTones.length})
                      {isPerfect ? " ✓" : isClose ? " ≈" : ""}
                    </span>
                  </div>
                  <div className="key-match-notes">
                    {m.scaleTones.map((n) => (
                      <span
                        key={n}
                        className={`note-chip${
                          selectedNotes.includes(n) ? " note-chip-match" : ""
                        }`}
                      >
                        {noteName(n)}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="fretboard-empty">
          <p>Выберите ноты на грифе, чтобы определить тональность.</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page with tabs                                                */
/* ------------------------------------------------------------------ */
