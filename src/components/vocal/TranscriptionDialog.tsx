import type { TranscriptionEngine } from "../../lib/vocal/neuralPostprocess";
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
  onStart: (range: PitchRange, engine: TranscriptionEngine) => void;
}) {
  const [range, setRange] = useState<PitchRange>("auto");
  const [engine, setEngine] = useState<TranscriptionEngine>("basic-pitch");
  return (
    <Modal
      title="Распознать акапеллу"
      eyebrow="ВОКАЛЬНЫЙ ТРЕНАЖЁР"
      onClose={onClose}
    >
      <p className="vocal-import-filename">{file.name}</p>
      <label className="field">
        Алгоритм распознавания
        <select
          aria-label="Алгоритм распознавания"
          value={engine}
          onChange={(e) => setEngine(e.target.value as TranscriptionEngine)}
        >
          <option value="basic-pitch">
            Basic Pitch · нейросеть + обработка вокала
          </option>
          <option value="classic">Классический · прежний алгоритм</option>
        </select>
      </label>
      <p>
        {engine === "basic-pitch"
          ? "Обработка на вашем устройстве, без отправки записи. Первый запуск загружает модель. Длинная запись может занять несколько минут; обработку можно отменить."
          : "Прежний анализ высоты голоса. Можно использовать для сравнения или если нейросеть не запускается."}
      </p>
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
        <button
          className="btn btn-primary"
          onClick={() => onStart(range, engine)}
        >
          Распознать ноты
        </button>
      </div>
    </Modal>
  );
}
