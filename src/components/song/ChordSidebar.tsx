import { useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { Chord, Song } from "../../lib/model";
import { ChordDiagram } from "../chords/ChordDiagram";

export function ChordSidebar({
  song,
  songChords,
  chords,
  onUpdate,
  navigate,
}: {
  song: Song;
  songChords: string[];
  chords: Chord[];
  onUpdate: (song: Song) => void;
  navigate: (route: string) => void;
}) {
  const [positions, setPositions] = useState<Record<string, string>>({});
  return (
    <div className="chord-sidebar">
      <div className="chord-sidebar-heading">
        <h3>Аккорды песни</h3>
        <span className="count-badge">{songChords.length}</span>
      </div>
      <p>Строй: E A D G B e</p>
      <div className="song-chord-grid">
        {songChords.map((name) => {
          const variants = chords.filter((item) => item.name === name);
          const savedId = song.defaultVoicings?.[name];
          const chord =
            variants.find((item) => item.id === savedId) ??
            variants.find((item) => item.id === positions[name]) ??
            variants[0];
          const variantIndex = chord
            ? variants.findIndex((v) => v.id === chord.id)
            : -1;
          function setVoicing(id: string) {
            setPositions((current) => ({ ...current, [name]: id }));
            const voicings = { ...song.defaultVoicings, [name]: id };
            onUpdate({ ...song, defaultVoicings: voicings });
          }
          return chord ? (
            <div className="song-chord" key={name}>
              <strong>{name}</strong>
              <ChordDiagram chord={chord} compact />
              {variants.length > 1 && (
                <div className="song-chord-switcher">
                  <button
                    type="button"
                    className="btn-icon song-chord-arrow"
                    aria-label={`Предыдущая аппликатура ${name}`}
                    disabled={variantIndex <= 0}
                    onClick={() => setVoicing(variants[variantIndex - 1].id)}
                  >
                    <ChevronLeft size={16} aria-hidden="true" />
                  </button>
                  <span className="song-chord-position">
                    {variantIndex + 1}/{variants.length}
                  </span>
                  <button
                    type="button"
                    className="btn-icon song-chord-arrow"
                    aria-label={`Следующая аппликатура ${name}`}
                    disabled={variantIndex >= variants.length - 1}
                    onClick={() => setVoicing(variants[variantIndex + 1].id)}
                  >
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                  <select
                    aria-label={`Аппликатура ${name}`}
                    value={chord.id}
                    onChange={(event) => setVoicing(event.target.value)}
                  >
                    {variants.map((variant, index) => (
                      <option key={variant.id} value={variant.id}>
                        {index + 1}: с {variant.baseFret} лада
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : (
            <div className="missing-chord" key={name}>
              <strong>{name}</strong>
              <span>Нет аппликатуры</span>
              <button onClick={() => navigate("chords")}>
                Добавить <Plus size={12} />
              </button>
            </div>
          );
        })}
      </div>
      {!songChords.length && (
        <p className="muted">Добавьте аккорды в редакторе песни.</p>
      )}
      <button className="chord-library-link" onClick={() => navigate("chords")}>
        Библиотека аккордов
        <ArrowUpRight size={16} />
      </button>
    </div>
  );
}
