import { Disc3, Pencil, Plus } from "lucide-react";
import type { Band, Song } from "../lib/model";
import { plural } from "../lib/plural";
import { SongList } from "../components/catalog/SongList";
import { BackLink } from "../components/ui/BackLink";

export function BandPage({
  band,
  songs,
  bands,
  onEditBand,
  onNewSong,
  onToggleFavorite,
  navigate,
  empty,
}: {
  band: Band;
  songs: Song[];
  bands: Band[];
  onEditBand: () => void;
  onNewSong: () => void;
  onToggleFavorite: (song: Song) => void;
  navigate: (route: string) => void;
  empty: React.ReactNode;
}) {
  return (
    <>
      <BackLink onClick={() => navigate("bands")}>Все группы</BackLink>
      <section className="band-page-heading">
        <div className={`band-avatar cover-${band.color}`}>
          <Disc3 size={43} strokeWidth={1} />
          <span>{band.initials}</span>
        </div>
        <div>
          <span className="eyebrow">{band.genre} / ИСПОЛНИТЕЛЬ</span>
          <h1>{band.name}</h1>
          <p>
            {plural(songs.length, ["песня", "песни", "песен"])} в вашей
            коллекции
          </p>
        </div>
        <button
          className="btn-icon"
          aria-label="Редактировать группу"
          onClick={onEditBand}
        >
          <Pencil size={18} />
        </button>
      </section>
      <div className="page-heading">
        <h2>Песни группы</h2>
        <button className="btn btn-primary" onClick={onNewSong}>
          <Plus size={17} />
          Добавить песню
        </button>
      </div>
      <SongList
        songs={songs}
        bands={bands}
        withBand={false}
        onToggleFavorite={onToggleFavorite}
        navigate={navigate}
        empty={empty}
      />
    </>
  );
}
