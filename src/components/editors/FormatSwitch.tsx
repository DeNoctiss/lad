import { AlignLeft, Guitar } from "lucide-react";

export function FormatSwitch({
  format,
  onChange,
}: {
  format: "text" | "visual";
  onChange: (format: "text" | "visual") => void;
}) {
  return (
    <>
      <div
        className="part-editor-modes"
        role="group"
        aria-label="Формат партии"
      >
        <button
          type="button"
          aria-pressed={format === "visual"}
          onClick={() => onChange("visual")}
        >
          <Guitar size={16} />
          Визуальная партия
        </button>
        <button
          type="button"
          aria-pressed={format === "text"}
          onClick={() => onChange("text")}
        >
          <AlignLeft size={16} />
          Обычный текст
        </button>
      </div>
      <p className="part-mode-hint">
        Текст и визуальная версия независимы и сохраняются вместе. Выбранный
        режим определяет, что будет видно в песне. Старые табы не преобразуются
        автоматически.
      </p>
    </>
  );
}
