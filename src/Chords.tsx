import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Guitar,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { uid } from "./model";
import type { Chord } from "./model";
import {
  findVoicings,
  generateBuiltinChords,
  parseChordName,
  CHORD_TYPES,
  CAGED_MAJOR_SHAPES,
  CAGED_MINOR_SHAPES,
} from "./chordDatabase";
import type { CagedShape } from "./chordDatabase";
import "./chords.css";

const strings = ["E", "A", "D", "G", "B", "e"];
const roots = [
  "C",
  "C♯ / D♭",
  "D",
  "D♯ / E♭",
  "E",
  "F",
  "F♯ / G♭",
  "G",
  "G♯ / A♭",
  "A",
  "A♯ / B♭",
  "B",
];
const notes: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
  H: 11,
};
const normalize = (value: string) =>
  value.trim().replaceAll("♯", "#").replaceAll("♭", "b").toLowerCase();

function chordRoot(name: string) {
  const match = name.trim().match(/^([A-Ha-h])([#♯b♭]?)/);
  if (!match || notes[match[1].toUpperCase()] === undefined) return -1;
  const alteration =
    match[2] === "#" || match[2] === "♯" ? 1 : match[2] ? -1 : 0;
  return (notes[match[1].toUpperCase()] + alteration + 12) % 12;
}

export function ChordDiagram({
  chord,
  compact = false,
}: {
  chord: Chord;
  compact?: boolean;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const left = 44;
  const top = 34;
  const spacing = 25;
  const fretHeight = 29;
  const description = chord.frets
    .map(
      (fret, index) =>
        `${strings[index]}: ${fret < 0 ? "не звучит" : fret === 0 ? "открытая" : `${fret} лад`}`,
    )
    .join("; ");

  // Determine which strings are covered by each barre
  const barres = chord.barres ?? [];
  const barreStrings = barres.map((barreFret) => {
    const covered: [number, number] = [-1, -1];
    chord.frets.forEach((f, i) => {
      if (f === barreFret) {
        if (covered[0] === -1) covered[0] = i;
        covered[1] = i;
      }
    });
    return { fret: barreFret, from: covered[0], to: covered[1] };
  });

  return (
    <svg
      className={`chord-diagram${compact ? " chord-diagram-compact" : ""}`}
      viewBox="0 0 210 219"
      role="img"
      aria-labelledby={`${titleId} ${descriptionId}`}
    >
      <title id={titleId}>{chord.name || "Предпросмотр аккорда"}</title>
      <desc id={descriptionId}>
        Слева направо от шестой струны к первой. {description}. Позиция:{" "}
        {chord.baseFret}–{chord.baseFret + 4} лады.
      </desc>
      {Array.from({ length: 6 }, (_, index) => (
        <line
          key={`fret-${index}`}
          x1={left}
          x2={left + spacing * 5}
          y1={top + index * fretHeight}
          y2={top + index * fretHeight}
          className={
            index === 0 && chord.baseFret === 1 ? "chord-nut" : "chord-fret"
          }
        />
      ))}
      {strings.map((string, index) => (
        <g key={string}>
          <line
            x1={left + index * spacing}
            x2={left + index * spacing}
            y1={top}
            y2={top + 5 * fretHeight}
            className="chord-string"
            strokeWidth={1.65 - index * 0.16}
          />
          <text
            x={left + index * spacing}
            y={201}
            className="chord-string-label"
            textAnchor="middle"
          >
            {string}
          </text>
        </g>
      ))}
      {Array.from({ length: 5 }, (_, index) => (
        <text
          key={`position-${index}`}
          x={25}
          y={top + (index + 0.5) * fretHeight + 4}
          textAnchor="end"
          className="chord-fret-label"
        >
          {chord.baseFret + index}
        </text>
      ))}
      {/* Draw barres as rounded rectangles behind the dots */}
      {barreStrings.map((barre, idx) => {
        if (
          barre.fret < chord.baseFret ||
          barre.fret > chord.baseFret + 4 ||
          barre.from < 0
        )
          return null;
        const x1 = left + barre.from * spacing;
        const x2 = left + barre.to * spacing;
        const cy = top + (barre.fret - chord.baseFret + 0.5) * fretHeight;
        return (
          <rect
            key={`barre-${idx}`}
            x={x1 - 8}
            y={cy - 7}
            width={x2 - x1 + 16}
            height={14}
            rx={7}
            className="chord-barre"
          />
        );
      })}
      {chord.frets.map((fret, index) => {
        const x = left + index * spacing;
        if (fret === -1)
          return (
            <path
              key={index}
              d={`M ${x - 4} 13 l 8 8 M ${x + 4} 13 l -8 8`}
              className="chord-mute"
            />
          );
        if (fret === 0)
          return (
            <circle key={index} cx={x} cy={17} r={4.5} className="chord-open" />
          );
        if (fret < chord.baseFret || fret > chord.baseFret + 4) return null;
        const cy = top + (fret - chord.baseFret + 0.5) * fretHeight;
        const finger = chord.fingers?.[index] ?? 0;
        return (
          <g key={index}>
            <circle cx={x} cy={cy} r={8} className="chord-dot" />
            {finger > 0 && (
              <text
                x={x}
                y={cy + 4}
                className="chord-finger"
                textAnchor="middle"
              >
                {finger}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

type Draft = { name: string; baseFret: string; frets: string[] };

function validateDraft(draft: Draft) {
  const errors: { name?: string; baseFret?: string; frets?: string } = {};
  const base = Number(draft.baseFret);
  if (!draft.name.trim()) errors.name = "Укажите название аккорда.";
  if (
    !draft.baseFret.trim() ||
    !Number.isInteger(base) ||
    base < 1 ||
    base > 20
  )
    errors.baseFret = "Начальный лад — целое число от 1 до 20.";
  if (
    draft.frets.length !== 6 ||
    draft.frets.some(
      (value) =>
        !value.trim() ||
        !Number.isInteger(Number(value)) ||
        Number(value) < -1 ||
        Number(value) > 24,
    )
  ) {
    errors.frets = "Для каждой струны введите целое число от −1 до 24.";
  } else if (
    !errors.baseFret &&
    draft.frets.some(
      (value) =>
        Number(value) > 0 && (Number(value) < base || Number(value) > base + 4),
    )
  ) {
    errors.frets = `Зажатые струны должны находиться в пределах ${base}–${base + 4} ладов. Измените начальный лад или аппликатуру.`;
  }
  return errors;
}

function ChordEditor({
  chord,
  onSave,
  onDelete,
  onClose,
}: {
  chord: Chord | null;
  onSave: (chord: Chord) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const prefix = useId();
  const [draft, setDraft] = useState<Draft>(() => ({
    name: chord?.name ?? "",
    baseFret: String(chord?.baseFret ?? 1),
    frets: chord?.frets.map(String) ?? ["-1", "0", "2", "2", "1", "0"],
  }));
  const [submitted, setSubmitted] = useState(false);
  const [saveError, setSaveError] = useState("");
  const errors = validateDraft(draft);
  const isValid = Object.keys(errors).length === 0;
  const canPreview = !errors.baseFret && !errors.frets;

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialog?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setSaveError("");
    if (!isValid) {
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    try {
      onSave({
        id: chord?.id ?? uid(),
        name: draft.name.trim(),
        baseFret: Number(draft.baseFret),
        frets: draft.frets.map(Number),
      });
      onClose();
    } catch {
      setSaveError("Не удалось сохранить аккорд. Попробуйте ещё раз.");
      requestAnimationFrame(() => errorRef.current?.focus());
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="modal chord-editor"
      aria-labelledby={`${prefix}-title`}
      aria-describedby={`${prefix}-description`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <form noValidate onSubmit={submit}>
        <div className="modal-header chord-editor-header">
          <div>
            <p className="eyebrow">ВАША АППЛИКАТУРА</p>
            <h2 id={`${prefix}-title`}>
              {chord ? "Редактировать аккорд" : "Новый аккорд"}
            </h2>
          </div>
          <button
            type="button"
            className="btn-icon"
            aria-label="Закрыть редактор аккорда"
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <p id={`${prefix}-description`} className="chord-editor-description">
          Сохраните удобную позицию. У одного аккорда может быть несколько
          аппликатур.
        </p>
        <div className="chord-editor-layout">
          <div className="chord-editor-fields">
            <label className="field" htmlFor={`${prefix}-name`}>
              Название аккорда
              <input
                id={`${prefix}-name`}
                autoFocus
                required
                value={draft.name}
                placeholder="Например, Am или F#m7"
                aria-invalid={submitted && !!errors.name}
                aria-describedby={
                  submitted && errors.name ? `${prefix}-errors` : undefined
                }
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
              />
            </label>
            <label className="field" htmlFor={`${prefix}-base`}>
              Начальный лад
              <input
                id={`${prefix}-base`}
                type="number"
                min={1}
                max={20}
                step={1}
                required
                value={draft.baseFret}
                aria-invalid={submitted && !!errors.baseFret}
                aria-describedby={`${prefix}-range${submitted && errors.baseFret ? ` ${prefix}-errors` : ""}`}
                onChange={(event) =>
                  setDraft({ ...draft, baseFret: event.target.value })
                }
              />
            </label>
            <p id={`${prefix}-range`} className="chord-field-hint">
              На схеме всегда пять ладов. Начальная позиция — от 1 до 20.
            </p>
            <fieldset
              className="chord-fret-fieldset"
              aria-describedby={`${prefix}-fret-help${submitted && errors.frets ? ` ${prefix}-errors` : ""}`}
            >
              <legend>Лады на струнах</legend>
              <div className="chord-fret-inputs">
                {strings.map((string, index) => (
                  <label
                    className="field"
                    key={string}
                    htmlFor={`${prefix}-string-${index}`}
                  >
                    <span>
                      {string}
                      <small>{6 - index}</small>
                    </span>
                    <input
                      id={`${prefix}-string-${index}`}
                      type="number"
                      min={-1}
                      max={24}
                      step={1}
                      required
                      aria-label={`${6 - index}-я струна ${string}, лад`}
                      aria-invalid={submitted && !!errors.frets}
                      value={draft.frets[index]}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          frets: draft.frets.map((value, fretIndex) =>
                            fretIndex === index ? event.target.value : value,
                          ),
                        })
                      }
                    />
                  </label>
                ))}
              </div>
            </fieldset>
            <p id={`${prefix}-fret-help`} className="chord-field-hint">
              От толстой E к тонкой e. −1 — не звучит, 0 — открытая струна, 1–24
              — номер лада.
            </p>
          </div>
          <div className="chord-preview">
            <span className="eyebrow">ПРЕДПРОСМОТР</span>
            <h3>{draft.name.trim() || "Ваш аккорд"}</h3>
            {canPreview ? (
              <ChordDiagram
                chord={{
                  id: "preview",
                  name: draft.name,
                  baseFret: Number(draft.baseFret),
                  frets: draft.frets.map(Number),
                }}
              />
            ) : (
              <p className="chord-preview-hint">
                {errors.baseFret || errors.frets}
              </p>
            )}
            {canPreview && (
              <span className="chord-position">
                {Number(draft.baseFret)}–{Number(draft.baseFret) + 4} лады
              </span>
            )}
          </div>
        </div>
        {((submitted && !isValid) || saveError) && (
          <div
            id={`${prefix}-errors`}
            className="chord-errors"
            role="alert"
            tabIndex={-1}
            ref={errorRef}
          >
            {Object.values(errors).map((error) => (
              <p key={error}>{error}</p>
            ))}
            {saveError && <p>{saveError}</p>}
          </div>
        )}
        <div className="modal-actions chord-editor-actions">
          {onDelete && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                if (
                  window.confirm(
                    `Удалить эту аппликатуру «${chord?.name}» (${chord?.frets.map((f) => (f < 0 ? "x" : f)).join("")})?`,
                  )
                ) {
                  onDelete();
                  onClose();
                }
              }}
            >
              <Trash2 size={16} />
              Удалить
            </button>
          )}
          <button type="button" className="btn" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="btn btn-primary">
            {chord ? "Сохранить изменения" : "Добавить аккорд"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

export function ChordLibrary({
  chords,
  onSave,
  navigate,
}: {
  chords: Chord[];
  onSave: (chord: Chord) => void;
  navigate: (route: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [root, setRoot] = useState<number | null>(null);
  const [editor, setEditor] = useState<{ chord: Chord | null } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const searchId = useId();
  const INITIAL_LIMIT = 60;
  // Group chords by name, keep first voicing as the card preview
  const grouped = useMemo(() => {
    const map = new Map<string, Chord[]>();
    for (const chord of chords) {
      const list = map.get(chord.name) ?? [];
      list.push(chord);
      map.set(chord.name, list);
    }
    return [...map.entries()].map(([name, voicings]) => ({
      name,
      voicings,
      preview: voicings[0],
    }));
  }, [chords]);
  const visible = useMemo(() => {
    const filtered = grouped.filter(
      (entry) =>
        normalize(entry.name).includes(normalize(query)) &&
        (root === null || chordRoot(entry.name) === root),
    );
    return showAll || filtered.length <= INITIAL_LIMIT
      ? filtered
      : filtered.slice(0, INITIAL_LIMIT);
  }, [grouped, query, root, showAll]);

  return (
    <section className="chord-library" aria-label="Библиотека аккордов">
      <div className="page-heading chord-page-heading">
        <div>
          <p className="eyebrow">ПОД РУКОЙ, НА КАЖДОЙ РЕПЕТИЦИИ</p>
          <h1>Библиотека аккордов</h1>
          <p className="chord-page-description">
            Знакомые созвучия и новые находки. Ваша коллекция аппликатур.
          </p>
        </div>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => setEditor({ chord: null })}
        >
          <Plus size={18} aria-hidden="true" />
          Добавить аккорд
        </button>
      </div>
      <div className="chord-toolbar">
        <div className="chord-search">
          <Search size={19} aria-hidden="true" />
          <label className="chord-sr-only" htmlFor={searchId}>
            Поиск аккорда по названию
          </label>
          <input
            id={searchId}
            type="search"
            placeholder="Найти аккорд, например Am"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button
              type="button"
              className="btn-icon chord-search-clear"
              aria-label="Очистить поиск"
              onClick={() => setQuery("")}
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="chord-filter-label">
          <SlidersHorizontal size={16} aria-hidden="true" />
          Основной тон
        </div>
        <div
          className="chord-root-filters"
          role="group"
          aria-label="Фильтр по основному тону"
        >
          <button
            className={`chord-root${root === null ? " chord-root-active" : ""}`}
            type="button"
            aria-pressed={root === null}
            onClick={() => setRoot(null)}
          >
            Все
          </button>
          {roots.map((label, index) => (
            <button
              className={`chord-root${root === index ? " chord-root-active" : ""}`}
              type="button"
              key={label}
              aria-pressed={root === index}
              onClick={() => setRoot(index)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="chord-results-bar">
        <p role="status">
          Аккордов{" "}
          <span>
            {visible.length}
            {visible.length !== grouped.length ? ` / ${grouped.length}` : ""}
          </span>
        </p>
        <p className="chord-legend">
          <span>○ — открытая</span>
          <span>× — не звучит</span>
        </p>
      </div>
      {visible.length ? (
        <>
          <div className="chord-grid">
            {visible.map((entry) => (
              <button
                type="button"
                className="chord-card"
                key={entry.name}
                onClick={() => navigate(`chord/${entry.name}`)}
                aria-label={`${entry.name}, ${entry.voicings.length} аппликатур(а)`}
              >
                <span className="chord-card-heading">
                  <span className="chord-card-name">{entry.name}</span>
                  <span className="chord-card-count">
                    {entry.voicings.length}
                  </span>
                  <ArrowUpRight
                    size={18}
                    className="chord-card-arrow"
                    aria-hidden="true"
                  />
                </span>
                <span className="chord-position">
                  {entry.preview.baseFret === 1
                    ? "Первая позиция"
                    : `Позиция с ${entry.preview.baseFret}-го лада`}
                </span>
                <ChordDiagram chord={entry.preview} />
                <span className="chord-card-footer">
                  <span>
                    {entry.preview.frets
                      .map((fret) => (fret < 0 ? "×" : fret))
                      .join(" · ")}
                  </span>
                  <span>Все варианты</span>
                </span>
              </button>
            ))}
          </div>
          {!showAll && visible.length === INITIAL_LIMIT && (
            <div className="chord-load-more">
              <button
                className="btn"
                type="button"
                onClick={() => setShowAll(true)}
              >
                Показать все аккорды
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state chord-empty">
          <Guitar size={36} strokeWidth={1.3} aria-hidden="true" />
          <h2>
            {grouped.length
              ? "Такого аккорда пока нет"
              : "Первый аккорд — начало музыки"}
          </h2>
          <p>
            {grouped.length
              ? "Попробуйте другое название или сбросьте фильтры."
              : "Добавьте любимую аппликатуру, чтобы она всегда была под рукой."}
          </p>
          {grouped.length > 0 && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setQuery("");
                setRoot(null);
              }}
            >
              Сбросить фильтры
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setEditor({ chord: null })}
          >
            <Plus size={17} aria-hidden="true" />
            Добавить аккорд
          </button>
        </div>
      )}
      <p className="chord-library-note">
        Стандартный строй E A D G B e · Номера слева обозначают лады · Нажмите
        на карточку, чтобы увидеть все варианты взятия аккорда
      </p>
      {editor && (
        <ChordEditor
          chord={editor.chord}
          onSave={onSave}
          onClose={() => setEditor(null)}
        />
      )}
    </section>
  );
}

export function ChordDetail({
  name,
  userChords,
  hiddenChordIds = [],
  onSave,
  onDeleteChord,
  onRestore,
  navigate,
}: {
  name: string;
  userChords: Chord[];
  hiddenChordIds?: string[];
  onSave: (chord: Chord) => void;
  onDeleteChord?: (chord: Chord) => void;
  onRestore?: (ids: string[]) => void;
  navigate: (route: string) => void;
}) {
  const [editor, setEditor] = useState<{ chord: Chord | null } | null>(null);
  const voicings = useMemo(
    () => findVoicings(name, userChords, hiddenChordIds),
    [name, userChords, hiddenChordIds],
  );
  const hiddenVoicings = useMemo(
    () =>
      generateBuiltinChords().filter(
        (chord) => chord.name === name && hiddenChordIds.includes(chord.id),
      ),
    [name, hiddenChordIds],
  );
  const parsed = parseChordName(name);
  const typeLabel = parsed
    ? (CHORD_TYPES.find((t) => t.suffix === parsed.suffix)?.label ?? "")
    : "";

  return (
    <section className="chord-library" aria-label={`Аккорд ${name}`}>
      <button className="back-link" onClick={() => navigate("chords")}>
        <ArrowLeft size={16} />
        Библиотека аккордов
      </button>
      <div className="page-heading chord-page-heading">
        <div>
          <p className="eyebrow">{typeLabel || "АППЛИКАТУРА"}</p>
          <h1>{name}</h1>
          <p className="chord-page-description">
            {voicings.length} аппликатур(а) в базе · Строй E A D G B e
          </p>
        </div>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => setEditor({ chord: null })}
        >
          <Plus size={18} aria-hidden="true" />
          Добавить вариант
        </button>
      </div>
      {voicings.length ? (
        <div className="chord-grid">
          {voicings.map((chord, index) => (
            <button
              type="button"
              className="chord-card"
              key={chord.id}
              onClick={() => setEditor({ chord })}
              aria-label={`Вариант ${index + 1}, позиция ${chord.baseFret}, редактировать`}
            >
              <span className="chord-card-heading">
                <span className="chord-card-name">
                  {name}{" "}
                  <span className="chord-card-variant">#{index + 1}</span>
                </span>
                <ArrowUpRight
                  size={18}
                  className="chord-card-arrow"
                  aria-hidden="true"
                />
              </span>
              <span className="chord-position">
                {chord.baseFret === 1
                  ? "Первая позиция"
                  : `Позиция с ${chord.baseFret}-го лада`}
              </span>
              <ChordDiagram chord={chord} />
              <span className="chord-card-footer">
                <span>
                  {chord.frets
                    .map((fret) => (fret < 0 ? "×" : fret))
                    .join(" · ")}
                </span>
                <span>Изменить</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-state chord-empty">
          <Guitar size={36} strokeWidth={1.3} aria-hidden="true" />
          <h2>Нет аппликатур для {name}</h2>
          <p>Добавьте свой вариант взятия этого аккорда.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setEditor({ chord: null })}
          >
            <Plus size={17} aria-hidden="true" />
            Добавить вариант
          </button>
        </div>
      )}
      {hiddenVoicings.length > 0 && onRestore && (
        <p className="chord-restore">
          Скрыто аппликатур: {hiddenVoicings.length}
          <button
            type="button"
            className="btn btn-small"
            onClick={() => onRestore(hiddenVoicings.map((chord) => chord.id))}
          >
            <Undo2 size={14} aria-hidden="true" />
            Вернуть скрытые
          </button>
        </p>
      )}
      {editor && (
        <ChordEditor
          chord={
            editor.chord ?? (voicings[0] ? { ...voicings[0], id: uid() } : null)
          }
          onSave={onSave}
          onDelete={
            editor.chord && onDeleteChord
              ? () => onDeleteChord(editor.chord!)
              : undefined
          }
          onClose={() => setEditor(null)}
        />
      )}
    </section>
  );
}

function CagedShapeCard({
  shape,
  quality,
}: {
  shape: CagedShape;
  quality: "Мажор" | "Минор";
}) {
  const chord: Chord = {
    id: `caged-${shape.shapeName}-${quality}`,
    name: quality === "Мажор" ? shape.rootName : shape.rootName + "m",
    frets: shape.frets,
    baseFret: 1,
  };
  return (
    <div className="caged-card">
      <div className="caged-card-header">
        <span className="caged-shape-name">{shape.shapeName}</span>
        <span className="caged-root">
          {quality === "Мажор" ? shape.rootName : shape.rootName + "m"}
        </span>
      </div>
      <ChordDiagram chord={chord} />
      <p className="caged-description">{shape.description}</p>
    </div>
  );
}

export function CagedSystem({
  navigate,
}: {
  navigate: (route: string) => void;
}) {
  return (
    <section className="chord-library" aria-label="Система CAGED">
      <button className="back-link" onClick={() => navigate("chords")}>
        <ArrowLeft size={16} />
        Библиотека аккордов
      </button>
      <div className="page-heading chord-page-heading">
        <div>
          <p className="eyebrow">ПОДВИЖНЫЕ ФОРМЫ ПО ГРИФУ</p>
          <h1>Система CAGED</h1>
          <p className="chord-page-description">
            Пять открытых форм аккордов — C, A, G, E, D — которые можно
            перемещать вдоль грифа, получая новые аккорды.
          </p>
        </div>
      </div>
      <div className="caged-intro">
        <p>
          Название системы складывается из пяти базовых мажорных аккордов:{" "}
          <strong>C</strong>, <strong>A</strong>, <strong>G</strong>,{" "}
          <strong>E</strong>, <strong>D</strong>. Каждый из них — это отдельная
          «форма» на грифе. Если взять любую форму и сдвинуть её на <em>N</em>{" "}
          ладов вверх, получится новый аккорд, корень которого на <em>N</em>{" "}
          полутонов выше.
        </p>
        <p>
          Например, <strong>E-форма</strong> на 1-м ладу даёт F, на 3-м — G, на
          5-м — A. <strong>A-форма</strong> на 3-м ладу даёт C — это
          классическое баррэ <code>x35553</code>.
        </p>
        <p>
          Открытые струны при перемещении превращаются в баррэ: указательный
          палец зажимает все струны на нужном ладу, а остальные пальцы берут
          форму поверх баррэ.
        </p>
      </div>
      <h2 className="subheading caged-section-title">Мажорные формы</h2>
      <div className="caged-grid">
        {CAGED_MAJOR_SHAPES.map((shape) => (
          <CagedShapeCard key={shape.shapeName} shape={shape} quality="Мажор" />
        ))}
      </div>
      <h2 className="subheading caged-section-title">Минорные формы</h2>
      <div className="caged-grid">
        {CAGED_MINOR_SHAPES.map((shape) => (
          <CagedShapeCard key={shape.shapeName} shape={shape} quality="Минор" />
        ))}
      </div>
      <p className="chord-library-note">
        Формы C, A, G, E, D расположены по порядку вдоль грифа. E- и A-формы —
        самые удобные для баррэ. C- и G-формы реже используются как полные
        баррэ, но важны для понимания грифа и соло-аккомпанемента.
      </p>
    </section>
  );
}
