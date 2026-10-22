import { useState } from "react";
import { Modal } from "../ui/Modal";
import type { PitchRange } from "../../lib/vocal/yin";
export function TranscriptionDialog({
  file,
  replacing,
  onClose,
  onStart,
}: {
  file: File;
  replacing: boolean;
  onClose: () => void;
  onStart: (range: PitchRange) => void;
}) {
  const [range, setRange] = useState<PitchRange>("auto");
  return (
    <Modal
      title="Распознать акапеллу"
      eyebrow="ВОКАЛЬНЫЙ ТРЕНАЖЁР"
      onClose={onClose}
    >
      <p className="vocal-import-filename">{file.name}</p>
      <label className="field">
        Диапазон голоса
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as PitchRange)}
        >
          <option value="auto">Автоматически · примерно C2–C6</option>
          <option value="low">Низкий · примерно C2–F4</option>
          <option value="middle">Средний · примерно G2–D5</option>
          <option value="high">Высокий · примерно F♯3–C6</option>
        </select>
      </label>
      <p>
        Лучше всего подходит один голос без инструментов. Проверяйте результат
        на слух: бэк-вокал и эффекты могут давать ошибки.
      </p>
      {replacing && (
        <p>
          Текущие ноты будут заменены после успешного распознавания. Перед
          заменой можно сохранить их кнопкой JSON.
        </p>
      )}
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>
          Отмена
        </button>
        <button className="btn btn-primary" onClick={() => onStart(range)}>
          Распознать ноты
        </button>
      </div>
    </Modal>
  );
}
