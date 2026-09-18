import { Clock3, Guitar, Heart, Music2, Pencil } from "lucide-react";
import type { Band, Song } from "../../lib/model";

export function SongHeader({
  song,
  band,
  onToggleFavorite,
  onEdit,
}: {
  song: Song;
  band: Band;
  onToggleFavorite: () => void;
  onEdit: () => void;
}) {
  return (
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
          onClick={onToggleFavorite}
        >
          <Heart size={20} fill={song.favorite ? "currentColor" : "none"} />
        </button>
        <button className="btn" onClick={onEdit}>
          <Pencil size={16} />
          Редактировать
        </button>
      </div>
    </div>
  );
}
