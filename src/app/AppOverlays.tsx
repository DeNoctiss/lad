import type { RefObject } from "react";
import { X } from "lucide-react";
import type { Band, Song } from "../lib/model";
import { BandEditor } from "../components/editors/BandEditor";
import { SongEditor } from "../components/editors/SongEditor";
import type { Chord } from "../lib/model";

export function AppOverlays({
  importRef,
  onImportFile,
  bandEditor,
  songEditor,
  songs,
  bands,
  currentBandId,
  chords,
  notice,
  onSaveBand,
  onDeleteBand,
  onSaveSong,
  onDeleteSong,
  onCloseBandEditor,
  onCloseSongEditor,
  onCloseNotice,
}: {
  importRef: RefObject<HTMLInputElement | null>;
  onImportFile: (file?: File) => void;
  bandEditor: Band | "new" | null;
  songEditor: Song | "new" | null;
  songs: Song[];
  bands: Band[];
  currentBandId?: string;
  chords: Chord[];
  notice: string;
  onSaveBand: (band: Band) => void;
  onDeleteBand: (band: Band) => void;
  onSaveSong: (song: Song) => void;
  onDeleteSong: (song: Song) => void;
  onCloseBandEditor: () => void;
  onCloseSongEditor: () => void;
  onCloseNotice: () => void;
}) {
  return (
    <>
      <input
        ref={importRef}
        type="file"
        accept=".json,application/json"
        hidden
        aria-label="Импорт резервной копии"
        onChange={(event) => {
          onImportFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {bandEditor && (
        <BandEditor
          band={bandEditor === "new" ? undefined : bandEditor}
          songsCount={
            bandEditor === "new"
              ? 0
              : songs.filter((song) => song.bandId === bandEditor.id).length
          }
          onSave={onSaveBand}
          onDelete={
            bandEditor === "new" ? undefined : () => onDeleteBand(bandEditor)
          }
          onClose={onCloseBandEditor}
        />
      )}
      {songEditor && (
        <SongEditor
          song={songEditor === "new" ? undefined : songEditor}
          bands={bands}
          bandId={currentBandId}
          chords={chords}
          onSave={onSaveSong}
          onDelete={
            songEditor === "new" ? undefined : () => onDeleteSong(songEditor)
          }
          onClose={onCloseSongEditor}
        />
      )}
      {notice && (
        <div className="toast" role="status">
          <span>{notice}</span>
          <button
            className="btn-icon"
            aria-label="Закрыть уведомление"
            onClick={onCloseNotice}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </>
  );
}
