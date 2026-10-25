import {
  ArrowUpRight,
  CircleHelp,
  Guitar,
  Heart,
  LayoutGrid,
  Music2,
  Mic,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef } from "react";
import type { Band, Song } from "../../lib/model";

export function Sidebar({
  isOpen,
  navSection,
  bands,
  songs,
  favoritesCount,
  navigate,
  onImport,
  onClose,
}: {
  isOpen: boolean;
  navSection: string;
  bands: Band[];
  songs: Song[];
  favoritesCount: number;
  navigate: (route: string) => void;
  onImport: () => void;
  onClose: () => void;
}) {
  const drawer = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawer.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [isOpen]);
  return (
    <aside
      ref={drawer}
      className={`sidebar ${isOpen ? "is-open" : ""}`}
      role="dialog"
      aria-modal={isOpen || undefined}
      aria-label="Меню библиотеки"
      aria-hidden={!isOpen}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
        if (event.key !== "Tab") return;
        const controls = Array.from(
          drawer.current?.querySelectorAll<HTMLButtonElement>(
            "button:not(:disabled)",
          ) ?? [],
        );
        const first = controls[0],
          last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
    >
      <button
        className="btn-icon sidebar-close"
        aria-label="Закрыть меню"
        onClick={onClose}
      >
        <X size={19} />
      </button>
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
          { id: "vocal", icon: Mic, label: "Вокальный тренажёр", count: null },
          { id: "solfege", icon: Music2, label: "Сольфеджио", count: null },
          { id: "theory", icon: Music2, label: "Теория музыки", count: null },
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
