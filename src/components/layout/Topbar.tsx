import {
  ArrowDownToLine,
  BookOpen,
  ChevronRight,
  Menu,
  Search,
  X,
} from "lucide-react";
import type { ReactNode, RefObject } from "react";

export function Topbar({
  breadcrumb,
  query,
  onQueryChange,
  searchRef,
  onExport,
  onMenuOpen,
}: {
  breadcrumb: ReactNode;
  query: string;
  onQueryChange: (value: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  onExport: () => void;
  onMenuOpen: () => void;
}) {
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <button
          className="btn-icon mobile-menu"
          aria-label="Открыть меню"
          onClick={onMenuOpen}
        >
          <Menu size={21} />
        </button>
        <BookOpen size={17} />
        <span>Моя библиотека</span>
        <ChevronRight size={13} />
        <strong>{breadcrumb}</strong>
      </div>
      <div className="topbar-actions">
        <div className="global-search">
          <Search size={16} />
          <input
            ref={searchRef}
            aria-label="Поиск групп и песен"
            placeholder="Найти группу или песню"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          {query ? (
            <button
              className="btn-icon"
              aria-label="Очистить поиск"
              onClick={() => onQueryChange("")}
            >
              <X size={14} />
            </button>
          ) : (
            <kbd>/</kbd>
          )}
        </div>
        <button className="export-button btn" onClick={onExport}>
          <ArrowDownToLine size={16} />
          <span>Экспорт</span>
        </button>
        <span className="profile-mark" title="Личная библиотека">
          Я
        </span>
      </div>
    </header>
  );
}

export function Footer({ storageError }: { storageError: string | null }) {
  return (
    <footer className="workspace-footer">
      <span className="footer-logo">лад.</span>
      <span>Меньше искать. Больше играть.</span>
      <span>
        <span className={`status-dot ${storageError ? "error" : ""}`} />
        {storageError ? "Сохранение недоступно" : "Сохранено на устройстве"}
      </span>
    </footer>
  );
}
