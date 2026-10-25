import { matchPercent, compareNoteMatches } from "../../lib/noteMatching";
import { useMemo, useState } from "react";
import { TUNINGS, STANDARD_TUNING, noteName, noteAt } from "../../lib/scales";
import { CHORD_TYPES, chordName } from "../../lib/chordDatabase";
import { FretboardView } from "./FretboardView";
import {
  FretboardControls,
  TuningSelect,
  NamesCheckbox,
} from "./FretboardControls";

type ChordMatch = {
  name: string;
  root: number;
  suffix: string;
  intervals: number[];
  chordTones: number[];
  matches: number;
  extra: number[];
  missing: number[];
};

export function ChordIdentifierTab() {
  const [tuning, setTuning] = useState<number[]>([...STANDARD_TUNING]);
  const [tuningPreset, setTuningPreset] = useState("Стандартный (E A D G B E)");
  const [selectedPositions, setSelectedPositions] = useState<
    Map<string, number>
  >(new Map());
  const [showNames, setShowNames] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const selectedNotes = useMemo(
    () => [...new Set(selectedPositions.values())],
    [selectedPositions],
  );

  const matches = useMemo<ChordMatch[]>(() => {
    if (selectedNotes.length === 0) return [];
    const results: ChordMatch[] = [];
    for (let root = 0; root < 12; root++) {
      for (const type of CHORD_TYPES) {
        const chordTones = type.intervals.map((i) => (root + i) % 12);
        const chordSet = new Set(chordTones);
        const selectedSet = new Set(selectedNotes);
        const matches = [...selectedSet].filter((n) => chordSet.has(n)).length;
        if (matches === 0) continue;
        const extra = [...selectedSet].filter((n) => !chordSet.has(n));
        if (extra.length > 0) continue;
        const missing = [...chordSet].filter((n) => !selectedSet.has(n));
        results.push({
          name: chordName(root, type.suffix),
          root,
          suffix: type.suffix,
          intervals: type.intervals,
          chordTones,
          matches,
          extra,
          missing,
        });
      }
    }
    results.sort((a, b) =>
      compareNoteMatches(
        { ...a, total: a.chordTones.length },
        { ...b, total: b.chordTones.length },
      ),
    );
    return results.slice(0, 20);
  }, [selectedNotes]);

  const handleTuningPreset = (name: string) => {
    setExpanded(false);
    setTuningPreset(name);
    const preset = TUNINGS.find((t) => t.name === name);
    if (preset) setTuning([...preset.notes]);
    setSelectedPositions(new Map());
  };

  const handlePositionClick = (stringIdx: number, fret: number) => {
    setExpanded(false);
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
  const highlightedFromChords = useMemo(() => {
    if (matches.length === 0) return null;
    // Highlight all notes from the top match
    return new Set(matches[0].chordTones);
  }, [matches]);

  return (
    <div className="fretboard-tab">
      <FretboardControls>
        <TuningSelect value={tuningPreset} onChange={handleTuningPreset} />
        <NamesCheckbox checked={showNames} onChange={setShowNames} />
        {selectedPositions.size > 0 && (
          <button
            className="btn btn-small"
            onClick={() => {
              setSelectedPositions(new Map());
              setExpanded(false);
            }}
          >
            Очистить
          </button>
        )}
      </FretboardControls>
      <p className="fretboard-hint">
        Кликайте по грифу, чтобы выбрать ноты. Снизу появятся подходящие
        аккорды. Выбрано нот: {selectedNotes.length}
      </p>
      <FretboardView
        tuning={tuning}
        highlightedNotes={
          selectedPositions.size > 0
            ? new Set(selectedPositions.values())
            : highlightedFromChords
        }
        selectedPositions={posSet}
        onPositionClick={handlePositionClick}
        showNoteNames={showNames}
        tuningEditable={false}
      />
      {matches.length > 0 ? (
        <div className="fretboard-results">
          <h3>Подходящие аккорды</h3>
          <p>
            Процент — сколько нот аккорда выбрано из его полного состава.
            Показаны только аккорды, содержащие все выбранные ноты.
          </p>
          {matches.length > 5 && (
            <button className="btn" onClick={() => setExpanded(!expanded)}>
              {expanded ? "Показать топ-5" : "Показать больше вариантов"}
            </button>
          )}
          <div className="chord-match-list">
            {matches.slice(0, expanded ? 20 : 5).map((m) => {
              const pct = matchPercent(m.matches, m.chordTones.length);
              const isPerfect = m.extra.length === 0 && m.missing.length === 0;
              const isClose =
                !isPerfect && m.extra.length === 0 && m.missing.length <= 2;
              return (
                <div
                  key={m.name}
                  className={`chord-match-item${
                    isPerfect
                      ? " chord-match-perfect"
                      : isClose
                        ? " chord-match-close"
                        : ""
                  }`}
                >
                  <div className="chord-match-header">
                    <strong>{m.name}</strong>
                    <span className="chord-match-score">
                      {pct}% ({m.matches}/{m.chordTones.length})
                      {isPerfect ? " ✓" : isClose ? " ≈" : ""}
                    </span>
                  </div>
                  <p>
                    Вне аккорда: {m.extra.map(noteName).join(", ") || "нет"}
                  </p>
                  <div className="chord-match-notes">
                    {m.chordTones.map((n) => (
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
          <p>
            {selectedNotes.length
              ? "В каталоге нет аккорда, содержащего все выбранные ноты. Измените набор нот."
              : "Выберите ноты на грифе, чтобы увидеть подходящие аккорды."}
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Key identifier tab                                                 */
/* ------------------------------------------------------------------ */
