import type { Band, Song } from "../lib/model";
import { BandGrid } from "../components/catalog/BandGrid";
import { SongList } from "../components/catalog/SongList";

export function SearchResultsPage({
  query,
  matchingBands,
  matchingSongs,
  songs,
  bands,
  layout,
  onToggleFavorite,
  navigate,
  empty,
}: {
  query: string;
  matchingBands: Band[];
  matchingSongs: Song[];
  songs: Song[];
  bands: Band[];
  layout: "grid" | "list";
  onToggleFavorite: (song: Song) => void;
  navigate: (route: string) => void;
  empty: React.ReactNode;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ПОИСК ПО БИБЛИОТЕКЕ</span>
          <h1>Нашлось по запросу «{query}»</h1>
          <p>
            {matchingBands.length} групп · {matchingSongs.length} песен
          </p>
        </div>
      </div>
      {matchingBands.length > 0 && (
        <>
          <h2 className="subheading">Группы</h2>
          <BandGrid
            bands={matchingBands}
            songs={songs}
            layout={layout}
            navigate={navigate}
          />
        </>
      )}
      <h2 className="subheading">Песни</h2>
      <SongList
        songs={matchingSongs}
        bands={bands}
        onToggleFavorite={onToggleFavorite}
        navigate={navigate}
        empty={empty}
      />
    </>
  );
}
