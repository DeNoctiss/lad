import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Music2, Plus, Search } from "lucide-react";
import type { Band, Chord, Library, Song } from "../lib/model";
import { readLibrary, STORAGE_KEY, validateLibrary } from "../lib/model";
import { initialLibrary } from "../lib/seed";
import { allChords } from "../lib/chordDatabase";
import { Sidebar } from "../components/layout/Sidebar";
import { Topbar, Footer } from "../components/layout/Topbar";
import { EmptyState } from "../components/ui/EmptyState";
import { AppOverlays } from "./AppOverlays";
import { BandsPage } from "../pages/BandsPage";
import { BandPage } from "../pages/BandPage";
import { SongListPage } from "../pages/SongListPage";
import { SearchResultsPage } from "../pages/SearchResultsPage";
import { SongView } from "../pages/SongPage";
import { ChordLibrary } from "../pages/ChordsPage";
import { ChordDetail } from "../pages/ChordDetailPage";
import { CagedSystem } from "../pages/CagedPage";
import { FretboardPage } from "../pages/FretboardPage";
import { HelpPage } from "../pages/HelpPage";

function getRoute() {
  return window.location.hash.replace(/^#/, "") || "bands";
}

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
  const toggleFavorite = (song: Song) =>
    updateSong({ ...song, favorite: !song.favorite });
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
  const openImport = () => importRef.current?.click();

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

  const songListEmpty = (
    <EmptyState
      icon={<Music2 size={38} />}
      title={
        route === "favorites"
          ? "Соберите любимое"
          : normalizedQuery
            ? "Песни не найдены"
            : "Первая песня — начало истории"
      }
      action={
        route !== "favorites" && !normalizedQuery ? (
          <button className="btn btn-primary" onClick={newSong}>
            <Plus size={16} />
            Добавить песню
          </button>
        ) : undefined
      }
    >
      {route === "favorites"
        ? "Нажмите на сердечко рядом с песней, чтобы сохранить её здесь."
        : normalizedQuery
          ? "Попробуйте другое название."
          : "Добавьте текст, аккорды и партии инструментов."}
    </EmptyState>
  );

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <button
          className="sidebar-scrim"
          aria-label="Закрыть меню"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar
        isOpen={sidebarOpen}
        navSection={navSection}
        bands={library.bands}
        songs={library.songs}
        favoritesCount={favorites.length}
        recent={recent}
        navigate={navigate}
        onImport={openImport}
      />
      <div className="workspace">
        <Topbar
          breadcrumb={currentBand?.name ?? currentSong?.title ?? pageTitle}
          query={query}
          onQueryChange={setQuery}
          searchRef={searchRef}
          onExport={exportLibrary}
          onMenuOpen={() => setSidebarOpen(true)}
        />
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
            <SearchResultsPage
              query={query}
              matchingBands={matchingBands}
              matchingSongs={matchingSongs}
              songs={library.songs}
              bands={library.bands}
              layout={layout}
              onToggleFavorite={toggleFavorite}
              navigate={navigate}
              empty={songListEmpty}
            />
          ) : route === "bands" ? (
            <BandsPage
              bands={library.bands}
              songs={library.songs}
              displayedBands={displayedBands}
              genres={genres}
              genre={genre}
              onGenreChange={setGenre}
              sort={sort}
              onSortChange={setSort}
              layout={layout}
              onLayoutChange={setLayout}
              onAddBand={() => setBandEditor("new")}
              onNewSong={newSong}
              navigate={navigate}
            />
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
              onImport={openImport}
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
            <BandPage
              band={currentBand}
              songs={library.songs.filter(
                (song) => song.bandId === currentBand.id,
              )}
              bands={library.bands}
              onEditBand={() => setBandEditor(currentBand)}
              onNewSong={newSong}
              onToggleFavorite={toggleFavorite}
              navigate={navigate}
              empty={songListEmpty}
            />
          ) : route === "songs" || route === "favorites" ? (
            <SongListPage
              route={route}
              songs={route === "favorites" ? favorites : library.songs}
              bands={library.bands}
              onNewSong={newSong}
              onToggleFavorite={toggleFavorite}
              navigate={navigate}
              empty={songListEmpty}
            />
          ) : (
            <EmptyState
              icon={<Search size={36} />}
              title="Страница не найдена"
              titleAs="h1"
              action={
                <button className="btn" onClick={() => navigate("bands")}>
                  Вернуться к группам
                  <ArrowRight size={15} />
                </button>
              }
            >
              Возможно, этой песни или группы нет в текущей библиотеке.
            </EmptyState>
          )}
        </main>
        <Footer storageError={storageError} />
      </div>
      <AppOverlays
        importRef={importRef}
        onImportFile={(file) => void importLibrary(file)}
        bandEditor={bandEditor}
        songEditor={songEditor}
        songs={library.songs}
        bands={library.bands}
        currentBandId={currentBand?.id}
        chords={visibleChords}
        notice={notice}
        onSaveBand={saveBand}
        onDeleteBand={deleteBand}
        onSaveSong={saveSong}
        onDeleteSong={deleteSong}
        onCloseBandEditor={() => setBandEditor(null)}
        onCloseSongEditor={() => setSongEditor(null)}
        onCloseNotice={() => setNotice("")}
      />
    </div>
  );
}
