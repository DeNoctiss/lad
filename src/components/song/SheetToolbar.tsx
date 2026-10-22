import { Minus, Plus, Printer } from "lucide-react";

export function SheetToolbar({
  tab,
  partsCount,
  fontSize,
  onTabChange,
  onFontSizeChange,
}: {
  tab: "lyrics" | "tabs" | "vocal";
  partsCount: number;
  fontSize: number;
  onTabChange: (tab: "lyrics" | "tabs" | "vocal") => void;
  onFontSizeChange: (size: number) => void;
}) {
  return (
    <div className="sheet-toolbar">
      <div
        className="sheet-tabs"
        role="tablist"
        aria-label="Содержимое песни"
        onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
            return;
          event.preventDefault();
          const modes = ["lyrics", "tabs", "vocal"] as const;
          const offset = event.key === "ArrowLeft" ? -1 : 1;
          const next =
            event.key === "Home"
              ? modes[0]
              : event.key === "End"
                ? modes[2]
                : modes[(modes.indexOf(tab) + offset + 3) % 3];
          onTabChange(next);
          document.getElementById(`song-tab-${next}`)?.focus();
        }}
      >
        <button
          role="tab"
          id="song-tab-lyrics"
          aria-controls="song-panel-lyrics"
          aria-selected={tab === "lyrics"}
          tabIndex={tab === "lyrics" ? 0 : -1}
          onClick={() => onTabChange("lyrics")}
          className={tab === "lyrics" ? "active" : ""}
        >
          Текст и аккорды
        </button>
        <button
          role="tab"
          id="song-tab-tabs"
          aria-controls="song-panel-tabs"
          aria-selected={tab === "tabs"}
          tabIndex={tab === "tabs" ? 0 : -1}
          onClick={() => onTabChange("tabs")}
          className={tab === "tabs" ? "active" : ""}
        >
          Табулатуры <span>{partsCount}</span>
        </button>
        <button
          role="tab"
          id="song-tab-vocal"
          aria-controls="song-panel-vocal"
          aria-selected={tab === "vocal"}
          tabIndex={tab === "vocal" ? 0 : -1}
          onClick={() => onTabChange("vocal")}
          className={tab === "vocal" ? "active" : ""}
        >
          Вокальный тренажёр
        </button>
      </div>
      <div className="sheet-tools">
        {tab === "lyrics" && (
          <>
            <button
              className="btn-icon"
              disabled={fontSize <= 14}
              aria-label="Уменьшить текст"
              onClick={() => onFontSizeChange(fontSize - 2)}
            >
              <Minus size={15} />
            </button>
            <span>Aa</span>
            <button
              className="btn-icon"
              disabled={fontSize >= 28}
              aria-label="Увеличить текст"
              onClick={() => onFontSizeChange(fontSize + 2)}
            >
              <Plus size={15} />
            </button>
          </>
        )}
        {tab !== "vocal" && (
          <button
            className="btn-icon print-button"
            aria-label="Распечатать песню"
            onClick={() => window.print()}
          >
            <Printer size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
