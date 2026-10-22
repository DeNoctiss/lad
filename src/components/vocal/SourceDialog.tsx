import { useState } from "react";
import { Modal } from "../ui/Modal";
import { noteName } from "../../lib/vocal/model";
import type { MidiImport } from "../../lib/vocal/midi";
import type { TabPart } from "../../lib/model";
export function SourceDialog({
  replacing = false,
  midi,
  parts,
  onClose,
  onChoose,
}: {
  replacing?: boolean;
  midi?: MidiImport;
  parts?: TabPart[];
  onClose: () => void;
  onChoose: (index: number, voice: "high" | "low") => void;
}) {
  const [index, setIndex] = useState(0),
    [voice, setVoice] = useState<"high" | "low">("high");
  const items = midi
    ? midi.tracks.map((t) => t.name + " · " + t.notes.length + " нот")
    : (parts ?? []).map((p) => p.name + " · " + p.instrument);
  return (
    <Modal
      title={midi ? "Выберите MIDI-дорожку" : "Взять ноты из табулатуры"}
      eyebrow="ВОКАЛЬНЫЙ ТРЕНАЖЁР"
      onClose={onClose}
    >
      {replacing && (
        <p>
          Новая партия заменит текущие ноты. Загруженное аудио останется;
          скорость сбросится на 1×.
        </p>
      )}
      {items.length ? (
        <>
          <label className="field">
            Мелодическая партия
            <select
              value={index}
              onChange={(e) => setIndex(Number(e.target.value))}
            >
              {items.map((s, i) => (
                <option value={i} key={i}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Если несколько нот звучат одновременно
            <select
              value={voice}
              onChange={(e) => setVoice(e.target.value as "high" | "low")}
            >
              <option value="high">Верхний голос — самая высокая нота</option>
              <option value="low">Нижний голос — самая низкая нота</option>
            </select>
          </label>
          <p className="vocal-muted">
            Будет создана отдельная вокальная линия. Исходная партия останется в
            табулатурах.
          </p>
          {midi && (
            <p className="vocal-muted">
              Диапазон дорожки:{" "}
              {noteName(
                Math.min(...midi.tracks[index].notes.map((n) => n.midi)),
              )}
              –
              {noteName(
                Math.max(...midi.tracks[index].notes.map((n) => n.midi)),
              )}
              . Высота берётся из файла; сдвиг предыдущей партии не переносится.
            </p>
          )}
          {midi?.warnings.map((w) => (
            <p key={w} className="vocal-muted">
              {w}
            </p>
          ))}
          <div className="modal-actions">
            <button className="btn" onClick={onClose}>
              Отмена
            </button>
            <button
              className="btn btn-primary"
              onClick={() => onChoose(index, voice)}
            >
              Создать вокальную партию
            </button>
          </div>
        </>
      ) : (
        <>
          <p>
            Пока нет визуальных мелодических партий. Создайте партию гитары,
            баса или пианино во вкладке «Табулатуры».
          </p>
          <p className="vocal-muted">
            Ритм нельзя надёжно восстановить из обычного текста табулатуры;
            ударные также не подходят для вокала.
          </p>
          <button className="btn" onClick={onClose}>
            Понятно
          </button>
        </>
      )}
    </Modal>
  );
}
