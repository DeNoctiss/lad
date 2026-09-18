import { useId, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Guitar,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { Chord } from "../lib/model";
import { ChordDiagram } from "../components/chords/ChordDiagram";
import { ChordEditor } from "../components/chords/ChordEditor";
import { chordRoot, normalize, roots } from "../components/chords/chordUtils";
import { EmptyState } from "../components/ui/EmptyState";
import "../styles/chords.css";

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
        <EmptyState
          className="chord-empty"
          icon={<Guitar size={36} strokeWidth={1.3} aria-hidden="true" />}
          titleAs="h2"
          title={
            grouped.length
              ? "Такого аккорда пока нет"
              : "Первый аккорд — начало музыки"
          }
          action={
            <>
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
            </>
          }
        >
          {grouped.length
            ? "Попробуйте другое название или сбросьте фильтры."
            : "Добавьте любимую аппликатуру, чтобы она всегда была под рукой."}
        </EmptyState>
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
