import { useState } from "react";
import type { Band } from "../../lib/model";
import { uid } from "../../lib/model";
import { Modal } from "../ui/Modal";
import { Check, Plus, Trash2 } from "lucide-react";

const colors = ["ocean", "sand", "rose", "sage", "blue", "lilac"];

export function BandEditor({
  band,
  songsCount = 0,
  onSave,
  onDelete,
  onClose,
}: {
  band?: Band;
  songsCount?: number;
  onSave: (band: Band) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(band?.name ?? "");
  const [genre, setGenre] = useState(band?.genre ?? "");
  const [color, setColor] = useState(band?.color ?? "ocean");
  return (
    <Modal
      title={band ? "Редактировать группу" : "Новая группа"}
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          onSave({
            id: band?.id ?? uid(),
            name: name.trim(),
            genre: genre.trim() || "Без жанра",
            color,
            initials: name
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((word) => word[0])
              .join("")
              .toUpperCase(),
          });
        }}
      >
        <label className="field">
          Название группы или исполнителя
          <input
            autoFocus
            required
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Например, Кино"
          />
        </label>
        <label className="field">
          Жанр
          <input
            maxLength={50}
            value={genre}
            onChange={(event) => setGenre(event.target.value)}
            placeholder="Инди-рок, акустика, джаз…"
            list="genres"
          />
        </label>
        <datalist id="genres">
          {["Рок", "Инди-рок", "Акустика", "Поп", "Джаз", "Метал"].map(
            (genre) => (
              <option key={genre}>{genre}</option>
            ),
          )}
        </datalist>
        <div className="field">
          Цвет обложки
          <div className="color-options">
            {colors.map((item) => (
              <button
                key={item}
                type="button"
                className={`color-option cover-${item} ${color === item ? "selected" : ""}`}
                aria-label={`Цвет ${item}`}
                aria-pressed={color === item}
                onClick={() => setColor(item)}
              >
                {color === item && <Check size={18} />}
              </button>
            ))}
          </div>
        </div>
        <div className="modal-actions">
          {band && onDelete && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                if (
                  window.confirm(
                    songsCount
                      ? `Удалить группу «${band.name}» и все её песни (${songsCount})? Действие необратимо.`
                      : `Удалить группу «${band.name}»?`,
                  )
                )
                  onDelete();
              }}
            >
              <Trash2 size={16} />
              Удалить
            </button>
          )}
          <button type="button" className="btn" onClick={onClose}>
            Отмена
          </button>
          <button className="btn btn-primary" disabled={!name.trim()}>
            <Plus size={17} />
            {band ? "Сохранить" : "Добавить группу"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
