import { useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Redo2,
  Undo2,
  Eraser,
  Trash2,
} from "lucide-react";
import type {
  NoteEffect,
  NoteLink,
  StrumDirection,
  TabEvent,
  TabKind,
  TabNote,
} from "../../../lib/tabTypes";
import type { Rhythm } from "../../../lib/tabEditing";
import { durations, effects, links } from "./editorShared";

type Props = {
  kind: TabKind;
  rhythm: Rhythm;
  note?: TabNote;
  event?: TabEvent;
  lane: string;
  measure: number;
  tick: number;
  canUndo: boolean;
  canRedo: boolean;
  onRhythm: (patch: Partial<Rhythm>) => void;
  onEffect: (value: NoteEffect) => void;
  onLink: (value: NoteLink | "") => void;
  onStrum: (value: StrumDirection) => void;
  onMute: () => void;
  onFret: (fret: number) => void;
  onRest: () => void;
  onNext: () => void;
  onRemoveNote: () => void;
  onRemoveEvent: () => void;
  onUndo: () => void;
  onRedo: () => void;
};

/** Code-native notation icons stay crisp at any display density. */
function DurationIcon({ duration }: { duration: number }) {
  return (
    <svg width="22" height="25" viewBox="0 0 22 25" aria-hidden="true">
      <ellipse
        cx="8"
        cy="19"
        rx={duration === 1 ? 6 : 4.5}
        ry="3"
        transform="rotate(-18 8 19)"
        fill={duration <= 2 ? "none" : "currentColor"}
        stroke="currentColor"
        strokeWidth="1.7"
      />
      {duration !== 1 && (
        <path d="M12 18V3" stroke="currentColor" strokeWidth="1.7" />
      )}
      {duration >= 8 && (
        <path
          d="M12 3Q21 6 16 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
      )}
      {duration === 16 && (
        <path
          d="M12 8Q21 11 16 17"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
      )}
    </svg>
  );
}

export function EditorToolbar(p: Props) {
  const [expanded, setExpanded] = useState(false);
  const stringed = p.kind === "guitar" || p.kind === "bass";
  const available = effects.filter(({ value }) =>
    stringed
      ? value !== "open"
      : value === "accent" ||
        value === "ghost" ||
        (p.kind === "drums" && p.lane === "HH" && value === "open"),
  );
  return (
    <div
      className="editor-dock"
      role="group"
      aria-label="Инструменты выбранной ноты"
    >
      <div className="editor-dock-status">
        <span>
          <strong>Такт {p.measure + 1}</strong> ·{" "}
          {stringed ? `струна ${p.lane}` : p.lane} ·{" "}
          {p.event
            ? p.event.notes.length
              ? "нота / созвучие"
              : "пауза"
            : "новая нота"}
        </span>
        <span>
          {stringed
            ? "Клик → лад 0–24 · Enter → дальше"
            : p.kind === "piano"
              ? "Клавиши → созвучие · Далее → новая позиция"
              : "Клик по клетке → добавить / убрать удар"}
        </span>
      </div>
      <div className="editor-tool-row editor-primary-tools">
        <div className="editor-tool-group editor-history">
          <button
            type="button"
            aria-label="Отменить изменение"
            title="Отменить · Ctrl / ⌘ Z"
            disabled={!p.canUndo}
            onClick={p.onUndo}
          >
            <Undo2 size={18} />
          </button>
          <button
            type="button"
            aria-label="Вернуть изменение"
            title="Вернуть · Shift+Ctrl / ⌘ Z"
            disabled={!p.canRedo}
            onClick={p.onRedo}
          >
            <Redo2 size={18} />
          </button>
        </div>
        <div
          className="editor-tool-group"
          role="group"
          aria-label="Длительность"
        >
          <div className="editor-segments">
            {durations.map(({ value, label }) => (
              <button
                type="button"
                key={value}
                aria-label={`${label}, 1/${value}`}
                title={`${label} · 1/${value}`}
                aria-pressed={p.rhythm.duration === value}
                onClick={() => p.onRhythm({ duration: value })}
              >
                <DurationIcon duration={value} />
                <span>1/{value}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="editor-dot"
            title="Продлить на половину · ."
            aria-label="С точкой"
            aria-pressed={p.rhythm.dotted}
            onClick={() => p.onRhythm({ dotted: !p.rhythm.dotted })}
          >
            •
          </button>
        </div>
        <div className="editor-tool-group">
          <button
            type="button"
            onClick={p.onRest}
            title="Пауза в выбранной позиции · R"
          >
            Пауза
          </button>
          {stringed && (
            <>
              <button
                type="button"
                aria-label="Заглушённая струна, X"
                title="Заглушить · X"
                aria-pressed={p.note?.fret === "x"}
                onClick={p.onMute}
              >
                X
              </button>
              <button
                type="button"
                disabled={!p.note}
                title="Palm mute — приглушить ладонью · M"
                aria-label="Palm mute"
                aria-pressed={p.note?.effects.includes("pm") ?? false}
                onClick={() => p.onEffect("pm")}
              >
                PM
              </button>
            </>
          )}
          {!stringed && (
            <button
              type="button"
              disabled={!p.note}
              aria-pressed={p.note?.effects.includes("accent") ?? false}
              onClick={() => p.onEffect("accent")}
            >
              Акцент
            </button>
          )}
          <button
            type="button"
            className="editor-more-toggle"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            Приёмы и параметры <ChevronDown size={16} />
          </button>
        </div>
        <button
          type="button"
          className="visual-tab-primary editor-next"
          onClick={p.onNext}
          title="Следующая позиция · → / Enter"
        >
          Далее <ArrowRight size={17} />
        </button>
      </div>
      {expanded && (
        <div className="editor-advanced-tools">
          <div className="editor-tool-group">
            <button
              type="button"
              title="Три ноты вместо двух"
              aria-pressed={p.rhythm.triplet}
              onClick={() => p.onRhythm({ triplet: !p.rhythm.triplet })}
            >
              Триоль
            </button>
            {stringed && (
              <>
                <label className="editor-fret-field">
                  Лад{" "}
                  <input
                    type="number"
                    min={0}
                    max={24}
                    inputMode="numeric"
                    aria-label="Лад выбранной струны"
                    value={p.note?.fret === "x" ? "" : (p.note?.fret ?? "")}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (
                        e.target.value !== "" &&
                        Number.isInteger(value) &&
                        value >= 0 &&
                        value <= 24
                      )
                        p.onFret(value);
                    }}
                  />
                </label>
                <button
                  type="button"
                  disabled={!p.event?.notes.length}
                  aria-label="Бой вниз"
                  aria-pressed={p.event?.strum === "down"}
                  onClick={() => p.onStrum("down")}
                >
                  ↓ Бой
                </button>
                <button
                  type="button"
                  disabled={!p.event?.notes.length}
                  aria-label="Бой вверх"
                  aria-pressed={p.event?.strum === "up"}
                  onClick={() => p.onStrum("up")}
                >
                  ↑ Бой
                </button>
              </>
            )}
            {(stringed || p.kind === "piano") && (
              <label className="editor-link-field">
                Связь
                <select
                  aria-label="Связь со следующей нотой"
                  value={p.note?.link ?? ""}
                  disabled={!p.note || p.note.fret === "x"}
                  onChange={(e) => p.onLink(e.target.value as NoteLink | "")}
                >
                  {links
                    .filter(
                      ({ value }) =>
                        stringed || value === "" || value === "tie",
                    )
                    .map(({ value, label }) => (
                      <option key={value} value={value}>
                        {value === "" ? "Нет связи" : label}
                      </option>
                    ))}
                </select>
              </label>
            )}
          </div>
          <div
            className="editor-tool-group editor-effects"
            role="group"
            aria-label="Эффекты ноты"
          >
            {available
              .filter(({ value }) =>
                stringed ? value !== "pm" : value !== "accent",
              )
              .map(({ value, label }) => (
                <button
                  type="button"
                  key={value}
                  disabled={
                    !p.note ||
                    (p.note.fret === "x" &&
                      !["accent", "ghost", "open"].includes(value))
                  }
                  aria-pressed={p.note?.effects.includes(value) ?? false}
                  onClick={() => p.onEffect(value)}
                >
                  {label}
                </button>
              ))}
            <button
              type="button"
              disabled={!p.note}
              onClick={p.onRemoveNote}
              aria-label="Убрать выбранную ноту"
              title="Убрать ноту, сохранить ритм · Delete"
            >
              <Eraser size={17} />
              Убрать ноту
            </button>
            <button
              type="button"
              disabled={!p.event}
              onClick={p.onRemoveEvent}
              aria-label="Удалить выбранное событие"
              title="Удалить столбец со сдвигом следующих · Shift+Delete"
            >
              <Trash2 size={17} />
              Удалить позицию
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
