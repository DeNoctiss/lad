import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  NOTE_NAMES,
  SCALE_TYPES,
  TUNINGS,
  STANDARD_TUNING,
  NUM_FRETS,
  FRET_MARKERS,
  DOUBLE_FRET_MARKERS,
  noteName,
  noteAt,
  scaleNoteSet,
  matchCount,
} from "./scales";
import { CHORD_TYPES, chordName } from "./chordDatabase";
import "./fretboard.css";

/* ------------------------------------------------------------------ */
/*  Fretboard view                                                     */
/* ------------------------------------------------------------------ */

type FretboardViewProps = {
  tuning: number[];
  /** Notes to highlight (semitone values). If null, no highlights. */
  highlightedNotes: Set<number> | null;
  /** Per-string, per-fret selected positions (for chord/key identifier). */
  selectedPositions?: Set<string>;
  /** Callback when a fret position is clicked. */
  onPositionClick?: (stringIdx: number, fret: number) => void;
  /** Whether to show note names in the circles. */
  showNoteNames: boolean;
  /** Whether tuning notes at the nut are editable. */
  tuningEditable: boolean;
  /** Callback when a tuning note is changed. */
  onTuningChange?: (stringIdx: number, note: number) => void;
  /** Root note to emphasize (shown with different color). */
  rootNote?: number | null;
};

function FretboardView({
  tuning,
  highlightedNotes,
  selectedPositions,
  onPositionClick,
  showNoteNames,
  tuningEditable,
  onTuningChange,
  rootNote,
}: FretboardViewProps) {
  // Display strings from high e (top) to low E (bottom)
  const displayStrings = [5, 4, 3, 2, 1, 0];
  const clickable = onPositionClick !== undefined;

  function renderNoteDot(
    note: number,
    isRoot: boolean,
    isSelected: boolean,
    onClick: (() => void) | undefined,
    label: string,
  ) {
    const isHighlighted = highlightedNotes?.has(note) ?? false;
    if (!isHighlighted && !isSelected && !clickable) return null;
    return (
      <button
        className={`note-dot${isRoot ? " note-dot-root" : ""}${
          isSelected ? " note-dot-selected" : ""
        }${!isHighlighted && !isSelected ? " note-dot-empty" : ""}`}
        onClick={onClick}
        tabIndex={clickable ? 0 : -1}
        aria-label={label}
      >
        {showNoteNames && (isHighlighted || isSelected) ? noteName(note) : ""}
      </button>
    );
  }

  return (
    <div className="fretboard-wrapper">
      <div className="fretboard-scroll">
        <div className="fretboard">
          {/* Fret markers row (above the strings) */}
          <div className="fret-marker-row">
            <div className="fret-tuning-col" />
            <div className="fret-nut-col" />
            <div className="fret-open-cell" />
            {Array.from({ length: NUM_FRETS }, (_, fret) => (
              <div key={fret} className="fret-marker-cell">
                {DOUBLE_FRET_MARKERS.includes(fret + 1) && (
                  <span className="fret-marker-dot-pair">
                    <span />
                    <span />
                  </span>
                )}
                {FRET_MARKERS.includes(fret + 1) && (
                  <span className="fret-marker-dot" />
                )}
              </div>
            ))}
          </div>

          {/* String rows */}
          {displayStrings.map((stringIdx) => {
            const openNote = tuning[stringIdx];
            const isOpenHighlighted = highlightedNotes?.has(openNote) ?? false;
            const openPosKey = `${stringIdx}-0`;
            const isOpenSelected = selectedPositions?.has(openPosKey) ?? false;
            const isOpenRoot =
              rootNote !== null &&
              rootNote !== undefined &&
              openNote === rootNote;

            return (
              <div key={stringIdx} className="fret-string-row">
                {/* Tuning selector (left of nut) */}
                <div className="fret-tuning-col">
                  {tuningEditable && onTuningChange ? (
                    <select
                      className="tuning-select"
                      value={tuning[stringIdx]}
                      onChange={(e) =>
                        onTuningChange(stringIdx, Number(e.target.value))
                      }
                      aria-label={`Нота открытой ${6 - stringIdx}-й струны`}
                    >
                      {NOTE_NAMES.map((name, idx) => (
                        <option key={name} value={idx}>
                          {name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="tuning-note-label">
                      {noteName(openNote)}
                    </span>
                  )}
                </div>

                {/* Nut (visual separator) */}
                <div className="fret-nut-col" />

                {/* Open string cell (fret 0) — clickable, shows open note */}
                <div
                  className={`fret-open-cell${
                    isOpenHighlighted ? " fret-open-highlighted" : ""
                  }${isOpenRoot ? " fret-open-root" : ""}`}
                >
                  {(isOpenHighlighted || isOpenSelected || clickable) && (
                    <button
                      className={`note-dot note-dot-open${
                        isOpenRoot ? " note-dot-root" : ""
                      }${isOpenSelected ? " note-dot-selected" : ""}${
                        !isOpenHighlighted && !isOpenSelected
                          ? " note-dot-empty"
                          : ""
                      }`}
                      onClick={
                        clickable
                          ? () => onPositionClick!(stringIdx, 0)
                          : undefined
                      }
                      tabIndex={clickable ? 0 : -1}
                      aria-label={`Струна ${6 - stringIdx}, открытая, нота ${noteName(openNote)}`}
                    >
                      {showNoteNames && (isOpenHighlighted || isOpenSelected)
                        ? noteName(openNote)
                        : ""}
                    </button>
                  )}
                </div>

                {/* Fret cells (frets 1..NUM_FRETS) */}
                {Array.from({ length: NUM_FRETS }, (_, fret) => {
                  const note = noteAt(tuning[stringIdx], fret + 1);
                  const posKey = `${stringIdx}-${fret + 1}`;
                  const isSelected = selectedPositions?.has(posKey) ?? false;
                  const isRoot =
                    rootNote !== null &&
                    rootNote !== undefined &&
                    note === rootNote;

                  return (
                    <div
                      key={fret}
                      className={`fret-cell${fret === 0 ? " first-fret" : ""}${
                        (fret + 1) % 12 === 0 ? " octave-fret" : ""
                      }`}
                    >
                      {renderNoteDot(
                        note,
                        isRoot,
                        isSelected,
                        clickable
                          ? () => onPositionClick!(stringIdx, fret + 1)
                          : undefined,
                        `Струна ${6 - stringIdx}, лад ${fret + 1}, нота ${noteName(note)}`,
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Scale tab                                                          */
/* ------------------------------------------------------------------ */

function ScaleTab() {
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
        <label className="fretboard-checkbox">
          <input
            type="checkbox"
            checked={showNames}
            onChange={(e) => setShowNames(e.target.checked)}
          />
          <span>Показывать названия нот</span>
        </label>
      </div>
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

function ChordIdentifierTab() {
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

function KeyIdentifierTab() {
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

type TabId = "scales" | "chords" | "keys";

const TABS: { id: TabId; label: string }[] = [
  { id: "scales", label: "Гаммы" },
  { id: "chords", label: "Определитель аккордов" },
  { id: "keys", label: "Определитель тональности" },
];

export function FretboardPage({
  navigate,
}: {
  navigate: (route: string) => void;
}) {
  const [tab, setTab] = useState<TabId>("scales");

  return (
    <section className="fretboard-page" aria-label="Гриф гитары">
      <button className="back-link" onClick={() => navigate("chords")}>
        <ArrowLeft size={16} />
        Библиотека аккордов
      </button>
      <div className="page-heading chord-page-heading">
        <div>
          <p className="eyebrow">ГРИФ ГИТАРЫ — 24 ЛАДА</p>
          <h1>Исследование грифа</h1>
          <p className="chord-page-description">
            Гаммы, определение аккордов и тональностей на грифе гитары.
          </p>
        </div>
      </div>
      <div className="fretboard-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`fretboard-tab-btn${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "scales" && <ScaleTab />}
      {tab === "chords" && <ChordIdentifierTab />}
      {tab === "keys" && <KeyIdentifierTab />}
    </section>
  );
}
