import { Guitar, Heart, Music2 } from "lucide-react";
import type { ReactNode } from "react";
import type { Band, Song } from "../../lib/model";

export function SongList({
  songs,
  bands,
  withBand = true,
  onToggleFavorite,
  navigate,
  empty,
}: {
  songs: Song[];
  bands: Band[];
  withBand?: boolean;
  onToggleFavorite: (song: Song) => void;
  navigate: (route: string) => void;
  empty: ReactNode;
}) {
  if (!songs.length) return <>{empty}</>;
  return (
    <div className="song-list">
      <div className="song-list-head">
        <span>#</span>
        <span>НАЗВАНИЕ ПЕСНИ</span>
        <span>ТОНАЛЬНОСТЬ</span>
        <span>ПАРТИИ</span>
        <span />
      </div>
      {songs.map((song, i) => (
        <div className="song-row" key={song.id}>
          <span className="song-number">{String(i + 1).padStart(2, "0")}</span>
          <button
            className="song-row-title"
            onClick={() => navigate(`song/${song.id}`)}
          >
            <span className="song-icon">
              <Music2 size={20} />
            </span>
            <span>
              <strong>{song.title}</strong>
              {withBand && (
                <small>
                  {bands.find((band) => band.id === song.bandId)?.name}
                </small>
              )}
            </span>
          </button>
          <span className="song-key">{song.key || "—"}</span>
          <span className="part-count">
            {song.parts.length ? (
              <>
                <Guitar size={14} />
                {song.parts.length}
              </>
            ) : (
              "—"
            )}
          </span>
          <button
            className={`btn-icon favorite ${song.favorite ? "is-favorite" : ""}`}
            aria-label={`${song.favorite ? "Убрать из избранного" : "В избранное"}: ${song.title}`}
            onClick={() => onToggleFavorite(song)}
          >
            <Heart size={17} fill={song.favorite ? "currentColor" : "none"} />
          </button>
        </div>
      ))}
    </div>
  );
}
