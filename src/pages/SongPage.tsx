import { useState } from "react";
import type { Band, Chord, Song, TabPart } from "../lib/model";
import { extractChords } from "../lib/model";
import { PartEditor } from "../components/editors/PartEditor";
import { LyricsView } from "../components/song/LyricsView";
import { PartsPanel } from "../components/song/PartsPanel";
import { ChordSidebar } from "../components/song/ChordSidebar";
import { SongHeader } from "../components/song/SongHeader";
import { SheetToolbar } from "../components/song/SheetToolbar";
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
  const [activePartId, setActivePartId] = useState<string | null>(
    song.parts[0]?.id ?? null,
  );
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
    setActivePartId(part.id);
  };
  return (
    <>
      <BackLink onClick={() => navigate(`band/${band.id}`)}>
        {band.name}
      </BackLink>
      <SongHeader
        song={song}
        band={band}
        onToggleFavorite={() => onUpdate({ ...song, favorite: !song.favorite })}
        onEdit={onEdit}
      />
      <div className="song-mode-bar">
        <SheetToolbar
          tab={tab}
          partsCount={song.parts.length}
          fontSize={fontSize}
          onTabChange={setTab}
          onFontSizeChange={setFontSize}
        />
      </div>
      <div
        className={`song-layout ${tab === "tabs" ? "song-layout-tabs" : "song-layout-lyrics"}`}
      >
        <section
          className="song-sheet"
          id={`song-panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`song-tab-${tab}`}
        >
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
              activePartId={activePartId}
              onSelectPart={setActivePartId}
            />
          )}
          <div className="sheet-footer">
            <span>ЛАД / ЛИЧНЫЙ ПЕСЕННИК</span>
            <span>
              {band.name} — {song.title}
            </span>
          </div>
        </section>
        {tab === "lyrics" && (
          <aside className="song-aside">
            <ChordSidebar
              song={song}
              songChords={songChords}
              chords={chords}
              onUpdate={onUpdate}
              navigate={navigate}
            />
          </aside>
        )}
      </div>
      {partEditor && (
        <PartEditor
          key={partEditor === "new" ? "new" : partEditor.id}
          part={partEditor === "new" ? undefined : partEditor}
          parts={song.parts}
          songTitle={song.title}
          onSwitchPart={setPartEditor}
          onLyrics={() => {
            setPartEditor(null);
            setTab("lyrics");
          }}
          bpm={song.bpm}
          onSave={savePart}
          onClose={() => setPartEditor(null)}
        />
      )}
    </>
  );
}
