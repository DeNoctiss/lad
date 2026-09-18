import { useState } from "react";
import {
  Clock3,
  Guitar,
  Heart,
  Minus,
  Music2,
  Pencil,
  Plus,
  Printer,
} from "lucide-react";
import type { Band, Chord, Song, TabPart } from "../lib/model";
import { extractChords } from "../lib/model";
import { PartEditor } from "../components/editors/PartEditor";
import { LyricsView } from "../components/song/LyricsView";
import { PartsPanel } from "../components/song/PartsPanel";
import { ChordSidebar } from "../components/song/ChordSidebar";
import { BackLink } from "../components/ui/BackLink";

export function SongView({
  song,
  band,
  chords,
  onUpdate,
  onEdit,
  navigate,
}: {
  song: Song;
  band: Band;
  chords: Chord[];
  onUpdate: (song: Song) => void;
  onEdit: () => void;
  navigate: (route: string) => void;
}) {
  const [tab, setTab] = useState<"lyrics" | "tabs">("lyrics");
  const [fontSize, setFontSize] = useState(18);
  const [partEditor, setPartEditor] = useState<TabPart | "new" | null>(null);
  const songChords = [
    ...new Set([...extractChords(song.lyrics), ...song.chords]),
  ];
  const savePart = (part: TabPart) => {
    onUpdate({
      ...song,
      parts: song.parts.some((item) => item.id === part.id)
        ? song.parts.map((item) => (item.id === part.id ? part : item))
        : [...song.parts, part],
      updatedAt: new Date().toISOString(),
    });
    setPartEditor(null);
  };
  return (
    <>
      <BackLink onClick={() => navigate(`band/${band.id}`)}>
        {band.name}
      </BackLink>
      <div className="song-heading">
        <div>
          <span className="eyebrow">{band.genre} / ПЕСНЯ</span>
          <h1>{song.title}</h1>
          <div className="song-meta">
            <span>
              <Music2 size={15} />
              {song.key || "Без тональности"}
            </span>
            <span>
              <Clock3 size={15} />
              {song.bpm} BPM
            </span>
            <span>
              <Guitar size={15} />
              {song.capo ? `Каподастр: ${song.capo} лад` : "Без каподастра"}
            </span>
          </div>
        </div>
        <div className="heading-actions">
          <button
            className={`btn-icon favorite ${song.favorite ? "is-favorite" : ""}`}
            aria-label={song.favorite ? "Убрать из избранного" : "В избранное"}
            aria-pressed={song.favorite}
            onClick={() => onUpdate({ ...song, favorite: !song.favorite })}
          >
            <Heart size={20} fill={song.favorite ? "currentColor" : "none"} />
          </button>
          <button className="btn" onClick={onEdit}>
            <Pencil size={16} />
            Редактировать
          </button>
        </div>
      </div>
      <div className="song-layout">
        <section className="song-sheet">
          <div className="sheet-toolbar">
            <div
              className="sheet-tabs"
              role="tablist"
              aria-label="Содержимое песни"
            >
              <button
                role="tab"
                aria-selected={tab === "lyrics"}
                onClick={() => setTab("lyrics")}
                className={tab === "lyrics" ? "active" : ""}
              >
                Текст и аккорды
              </button>
              <button
                role="tab"
                aria-selected={tab === "tabs"}
                onClick={() => setTab("tabs")}
                className={tab === "tabs" ? "active" : ""}
              >
                Табулатуры <span>{song.parts.length}</span>
              </button>
            </div>
            <div className="sheet-tools">
              {tab === "lyrics" && (
                <>
                  <button
                    className="btn-icon"
                    disabled={fontSize <= 14}
                    aria-label="Уменьшить текст"
                    onClick={() => setFontSize((size) => size - 2)}
                  >
                    <Minus size={15} />
                  </button>
                  <span>Aa</span>
                  <button
                    className="btn-icon"
                    disabled={fontSize >= 28}
                    aria-label="Увеличить текст"
                    onClick={() => setFontSize((size) => size + 2)}
                  >
                    <Plus size={15} />
                  </button>
                </>
              )}
              <button
                className="btn-icon print-button"
                aria-label="Распечатать песню"
                onClick={() => window.print()}
              >
                <Printer size={16} />
              </button>
            </div>
          </div>
          {tab === "lyrics" ? (
            <LyricsView
              lyrics={song.lyrics}
              fontSize={fontSize}
              onEdit={onEdit}
            />
          ) : (
            <PartsPanel
              song={song}
              onUpdate={onUpdate}
              onEditPart={setPartEditor}
            />
          )}
          <div className="sheet-footer">
            <span>ЛАД / ЛИЧНЫЙ ПЕСЕННИК</span>
            <span>
              {band.name} — {song.title}
            </span>
          </div>
        </section>
        <aside className="song-aside">
          <ChordSidebar
            song={song}
            songChords={songChords}
            chords={chords}
            onUpdate={onUpdate}
            navigate={navigate}
          />
          <div className="practice-note">
            <span className="eyebrow">МАЛЕНЬКОЕ НАПОМИНАНИЕ</span>
            <p>
              Не обязательно играть идеально.
              <br />
              Главное — играть.
            </p>
            <div className="note-line" />
          </div>
        </aside>
      </div>
      {partEditor && (
        <PartEditor
          part={partEditor === "new" ? undefined : partEditor}
          onSave={savePart}
          onClose={() => setPartEditor(null)}
        />
      )}
    </>
  );
}
