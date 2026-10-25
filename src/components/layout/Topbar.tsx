import { ArrowDownToLine, Menu, Search, X } from "lucide-react";
import type { ReactNode, RefObject } from "react";
import { ThemeToggle } from "./ThemeToggle";

export function Topbar({
  breadcrumb,
  query,
  onQueryChange,
  searchRef,
  onExport,
  onMenuOpen,
  navigate,
  navSection,
}: {
  breadcrumb: ReactNode;
  query: string;
  onQueryChange: (value: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  onExport: () => void;
  onMenuOpen: () => void;
  navigate: (route: string) => void;
  navSection: string;
}) {
  return (
    <header className="topbar">
      <div className="topbar-brand-group">
        <button
          className="btn-icon mobile-menu"
          aria-label="Открыть меню"
          onClick={onMenuOpen}
        >
          <Menu size={21} />
        </button>
        <button
          className="topbar-brand"
          onClick={() => navigate("bands")}
          aria-label="Лад — на главную"
        >
          Лад<span>.</span>
        </button>
      </div>
      <nav className="topbar-nav" aria-label="Основная навигация">
        {[
          {
            id: "bands",
            label: "Библиотека",
            active: ["bands", "songs"].includes(navSection),
          },
          {
            id: "favorites",
            label: "Избранное",
            active: navSection === "favorites",
          },
          {
            id: "vocal",
            label: "Вокальный тренажёр",
            active: navSection === "vocal",
          },
          {
            id: "solfege",
            label: "Сольфеджио",
            active: navSection === "solfege",
          },
        ].map((item) => (
          <button
            key={item.id}
            aria-current={item.active ? "page" : undefined}
            onClick={() => navigate(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <span className="visual-tab-sr-only">{breadcrumb}</span>
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
        <button
          className="export-button btn"
          aria-label="Экспорт"
          title="Экспорт библиотеки"
          onClick={onExport}
        >
          <ArrowDownToLine size={16} />
          <span>Экспорт</span>
        </button>
        <ThemeToggle />
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
