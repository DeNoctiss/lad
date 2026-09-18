import {
  ArrowUpRight,
  Disc3,
  LayoutGrid,
  List,
  Music2,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import type { Band, Song } from "../lib/model";
import { plural } from "../lib/plural";
import { BandGrid } from "../components/catalog/BandGrid";

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
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-label">
            <span />
            ВАШ ЛИЧНЫЙ ПЕСЕННИК
          </span>
          <h1>
            Хорошая музыка
            <br />
            начинается с <em>пары аккордов.</em>
          </h1>
          <p>
            Любимые группы, тексты и табы.
            <br />
            Всё в одном месте — осталось взять гитару.
          </p>
          <button className="hero-link" onClick={onNewSong}>
            Записать новую песню
            <ArrowUpRight size={17} />
          </button>
        </div>
        <div className="hero-illustration" aria-hidden="true">
          <span className="orbit orbit-one" />
          <span className="orbit orbit-two" />
          <span className="orbit orbit-three" />
          <div className="record">
            <div className="record-label">
              <span>СТОРОНА А</span>
              <Music2 size={34} strokeWidth={1} />
              <span>МУЗЫКА ВНУТРИ</span>
            </div>
          </div>
          <div className="hero-note">
            настроено на вдохновение <span>↗</span>
          </div>
          <span className="spark spark-one">
            <Plus size={35} strokeWidth={1} />
          </span>
          <span className="spark spark-two">+</span>
          <span className="spark spark-three">
            <Music2 size={26} strokeWidth={1.2} />
          </span>
        </div>
        <span className="hero-number">ВЫПУСК 001 / ВАША КОЛЛЕКЦИЯ</span>
      </section>
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
