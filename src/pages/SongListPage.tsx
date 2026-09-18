import { FolderHeart, Plus } from "lucide-react";
import type { Band, Song } from "../lib/model";
import { SongList } from "../components/catalog/SongList";

export function SongListPage({
  route,
  songs,
  bands,
  onNewSong,
  onToggleFavorite,
  navigate,
  empty,
}: {
  route: "songs" | "favorites";
  songs: Song[];
  bands: Band[];
  onNewSong: () => void;
  onToggleFavorite: (song: Song) => void;
  navigate: (route: string) => void;
  empty: React.ReactNode;
}) {
  const favorites = route === "favorites";
  return (
    <>
      <div className="page-heading collection-heading">
        <div>
          <span className="eyebrow">ВАША МУЗЫКА, БЕЗ ЛИШНЕГО</span>
          <h1>{favorites ? "Особенное — рядом" : "Все песни"}</h1>
          <p>
            {favorites
              ? "Любимые песни для правильного настроения."
              : "Каждая песня на своём месте."}
          </p>
        </div>
        {favorites ? (
          <FolderHeart
            className="heading-decoration"
            size={54}
            strokeWidth={1}
          />
        ) : (
          <button className="btn btn-primary" onClick={onNewSong}>
            <Plus size={17} />
            Добавить песню
          </button>
        )}
      </div>
      <SongList
        songs={songs}
        bands={bands}
        onToggleFavorite={onToggleFavorite}
        navigate={navigate}
        empty={empty}
      />
    </>
  );
}
