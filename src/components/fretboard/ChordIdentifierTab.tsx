import { useMemo, useState } from "react";
import { TUNINGS, STANDARD_TUNING, noteName, noteAt } from "../../lib/scales";
import { CHORD_TYPES, chordName } from "../../lib/chordDatabase";
import { FretboardView } from "./FretboardView";

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
    // Sort: most matches first, then fewest extra notes, then fewer tones
    results.sort((a, b) => {
      if (b.matches !== a.matches) return b.matches - a.matches;
      if (a.extra.length !== b.extra.length)
        return a.extra.length - b.extra.length;
      return a.intervals.length - b.intervals.length;
    });
    return results.slice(0, 40);
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
  const highlightedFromChords = useMemo(() => {
    if (matches.length === 0) return null;
    // Highlight all notes from the top match
    return new Set(matches[0].chordTones);
  }, [matches]);

  return (
    <div className="fretboard-tab">
      <div className="fretboard-controls">
        <label className="fretboard-field">
          <span>Строй</span>
          <select
            value={tuningPreset}
            onChange={(e) => handleTuningPreset(e.target.value)}
          >
            {TUNINGS.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
              </option>
            ))}
            <option value="Свой строй">Свой строй</option>
          </select>
        </label>
        <label className="fretboard-checkbox">
          <input
            type="checkbox"
            checked={showNames}
            onChange={(e) => setShowNames(e.target.checked)}
          />
          <span>Показывать названия нот</span>
        </label>
        {selectedPositions.size > 0 && (
          <button
            className="btn btn-small"
            onClick={() => setSelectedPositions(new Map())}
          >
            Очистить
          </button>
        )}
      </div>
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
          <div className="chord-match-list">
            {matches.map((m) => {
              const pct = Math.round((m.matches / m.chordTones.length) * 100);
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
          <p>Выберите ноты на грифе, чтобы увидеть подходящие аккорды.</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Key identifier tab                                                 */
/* ------------------------------------------------------------------ */
