import { useState } from "react";
import type { Band, Chord, Song } from "../../lib/model";
import { extractChords, uid } from "../../lib/model";
import { Modal } from "../ui/Modal";
import { Check, Music2, Guitar, Trash2 } from "lucide-react";

export function SongEditor({
  song,
  bands,
  bandId,
  chords,
  onSave,
  onDelete,
  onClose,
}: {
  song?: Song;
  bands: Band[];
  bandId?: string;
  chords: Chord[];
  onSave: (song: Song) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(song?.title ?? "");
  const [selectedBand, setSelectedBand] = useState(
    song?.bandId ?? bandId ?? bands[0]?.id ?? "",
  );
  const [key, setKey] = useState(song?.key ?? "Am");
  const [bpm, setBpm] = useState(song?.bpm ?? 90);
  const [capo, setCapo] = useState(song?.capo ?? 0);
  const [lyrics, setLyrics] = useState(song?.lyrics ?? "{Куплет 1}\n[Am]");
  const [chordText, setChordText] = useState(song?.chords.join(", ") ?? "");
  const [defaultVoicings, setDefaultVoicings] = useState<
    Record<string, string>
  >(song?.defaultVoicings ?? {});
  const detected = extractChords(lyrics);
  return (
    <Modal
      title={song ? "Редактировать песню" : "Новая песня"}
      onClose={onClose}
      wide
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim() || !selectedBand) return;
          onSave({
            id: song?.id ?? uid(),
            bandId: selectedBand,
            title: title.trim(),
            key: key.trim(),
            bpm,
            capo,
            lyrics,
            chords: [
              ...new Set([
                ...detected,
                ...chordText
                  .split(/[,\s]+/)
                  .map((value) => value.trim())
                  .filter(Boolean),
              ]),
            ],
            favorite: song?.favorite ?? false,
            parts: song?.parts ?? [],
            defaultVoicings,
            updatedAt: new Date().toISOString(),
          });
        }}
      >
        <div className="form-grid">
          <label className="field">
            Название песни
            <input
              required
              autoFocus
              maxLength={120}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Как называется ваша песня?"
            />
          </label>
          <label className="field">
            Группа
            <select
              required
              value={selectedBand}
              onChange={(event) => setSelectedBand(event.target.value)}
            >
              {bands.map((band) => (
                <option value={band.id} key={band.id}>
                  {band.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-grid three">
          <label className="field">
            Тональность
            <input
              maxLength={12}
              value={key}
              onChange={(event) => setKey(event.target.value)}
              placeholder="Am"
            />
          </label>
          <label className="field">
            Темп, BPM
            <input
              type="number"
              min={20}
              max={300}
              required
              value={bpm}
              onChange={(event) => setBpm(Number(event.target.value))}
            />
          </label>
          <label className="field">
            Каподастр, лад
            <input
              type="number"
              min={0}
              max={12}
              required
              value={capo}
              onChange={(event) => setCapo(Number(event.target.value))}
            />
          </label>
        </div>
        <label className="field">
          Текст и аккорды
          <span className="field-help">
            Ставьте аккорд перед словом: <code>[Am]Текст [F]песни</code>.
            Разделы: <code>{"{Припев}"}</code>.
          </span>
          <textarea
            className="lyrics-editor"
            rows={12}
            value={lyrics}
            onChange={(event) => setLyrics(event.target.value)}
            spellCheck={false}
          />
        </label>
        <div className="detected-chords">
          <Music2 size={15} />В тексте:{" "}
          {detected.length ? (
            detected.map((chord) => (
              <span className="chord-pill" key={chord}>
                {chord}
              </span>
            ))
          ) : (
            <span>пока нет аккордов</span>
          )}
        </div>
        <label className="field">
          Аккорды песни
          <span className="field-help">
            Через запятую. Аккорды из текста добавятся автоматически. Здесь
            можно указать аккорды вступления или проигрыша.
          </span>
          <input
            value={chordText}
            onChange={(event) => setChordText(event.target.value)}
            placeholder="Am, F, C, G"
          />
        </label>
        {detected.length > 0 && (
          <div className="field">
            <span className="field-label">
              <Guitar size={15} /> Основные аппликатуры
            </span>
            <span className="field-help">
              Выберите, какой вариант взятия показывать для каждого аккорда при
              открытии песни.
            </span>
            <div className="voicing-picker">
              {detected.map((name) => {
                const variants = chords.filter((c) => c.name === name);
                if (!variants.length) return null;
                const current =
                  variants.find((v) => v.id === defaultVoicings[name]) ??
                  variants[0];
                return (
                  <label key={name} className="voicing-picker-item">
                    <span className="voicing-picker-name">{name}</span>
                    <select
                      value={current.id}
                      onChange={(event) =>
                        setDefaultVoicings((prev) => ({
                          ...prev,
                          [name]: event.target.value,
                        }))
                      }
                    >
                      {variants.map((variant, index) => (
                        <option key={variant.id} value={variant.id}>
                          {index + 1}: с {variant.baseFret} лада
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </div>
          </div>
        )}
        <div className="modal-actions">
          {song && onDelete && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                if (
                  window.confirm(
                    `Удалить песню «${song.title}» со всеми партиями? Действие необратимо.`,
                  )
                )
                  onDelete();
              }}
            >
              <Trash2 size={16} />
              Удалить песню
            </button>
          )}
          <button type="button" className="btn" onClick={onClose}>
            Отмена
          </button>
          <button
            className="btn btn-primary"
            disabled={!title.trim() || !selectedBand}
          >
            <Check size={17} />
            Сохранить песню
          </button>
        </div>
      </form>
    </Modal>
  );
}
