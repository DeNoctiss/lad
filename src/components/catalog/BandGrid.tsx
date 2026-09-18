import { ArrowUpRight, ChevronRight, Plus } from "lucide-react";
import type { Band, Song } from "../../lib/model";
import { plural } from "../../lib/plural";

export function BandGrid({
  bands,
  songs,
  layout,
  showAdd = false,
  onAdd,
  navigate,
}: {
  bands: Band[];
  songs: Song[];
  layout: "grid" | "list";
  showAdd?: boolean;
  onAdd?: () => void;
  navigate: (route: string) => void;
}) {
  return (
    <div className={`band-grid ${layout === "list" ? "band-list" : ""}`}>
      {bands.map((band) => (
        <button
          className="band-card"
          key={band.id}
          onClick={() => navigate(`band/${band.id}`)}
        >
          <div className={`band-cover cover-${band.color}`}>
            <span className="cover-catalog">
              ЛАД RECORDS / {band.genre.toUpperCase()}
            </span>
            <div className="cover-art">
              <i />
              <i />
              <i />
              <i />
            </div>
            <span className="cover-name">{band.name}</span>
            <span className="cover-initials">{band.initials}</span>
            <span className="cover-arrow">
              <ArrowUpRight size={19} />
            </span>
          </div>
          <div className="band-info">
            <div>
              <h3>{band.name}</h3>
              <p>
                {plural(
                  songs.filter((song) => song.bandId === band.id).length,
                  ["песня", "песни", "песен"],
                )}
              </p>
            </div>
            <ChevronRight size={18} />
          </div>
        </button>
      ))}
      {showAdd && onAdd && (
        <button className="add-band-card" onClick={onAdd}>
          <span>
            <Plus size={25} />
          </span>
          <strong>Новая группа</strong>
          <p>
            Ваша следующая
            <br />
            музыкальная история
          </p>
        </button>
      )}
    </div>
  );
}
