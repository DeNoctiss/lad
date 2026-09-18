import {
  NOTE_NAMES,
  NUM_FRETS,
  FRET_MARKERS,
  DOUBLE_FRET_MARKERS,
  noteName,
  noteAt,
} from "../../lib/scales";

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

export function FretboardView({
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
