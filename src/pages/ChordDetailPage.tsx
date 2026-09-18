import { useMemo, useState } from "react";
import { ArrowUpRight, Guitar, Plus, Undo2 } from "lucide-react";
import { uid } from "../lib/model";
import type { Chord } from "../lib/model";
import {
  findVoicings,
  generateBuiltinChords,
  parseChordName,
  CHORD_TYPES,
} from "../lib/chordDatabase";
import { ChordDiagram } from "../components/chords/ChordDiagram";
import { ChordEditor } from "../components/chords/ChordEditor";
import { BackLink } from "../components/ui/BackLink";
import { EmptyState } from "../components/ui/EmptyState";

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
      <BackLink onClick={() => navigate("chords")}>
        Библиотека аккордов
      </BackLink>
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
        <EmptyState
          className="chord-empty"
          icon={<Guitar size={36} strokeWidth={1.3} aria-hidden="true" />}
          titleAs="h2"
          title={`Нет аппликатур для ${name}`}
          action={
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setEditor({ chord: null })}
            >
              <Plus size={17} aria-hidden="true" />
              Добавить вариант
            </button>
          }
        >
          Добавьте свой вариант взятия этого аккорда.
        </EmptyState>
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
