import { Minus, Plus, Printer } from "lucide-react";

export function SheetToolbar({
  tab,
  partsCount,
  fontSize,
  onTabChange,
  onFontSizeChange,
}: {
  tab: "lyrics" | "tabs";
  partsCount: number;
  fontSize: number;
  onTabChange: (tab: "lyrics" | "tabs") => void;
  onFontSizeChange: (size: number) => void;
}) {
  return (
    <div className="sheet-toolbar">
      <div className="sheet-tabs" role="tablist" aria-label="Содержимое песни">
        <button
          role="tab"
          aria-selected={tab === "lyrics"}
          onClick={() => onTabChange("lyrics")}
          className={tab === "lyrics" ? "active" : ""}
        >
          Текст и аккорды
        </button>
        <button
          role="tab"
          aria-selected={tab === "tabs"}
          onClick={() => onTabChange("tabs")}
          className={tab === "tabs" ? "active" : ""}
        >
          Табулатуры <span>{partsCount}</span>
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
        <button
          className="btn-icon print-button"
          aria-label="Распечатать песню"
          onClick={() => window.print()}
        >
          <Printer size={16} />
        </button>
      </div>
    </div>
  );
}
