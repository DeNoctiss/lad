import type {
  NoteEffect,
  NoteLink,
  TabEvent,
  TabNote,
} from "../../../lib/tabTypes";
import { links } from "./editorShared";

type Lane = { id: string; label: string };

export function NotePanel({
  piano,
  drums,
  lanes,
  lane,
  selectedEvent,
  selectedNote,
  currentFret,
  currentLink,
  currentEffects,
  visibleEffects,
  onChooseLane,
  onChangeFret,
  onAddToMoment,
  onRemoveNote,
  onLinkChange,
  onToggleEffect,
  onRememberNote,
}: {
  piano: boolean;
  drums: boolean;
  lanes: Lane[];
  lane: string;
  selectedEvent?: TabEvent;
  selectedNote?: TabNote;
  currentFret: TabNote["fret"];
  currentLink: NoteLink | "";
  currentEffects: NoteEffect[];
  visibleEffects: { value: NoteEffect; label: string }[];
  onChooseLane: (lane: string) => void;
  onChangeFret: (fret: TabNote["fret"]) => void;
  onAddToMoment: () => void;
  onRemoveNote: (lane: string) => void;
  onLinkChange: (link: NoteLink | "") => void;
  onToggleEffect: (effect: NoteEffect, checked: boolean) => void;
  onRememberNote: (note: TabNote) => void;
}) {
  return (
    <fieldset className="visual-tab-panel">
      <legend>
        {piano
          ? "Клавиша и исполнение"
          : drums
            ? "Дорожка и удар"
            : "Струна и нота"}
      </legend>
      <div className="visual-tab-note-fields">
        <label className="visual-tab-field">
          {piano ? "Клавиша" : drums ? "Дорожка" : "Струна"}
          <select
            value={lane}
            onChange={(event) => onChooseLane(event.target.value)}
          >
            {lanes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
                {selectedEvent?.notes.some((note) => note.lane === item.id)
                  ? " · есть нота"
                  : ""}
              </option>
            ))}
          </select>
        </label>
        {!drums && !piano && (
          <>
            <label className="visual-tab-field">
              Лад · 0–24
              <input
                type="number"
                min={0}
                max={24}
                step={1}
                value={currentFret === "x" ? "" : currentFret}
                disabled={currentFret === "x"}
                onChange={(event) => {
                  const value = event.target.valueAsNumber;
                  if (Number.isInteger(value) && value >= 0 && value <= 24)
                    onChangeFret(value);
                }}
              />
            </label>
            <label className="visual-tab-check">
              <input
                type="checkbox"
                checked={currentFret === "x"}
                onChange={(event) =>
                  onChangeFret(event.target.checked ? "x" : 0)
                }
              />
              x · приглушённая
            </label>
          </>
        )}
      </div>
      <p className="visual-tab-help">
        {selectedNote
          ? "Изменения применяются к выбранной ноте сразу."
          : selectedEvent
            ? "На этой дорожке пока пауза. Добавьте ноту в выбранный момент."
            : "Настройки для новой ноты. Выберите событие, чтобы изменить существующую."}
      </p>
      <div className="visual-tab-actions">
        <button
          type="button"
          disabled={!selectedEvent || Boolean(selectedNote)}
          onClick={onAddToMoment}
        >
          {drums ? "Удар в этот момент" : "Нота в этот момент"}
        </button>
        <button
          type="button"
          disabled={!selectedNote}
          onClick={() => onRemoveNote(lane)}
        >
          Убрать {drums ? "удар" : "ноту"} с дорожки
        </button>
      </div>
      {!drums && (
        <label className="visual-tab-field visual-tab-link">
          {piano
            ? "Продлить эту клавишу в следующем событии"
            : "Связь со следующей нотой на этой струне"}
          <select
            value={currentLink}
            onChange={(event) =>
              onLinkChange(event.target.value as NoteLink | "")
            }
          >
            {links
              .filter(
                (link) => !piano || link.value === "" || link.value === "tie",
              )
              .map((link) => (
                <option key={link.value} value={link.value}>
                  {link.label}
                </option>
              ))}
          </select>
        </label>
      )}
      <div
        className="visual-tab-checks visual-tab-effects"
        role="group"
        aria-label="Эффекты выбранной ноты"
      >
        {visibleEffects.map(({ value, label }) => (
          <label key={value}>
            <input
              type="checkbox"
              checked={currentEffects.includes(value)}
              onChange={(event) => onToggleEffect(value, event.target.checked)}
            />
            {label}
          </label>
        ))}
      </div>
      {selectedEvent && (
        <div className="visual-tab-chord-notes">
          <strong>{drums ? "Удары в моменте" : "Ноты в моменте"}</strong>
          {!selectedEvent.notes.length ? (
            <p className="visual-tab-help">Пауза — ни одной ноты.</p>
          ) : (
            selectedEvent.notes.map((note) => {
              const label =
                lanes.find((item) => item.id === note.lane)?.label ?? note.lane;
              return (
                <div className="visual-tab-note-row" key={note.lane}>
                  <button
                    type="button"
                    aria-pressed={note.lane === lane}
                    onClick={() => onRememberNote(note)}
                  >
                    {label}
                    {piano ? "" : drums ? " · удар" : ` · ${note.fret}`}
                  </button>
                  <button
                    type="button"
                    aria-label={`Убрать ноту: ${label}`}
                    onClick={() => onRemoveNote(note.lane)}
                  >
                    Убрать
                  </button>
                </div>
              );
            })
          )}
          <p className="visual-tab-help">
            Удаление последней ноты превращает событие в паузу.
          </p>
        </div>
      )}
    </fieldset>
  );
}
