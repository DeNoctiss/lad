import {
  ArrowUpRight,
  CircleHelp,
  Guitar,
  Heart,
  LayoutGrid,
  Music2,
  Upload,
  Users,
} from "lucide-react";
import type { Band, Song } from "../../lib/model";

function ClockIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 7v5l3.2 2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Sidebar({
  isOpen,
  navSection,
  bands,
  songs,
  favoritesCount,
  recent,
  navigate,
  onImport,
}: {
  isOpen: boolean;
  navSection: string;
  bands: Band[];
  songs: Song[];
  favoritesCount: number;
  recent: Song[];
  navigate: (route: string) => void;
  onImport: () => void;
}) {
  const bandOf = (song: Song) => bands.find((band) => band.id === song.bandId);
  return (
    <aside className={`sidebar ${isOpen ? "is-open" : ""}`}>
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
            count: bands.length,
          },
          {
            id: "songs",
            icon: Music2,
            label: "Все песни",
            count: songs.length,
          },
          {
            id: "favorites",
            icon: Heart,
            label: "Избранное",
            count: favoritesCount,
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
              className={`recent-icon cover-${bandOf(song)?.color ?? "sage"}`}
            >
              <Music2 size={15} />
            </span>
            <span>
              <strong>{song.title}</strong>
              <small>{bandOf(song)?.name}</small>
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
        <button className="sidebar-bottom-link" onClick={onImport}>
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
  );
}
