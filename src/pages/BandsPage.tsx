import { Disc3, LayoutGrid, List, Plus, SlidersHorizontal } from "lucide-react";
import type { Band, Song } from "../lib/model";
import { plural } from "../lib/plural";
import { BandGrid } from "../components/catalog/BandGrid";
import { Hero } from "../components/catalog/Hero";

export function BandsPage({
  bands,
  songs,
  displayedBands,
  genres,
  genre,
  onGenreChange,
  sort,
  onSortChange,
  layout,
  onLayoutChange,
  onAddBand,
  onNewSong,
  navigate,
}: {
  bands: Band[];
  songs: Song[];
  displayedBands: Band[];
  genres: string[];
  genre: string;
  onGenreChange: (genre: string) => void;
  sort: string;
  onSortChange: (sort: string) => void;
  layout: "grid" | "list";
  onLayoutChange: (layout: "grid" | "list") => void;
  onAddBand: () => void;
  onNewSong: () => void;
  navigate: (route: string) => void;
}) {
  return (
    <>
      <Hero onNewSong={onNewSong} />
      <div className="page-heading library-heading">
        <div>
          <div className="title-with-count">
            <h2>Мои группы</h2>
            <span className="count-badge">{bands.length}</span>
          </div>
          <p>Те, чьи песни хочется играть снова и снова.</p>
        </div>
        <button className="btn btn-primary" onClick={onAddBand}>
          <Plus size={17} />
          Добавить группу
        </button>
      </div>
      <div className="library-toolbar">
        <div className="filter-chips" aria-label="Фильтр по жанру">
          {genres.map((item) => (
            <button
              key={item}
              className={genre === item ? "selected" : ""}
              onClick={() => onGenreChange(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="view-controls">
          <label className="sort-control">
            <SlidersHorizontal size={14} />
            <select
              aria-label="Сортировка групп"
              value={sort}
              onChange={(event) => onSortChange(event.target.value)}
            >
              <option value="added">По добавлению</option>
              <option value="name">По алфавиту</option>
            </select>
          </label>
          <div className="layout-toggle">
            <button
              aria-label="Показать сеткой"
              aria-pressed={layout === "grid"}
              className={layout === "grid" ? "selected" : ""}
              onClick={() => onLayoutChange("grid")}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              aria-label="Показать списком"
              aria-pressed={layout === "list"}
              className={layout === "list" ? "selected" : ""}
              onClick={() => onLayoutChange("list")}
            >
              <List size={17} />
            </button>
          </div>
        </div>
      </div>
      <BandGrid
        bands={displayedBands}
        songs={songs}
        layout={layout}
        showAdd
        onAdd={onAddBand}
        navigate={navigate}
      />
      <div className="library-footer">
        <span>
          <Disc3 size={15} />
          {plural(bands.length, ["группа", "группы", "групп"])}
          <i />
          {plural(songs.length, ["песня", "песни", "песен"])}
          <i />
          Бесконечно много вдохновения
        </span>
        <span>В ритме вашей жизни.</span>
      </div>
      <div className="demo-note">
        Для знакомства добавлена небольшая демо-коллекция с вымышленными
        группами и авторским примером текста.
      </div>
    </>
  );
}
