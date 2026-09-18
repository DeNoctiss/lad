import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  CircleHelp,
  Disc3,
  FolderHeart,
  Guitar,
  Heart,
  LayoutGrid,
  List,
  Menu,
  Music2,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Upload,
  Users,
  X,
} from "lucide-react";
import type { Band, Chord, Library, Song } from "./model";
import { readLibrary, STORAGE_KEY, validateLibrary } from "./model";
import { initialLibrary } from "./seed";
import { allChords } from "./chordDatabase";
import { BandEditor, SongEditor } from "./Editors";
import { ChordLibrary, ChordDetail, CagedSystem } from "./Chords";
import { FretboardPage } from "./Fretboard";
import { SongView } from "./SongView";
import { HelpPage } from "./HelpPage";

function getRoute() {
  try {
    return decodeURIComponent(window.location.hash.slice(1)) || "bands";
  } catch {
    return "bands";
  }
}
const plural = (count: number, forms: [string, string, string]) =>
  `${count} ${forms[count % 100 >= 11 && count % 100 <= 14 ? 2 : count % 10 === 1 ? 0 : count % 10 >= 2 && count % 10 <= 4 ? 1 : 2]}`;

export default function App() {
  const [loaded] = useState(readLibrary);
  const [library, setLibrary] = useState<Library>(
    () => loaded.library ?? structuredClone(initialLibrary),
  );
  const [storageError, setStorageError] = useState<string | null>(loaded.error);
  const [route, setRoute] = useState(getRoute);
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("Все группы");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState("added");
  const [bandEditor, setBandEditor] = useState<Band | "new" | null>(null);
  const [songEditor, setSongEditor] = useState<Song | "new" | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handler = () => {
      setRoute(getRoute());
      setQuery("");
      setSidebarOpen(false);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  useEffect(() => {
    if (loaded.error) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
      setStorageError(null);
    } catch {
      setStorageError(
        "Не удалось сохранить изменения в браузере. Возможно, закончилось место. Скачайте резервную копию, чтобы не потерять данные.",
      );
    }
  }, [library, loaded.error]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const isFindKey =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
      const isSlashKey =
        event.key === "/" &&
        !(event.target as HTMLElement | null)?.closest?.(
          "input, textarea, select, [contenteditable]",
        );
      if (isFindKey || isSlashKey) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  const navigate = (next: string) => {
    setQuery("");
    setSidebarOpen(false);
    window.location.hash = next;
    setRoute(next);
    window.scrollTo(0, 0);
  };
  const currentBand = route.startsWith("band/")
    ? library.bands.find((band) => band.id === route.slice(5))
    : undefined;
  const currentSong = route.startsWith("song/")
    ? library.songs.find((song) => song.id === route.slice(5))
    : undefined;
  const isCaged = route === "caged";
  const isFretboard = route === "fretboard";
  const chordDetailName = route.startsWith("chord/")
    ? decodeURIComponent(route.slice(6))
    : null;
  const songBand = currentSong
    ? library.bands.find((band) => band.id === currentSong.bandId)
    : undefined;
  const favorites = library.songs.filter((song) => song.favorite);
  const recent = [...library.songs]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 3);
  const normalizedQuery = query.trim().toLocaleLowerCase("ru");
  const matchingBands = library.bands.filter((band) =>
    band.name.toLocaleLowerCase("ru").includes(normalizedQuery),
  );
  const matchingSongs = library.songs.filter((song) =>
    `${song.title} ${library.bands.find((band) => band.id === song.bandId)?.name ?? ""}`
      .toLocaleLowerCase("ru")
      .includes(normalizedQuery),
  );
  const genres = [
    "Все группы",
    ...new Set(library.bands.map((band) => band.genre)),
  ];
  const filteredBands = library.bands.filter(
    (band) => genre === "Все группы" || band.genre === genre,
  );
  const displayedBands =
    sort === "name"
      ? [...filteredBands].sort((a, b) => a.name.localeCompare(b.name, "ru"))
      : filteredBands;
  const saveBand = (band: Band) => {
    setLibrary((value) => ({
      ...value,
      bands: value.bands.some((item) => item.id === band.id)
        ? value.bands.map((item) => (item.id === band.id ? band : item))
        : [...value.bands, band],
    }));
    setBandEditor(null);
    setNotice("Группа сохранена");
    if (bandEditor === "new") navigate(`band/${band.id}`);
  };
  const saveSong = (song: Song) => {
    setLibrary((value) => ({
      ...value,
      songs: value.songs.some((item) => item.id === song.id)
        ? value.songs.map((item) => (item.id === song.id ? song : item))
        : [...value.songs, song],
    }));
    setSongEditor(null);
    setNotice("Песня сохранена");
    navigate(`song/${song.id}`);
  };
  const updateSong = (song: Song) =>
    setLibrary((value) => ({
      ...value,
      songs: value.songs.map((item) => (item.id === song.id ? song : item)),
    }));
  const saveChord = (chord: Chord) => {
    setLibrary((value) => ({
      ...value,
      chords: value.chords.some((item) => item.id === chord.id)
        ? value.chords.map((item) => (item.id === chord.id ? chord : item))
        : [...value.chords, chord],
    }));
    setNotice("Аппликатура сохранена");
  };
  const hiddenChordIds = useMemo(
    () => new Set(library.hiddenChords ?? []),
    [library.hiddenChords],
  );
  const visibleChords = useMemo(
    () => allChords(library.chords, hiddenChordIds),
    [library.chords, hiddenChordIds],
  );
  const deleteSong = (song: Song) => {
    setLibrary((value) => ({
      ...value,
      songs: value.songs.filter((item) => item.id !== song.id),
    }));
    setSongEditor(null);
    navigate(`band/${song.bandId}`);
    setNotice("Песня удалена");
  };
  const deleteBand = (band: Band) => {
    setLibrary((value) => ({
      ...value,
      bands: value.bands.filter((item) => item.id !== band.id),
      songs: value.songs.filter((item) => item.bandId !== band.id),
    }));
    setBandEditor(null);
    navigate("bands");
    setNotice("Группа и её песни удалены");
  };
  const deleteChord = (chord: Chord) => {
    setLibrary((value) => {
      if (value.chords.some((item) => item.id === chord.id))
        return {
          ...value,
          chords: value.chords.filter((item) => item.id !== chord.id),
        };
      return {
        ...value,
        hiddenChords: [...(value.hiddenChords ?? []), chord.id],
      };
    });
    setNotice("Аппликатура удалена");
  };
  const restoreChords = (ids: string[]) => {
    const restored = new Set(ids);
    setLibrary((value) => ({
      ...value,
      hiddenChords: (value.hiddenChords ?? []).filter(
        (id) => !restored.has(id),
      ),
    }));
    setNotice("Аппликатуры возвращены");
  };
  const exportLibrary = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(library, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `lad-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Резервная копия подготовлена");
  };
  const importLibrary = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error("Файл слишком большой. Максимальный размер — 10 МБ.");
      const next = validateLibrary(JSON.parse(await file.text()));
      if (
        !window.confirm(
          `Заменить текущую библиотеку данными из файла? В файле: ${next.bands.length} групп, ${next.songs.length} песен. Перед заменой рекомендуем экспортировать текущие данные.`,
        )
      )
        return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      if (loaded.error) {
        window.location.hash = "bands";
        window.location.reload();
        return;
      }
      setLibrary(next);
      setGenre("Все группы");
      navigate("bands");
      setNotice("Библиотека успешно импортирована");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? `Ошибка импорта: ${error.message}`
          : "Не удалось импортировать библиотеку",
      );
    }
  };
  const newSong = () => {
    if (!library.bands.length) {
      setBandEditor("new");
      setNotice("Сначала добавьте группу или исполнителя");
    } else setSongEditor("new");
  };
  const navSection =
    route === "chords" || chordDetailName
      ? "chords"
      : route === "caged"
        ? "caged"
        : route === "fretboard"
          ? "fretboard"
          : route === "favorites"
            ? "favorites"
            : route === "songs" || currentSong
              ? "songs"
              : "bands";
  const pageTitle =
    navSection === "chords"
      ? "Библиотека аккордов"
      : navSection === "caged"
        ? "Система CAGED"
        : navSection === "fretboard"
          ? "Гриф гитары"
          : navSection === "favorites"
            ? "Избранное"
            : navSection === "songs"
              ? "Все песни"
              : "Мои группы";

  function renderBands(bands: Band[], showAdd = false) {
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
                    library.songs.filter((song) => song.bandId === band.id)
                      .length,
                    ["песня", "песни", "песен"],
                  )}
                </p>
              </div>
              <ChevronRight size={18} />
            </div>
          </button>
        ))}
        {showAdd && (
          <button
            className="add-band-card"
            onClick={() => setBandEditor("new")}
          >
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
  function renderSongs(songs: Song[], withBand = true) {
    return songs.length ? (
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
            <span className="song-number">
              {String(i + 1).padStart(2, "0")}
            </span>
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
                    {
                      library.bands.find((band) => band.id === song.bandId)
                        ?.name
                    }
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
              onClick={() => updateSong({ ...song, favorite: !song.favorite })}
            >
              <Heart size={17} fill={song.favorite ? "currentColor" : "none"} />
            </button>
          </div>
        ))}
      </div>
    ) : (
      <div className="empty-state">
        <Music2 size={38} />
        <h3>
          {route === "favorites"
            ? "Соберите любимое"
            : normalizedQuery
              ? "Песни не найдены"
              : "Первая песня — начало истории"}
        </h3>
        <p>
          {route === "favorites"
            ? "Нажмите на сердечко рядом с песней, чтобы сохранить её здесь."
            : normalizedQuery
              ? "Попробуйте другое название."
              : "Добавьте текст, аккорды и партии инструментов."}
        </p>
        {route !== "favorites" && !normalizedQuery && (
          <button className="btn btn-primary" onClick={newSong}>
            <Plus size={16} />
            Добавить песню
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <button
          className="sidebar-scrim"
          aria-label="Закрыть меню"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <button
          className="brand"
          onClick={() => navigate("bands")}
          aria-label="Лад — на главную"
        >
          <span className="brand-symbol">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span>
            лад<span className="brand-dot">.</span>
          </span>
        </button>
        <p className="brand-caption">МЕСТО ДЛЯ ВАШЕЙ МУЗЫКИ</p>
        <div className="sidebar-label">БИБЛИОТЕКА</div>
        <nav>
          {[
            {
              id: "bands",
              icon: Users,
              label: "Мои группы",
              count: library.bands.length,
            },
            {
              id: "songs",
              icon: Music2,
              label: "Все песни",
              count: library.songs.length,
            },
            {
              id: "favorites",
              icon: Heart,
              label: "Избранное",
              count: favorites.length,
            },
            { id: "chords", icon: Guitar, label: "Аккорды", count: null },
            { id: "caged", icon: LayoutGrid, label: "CAGED", count: null },
            { id: "fretboard", icon: Music2, label: "Гриф", count: null },
          ].map((item) => (
            <button
              key={item.id}
              className={`nav-item ${navSection === item.id ? "active" : ""}`}
              onClick={() => navigate(item.id)}
            >
              <item.icon size={19} strokeWidth={1.7} />
              <span>{item.label}</span>
              {item.count !== null && (
                <span className="nav-count">{item.count}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <div className="sidebar-label recent-label">
          НЕДАВНО ОБНОВЛЕНЫ
          <ClockIcon />
        </div>
        <div className="recent-songs">
          {recent.map((song) => (
            <button key={song.id} onClick={() => navigate(`song/${song.id}`)}>
              <span
                className={`recent-icon cover-${library.bands.find((band) => band.id === song.bandId)?.color ?? "sage"}`}
              >
                <Music2 size={15} />
              </span>
              <span>
                <strong>{song.title}</strong>
                <small>
                  {library.bands.find((band) => band.id === song.bandId)?.name}
                </small>
              </span>
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="local-card">
            <span className="local-dot" />
            <span>
              Ваша музыка — у вас<p>Сохраняется в этом браузере</p>
            </span>
          </div>
          <button
            className="sidebar-bottom-link"
            onClick={() => importRef.current?.click()}
          >
            <Upload size={16} />
            Импорт библиотеки
          </button>
          <button
            className="sidebar-bottom-link accent"
            onClick={() => navigate("help")}
          >
            <CircleHelp size={16} />
            Как это работает
            <ArrowUpRight size={14} />
          </button>
          <div className="sidebar-version">
            <span>СОЗДАНО ДЛЯ МУЗЫКИ</span>
            <span>v.1.0</span>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="btn-icon mobile-menu"
              aria-label="Открыть меню"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={21} />
            </button>
            <BookOpen size={17} />
            <span>Моя библиотека</span>
            <ChevronRight size={13} />
            <strong>
              {currentBand?.name ?? currentSong?.title ?? pageTitle}
            </strong>
          </div>
          <div className="topbar-actions">
            <div className="global-search">
              <Search size={16} />
              <input
                ref={searchRef}
                aria-label="Поиск групп и песен"
                placeholder="Найти группу или песню"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query ? (
                <button
                  className="btn-icon"
                  aria-label="Очистить поиск"
                  onClick={() => setQuery("")}
                >
                  <X size={14} />
                </button>
              ) : (
                <kbd>/</kbd>
              )}
            </div>
            <button className="export-button btn" onClick={exportLibrary}>
              <ArrowDownToLine size={16} />
              <span>Экспорт</span>
            </button>
            <span className="profile-mark" title="Личная библиотека">
              Я
            </span>
          </div>
        </header>
        <main
          className={`main-content ${currentSong && !normalizedQuery ? "song-page" : ""}`}
        >
          {storageError && (
            <div className="storage-warning" role="alert">
              {storageError}
              <button className="btn btn-small" onClick={exportLibrary}>
                Скачать копию
              </button>
            </div>
          )}
          {normalizedQuery ? (
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
                  {renderBands(matchingBands)}
                </>
              )}
              <h2 className="subheading">Песни</h2>
              {renderSongs(matchingSongs)}
            </>
          ) : route === "bands" ? (
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
                  <button className="hero-link" onClick={newSong}>
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
                </div>
                <span className="hero-number">ВЫПУСК 001 / ВАША КОЛЛЕКЦИЯ</span>
              </section>
              <div className="page-heading library-heading">
                <div>
                  <div className="title-with-count">
                    <h2>Мои группы</h2>
                    <span className="count-badge">{library.bands.length}</span>
                  </div>
                  <p>Те, чьи песни хочется играть снова и снова.</p>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => setBandEditor("new")}
                >
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
                      onClick={() => setGenre(item)}
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
                      onChange={(event) => setSort(event.target.value)}
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
                      onClick={() => setLayout("grid")}
                    >
                      <LayoutGrid size={15} />
                    </button>
                    <button
                      aria-label="Показать списком"
                      aria-pressed={layout === "list"}
                      className={layout === "list" ? "selected" : ""}
                      onClick={() => setLayout("list")}
                    >
                      <List size={17} />
                    </button>
                  </div>
                </div>
              </div>
              {renderBands(displayedBands, true)}
              <div className="library-footer">
                <span>
                  <Disc3 size={15} />
                  {plural(library.bands.length, ["группа", "группы", "групп"])}
                  <i />
                  {plural(library.songs.length, ["песня", "песни", "песен"])}
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
          ) : chordDetailName ? (
            <ChordDetail
              name={chordDetailName}
              userChords={library.chords}
              hiddenChordIds={library.hiddenChords}
              onSave={saveChord}
              onDeleteChord={deleteChord}
              onRestore={restoreChords}
              navigate={navigate}
            />
          ) : route === "chords" ? (
            <ChordLibrary
              chords={visibleChords}
              onSave={saveChord}
              navigate={navigate}
            />
          ) : isCaged ? (
            <CagedSystem navigate={navigate} />
          ) : isFretboard ? (
            <FretboardPage navigate={navigate} />
          ) : route === "help" ? (
            <HelpPage
              navigate={navigate}
              onExport={exportLibrary}
              onImport={() => importRef.current?.click()}
            />
          ) : currentSong && songBand ? (
            <SongView
              key={currentSong.id}
              song={currentSong}
              band={songBand}
              chords={visibleChords}
              onUpdate={updateSong}
              onEdit={() => setSongEditor(currentSong)}
              navigate={navigate}
            />
          ) : currentBand ? (
            <>
              <button className="back-link" onClick={() => navigate("bands")}>
                <ArrowLeft size={16} />
                Все группы
              </button>
              <section className="band-page-heading">
                <div className={`band-avatar cover-${currentBand.color}`}>
                  <Disc3 size={43} strokeWidth={1} />
                  <span>{currentBand.initials}</span>
                </div>
                <div>
                  <span className="eyebrow">
                    {currentBand.genre} / ИСПОЛНИТЕЛЬ
                  </span>
                  <h1>{currentBand.name}</h1>
                  <p>
                    {plural(
                      library.songs.filter(
                        (song) => song.bandId === currentBand.id,
                      ).length,
                      ["песня", "песни", "песен"],
                    )}{" "}
                    в вашей коллекции
                  </p>
                </div>
                <button
                  className="btn-icon"
                  aria-label="Редактировать группу"
                  onClick={() => setBandEditor(currentBand)}
                >
                  <Pencil size={18} />
                </button>
              </section>
              <div className="page-heading">
                <h2>Песни группы</h2>
                <button className="btn btn-primary" onClick={newSong}>
                  <Plus size={17} />
                  Добавить песню
                </button>
              </div>
              {renderSongs(
                library.songs.filter((song) => song.bandId === currentBand.id),
                false,
              )}
            </>
          ) : route === "songs" || route === "favorites" ? (
            <>
              <div className="page-heading collection-heading">
                <div>
                  <span className="eyebrow">ВАША МУЗЫКА, БЕЗ ЛИШНЕГО</span>
                  <h1>
                    {route === "favorites" ? "Особенное — рядом" : "Все песни"}
                  </h1>
                  <p>
                    {route === "favorites"
                      ? "Любимые песни для правильного настроения."
                      : "Каждая песня на своём месте."}
                  </p>
                </div>
                {route === "favorites" ? (
                  <FolderHeart
                    className="heading-decoration"
                    size={54}
                    strokeWidth={1}
                  />
                ) : (
                  <button className="btn btn-primary" onClick={newSong}>
                    <Plus size={17} />
                    Добавить песню
                  </button>
                )}
              </div>
              {renderSongs(route === "favorites" ? favorites : library.songs)}
            </>
          ) : (
            <div className="empty-state">
              <Search size={36} />
              <h1>Страница не найдена</h1>
              <p>Возможно, этой песни или группы нет в текущей библиотеке.</p>
              <button className="btn" onClick={() => navigate("bands")}>
                Вернуться к группам
                <ArrowRight size={15} />
              </button>
            </div>
          )}
        </main>
        <footer className="workspace-footer">
          <span className="footer-logo">лад.</span>
          <span>Меньше искать. Больше играть.</span>
          <span>
            <span className={`status-dot ${storageError ? "error" : ""}`} />
            {storageError ? "Сохранение недоступно" : "Сохранено на устройстве"}
          </span>
        </footer>
      </div>
      <input
        ref={importRef}
        type="file"
        accept=".json,application/json"
        hidden
        aria-label="Импорт резервной копии"
        onChange={(event) => {
          void importLibrary(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {bandEditor && (
        <BandEditor
          band={bandEditor === "new" ? undefined : bandEditor}
          songsCount={
            bandEditor === "new"
              ? 0
              : library.songs.filter((song) => song.bandId === bandEditor.id)
                  .length
          }
          onSave={saveBand}
          onDelete={
            bandEditor === "new" ? undefined : () => deleteBand(bandEditor)
          }
          onClose={() => setBandEditor(null)}
        />
      )}
      {songEditor && (
        <SongEditor
          song={songEditor === "new" ? undefined : songEditor}
          bands={library.bands}
          bandId={currentBand?.id}
          chords={visibleChords}
          onSave={saveSong}
          onDelete={
            songEditor === "new" ? undefined : () => deleteSong(songEditor)
          }
          onClose={() => setSongEditor(null)}
        />
      )}
      {notice && (
        <div className="toast" role="status">
          <span>{notice}</span>
          <button
            className="btn-icon"
            aria-label="Закрыть уведомление"
            onClick={() => setNotice("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

function ClockIcon() {
  return (
    <span className="recent-clock">
      <Music2 size={12} />
    </span>
  );
}
