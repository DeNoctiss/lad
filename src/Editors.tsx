import { useState } from "react";
import type { Band, Chord, Song, TabPart } from "./model";
import { emptyTab, extractChords, uid } from "./model";
import { Modal } from "./Modal";
import { Check, Music2, Plus, AlignLeft, Guitar, Trash2 } from "lucide-react";
import type { TabScore } from "./tabTypes";
import {
  createScore,
  kindForInstrument,
  parseNotation,
  scoreIssues,
  serializeNotation,
  validateScore,
} from "./tablature";
import { VisualTabEditor } from "./VisualTabEditor";
import { TabScoreView } from "./TabScoreView";
import { TabGuide } from "./TabGuide";

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

export function PartEditor({
  part,
  onSave,
  onClose,
}: {
  part?: TabPart;
  onSave: (part: TabPart) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(part?.name ?? "");
  const [instrument, setInstrument] = useState(
    part?.instrument ?? "Ритм-гитара",
  );
  const [tuning, setTuning] = useState(part?.tuning ?? "E A D G B e");
  const [content, setContent] = useState(
    part?.content ?? emptyTab("Ритм-гитара"),
  );
  const [format, setFormat] = useState<"text" | "visual">(
    part ? (part.format ?? "text") : "visual",
  );
  const [score, setScore] = useState<TabScore>(() =>
    part?.score
      ? structuredClone(part.score)
      : createScore(kindForInstrument(part?.instrument ?? "Ритм-гитара")),
  );
  const [notation, setNotation] = useState(() => serializeNotation(score));
  const [scoreMode, setScoreMode] = useState<"visual" | "notation">("visual");
  const [notationError, setNotationError] = useState("");
  const issues = scoreIssues(score);
  const sourcePending = notation !== serializeNotation(score);
  const kind = kindForInstrument(instrument);
  const snapshot = JSON.stringify([
    name,
    instrument,
    tuning,
    content,
    format,
    score.meter,
    serializeNotation(score),
    notation,
  ]);
  const [initialSnapshot] = useState(snapshot);
  const closeEditor = () => {
    if (
      snapshot === initialSnapshot ||
      window.confirm("Отменить несохранённые изменения партии?")
    )
      onClose();
  };
  const changeScore = (next: TabScore) => {
    setScore(next);
    setNotation(serializeNotation(next));
    setNotationError("");
  };
  const changeInstrument = (next: string) => {
    if (kindForInstrument(next) !== kind) {
      if (
        (score.measures.some((bar) => bar.events.length) || sourcePending) &&
        !window.confirm(
          "У этого инструмента другие струны или дорожки. Очистить только визуальную версию партии? Обычный текст останется без изменений.",
        )
      )
        return;
      changeScore(createScore(kindForInstrument(next)));
    }
    if (content === emptyTab(instrument)) setContent(emptyTab(next));
    if (kindForInstrument(next) !== kind)
      setTuning(
        next === "Барабаны"
          ? "CC · SP · RD · HH · HT · MT · SD · LT · BD"
          : next === "Бас-гитара"
            ? "E A D G"
            : next === "Пианино"
              ? "88 клавиш · A0–C8"
              : "E A D G B e",
      );
    setInstrument(next);
  };
  const applyNotation = () => {
    try {
      changeScore(parseNotation(notation, kind, score.meter));
    } catch (error) {
      setNotationError(
        error instanceof Error ? error.message : "Не удалось разобрать запись",
      );
    }
  };
  const insertExample = (text: string) => {
    if (
      (score.measures.some((bar) => bar.events.length) || sourcePending) &&
      !window.confirm(
        "Заменить визуальную версию учебным примером? Обычный текст останется без изменений.",
      )
    )
      return;
    changeScore(parseNotation(text, kind, { beats: 4, unit: 4 }));
    setFormat("visual");
    setScoreMode("visual");
  };
  return (
    <Modal
      title={part ? "Редактировать партию" : "Новая партия"}
      onClose={closeEditor}
      wide
    >
      <form
        className="part-editor-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim() || sourcePending || issues.length) return;
          try {
            validateScore(score, kind);
            onSave({
              id: part?.id ?? uid(),
              name: name.trim(),
              instrument,
              tuning: tuning.trim(),
              content,
              format,
              score,
            });
          } catch (error) {
            setNotationError(
              error instanceof Error ? error.message : "Проверьте партию",
            );
          }
        }}
      >
        <div className="form-grid">
          <label className="field">
            Название партии
            <input
              autoFocus
              required
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Вступление, куплет, соло…"
            />
          </label>
          <label className="field">
            Инструмент
            <select
              aria-label="Инструмент"
              value={instrument}
              onChange={(event) => changeInstrument(event.target.value)}
            >
              {[
                "Ритм-гитара",
                "Соло-гитара",
                "Бас-гитара",
                "Барабаны",
                "Пианино",
                "Другое",
              ].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          Строй / обозначения дорожек
          <input
            value={tuning}
            onChange={(event) => setTuning(event.target.value)}
            placeholder="E A D G B e"
          />
          <span className="field-help">
            {kind === "piano"
              ? "C4 — среднее до. Доступны клавиши A0–C8; это поле служит заметкой о партии."
              : "Это заметка о строе. Номера струн на схеме идут от тонкой к толстой; подписи показывают стандартный строй."}
          </span>
        </label>
        <div
          className="part-editor-modes"
          role="group"
          aria-label="Формат партии"
        >
          <button
            type="button"
            aria-pressed={format === "visual"}
            onClick={() => setFormat("visual")}
          >
            <Guitar size={16} />
            Визуальная партия
          </button>
          <button
            type="button"
            aria-pressed={format === "text"}
            onClick={() => setFormat("text")}
          >
            <AlignLeft size={16} />
            Обычный текст
          </button>
        </div>
        <p className="part-mode-hint">
          Текст и визуальная версия независимы и сохраняются вместе. Выбранный
          режим определяет, что будет видно в песне. Старые табы не
          преобразуются автоматически.
        </p>
        <TabGuide key={kind} kind={kind} onInsertExample={insertExample} />
        {format === "visual" ? (
          <>
            <div
              className="part-score-modes"
              role="group"
              aria-label="Способ редактирования"
            >
              <button
                type="button"
                aria-pressed={scoreMode === "visual"}
                disabled={sourcePending}
                onClick={() => setScoreMode("visual")}
              >
                На схеме
              </button>
              <button
                type="button"
                aria-pressed={scoreMode === "notation"}
                onClick={() => setScoreMode("notation")}
              >
                Запись нот
              </button>
            </div>
            {scoreMode === "visual" ? (
              <VisualTabEditor score={score} onChange={changeScore} />
            ) : (
              <>
                <label className="field">
                  Ритмическая запись
                  <span className="field-help">
                    {kind === "piano"
                      ? "Клавиша@длительность · пример: [C4,E4,G4]@2 D4@4 r@4. "
                      : "Струна:лад@длительность · пример: 1:5~h@8 1:7@8 r@2. "}
                    | — следующий такт. Размер {score.meter.beats}/
                    {score.meter.unit} меняется на схеме.
                  </span>
                  <textarea
                    aria-label="Ритмическая запись"
                    className="tab-editor"
                    rows={6}
                    spellCheck={false}
                    value={notation}
                    onChange={(event) => {
                      setNotation(event.target.value);
                      setNotationError("");
                    }}
                  />
                </label>
                <div className="part-notation-actions">
                  <span>
                    {sourcePending
                      ? "Есть неприменённые изменения"
                      : "Запись соответствует схеме"}
                  </span>
                  <div>
                    <button
                      type="button"
                      className="btn btn-small"
                      disabled={!sourcePending}
                      onClick={() => {
                        setNotation(serializeNotation(score));
                        setNotationError("");
                      }}
                    >
                      Отменить правки записи
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-small"
                      onClick={applyNotation}
                    >
                      Применить запись
                    </button>
                  </div>
                </div>
                <span className="part-notation-label">
                  {sourcePending
                    ? "Предпросмотр последней применённой записи"
                    : "Предпросмотр"}
                </span>
                <TabScoreView score={score} tuning={tuning} />
              </>
            )}
          </>
        ) : (
          <>
            <div className="tab-editor-tools">
              <span className="field-help">
                e — тонкая струна, E — толстая; h — хаммер, p — пулл-офф, / —
                слайд.
                <br />В этом режиме символы сохраняются как текст, без расчёта
                ритма.
              </span>
              <button
                type="button"
                className="btn btn-small"
                onClick={() =>
                  setContent(
                    (previous) => `${previous}\n\n${emptyTab(instrument)}`,
                  )
                }
              >
                <Plus size={14} />
                Добавить такт
              </button>
            </div>
            <label className="field">
              Табулатура
              <textarea
                aria-label="Табулатура"
                className="tab-editor"
                rows={13}
                spellCheck={false}
                wrap="off"
                value={content}
                onChange={(event) => setContent(event.target.value)}
              />
            </label>
          </>
        )}
        {(notationError || sourcePending || issues.length > 0) && (
          <div className="part-validation" role="alert">
            {notationError ||
              (sourcePending
                ? "Перед сохранением примените или отмените правки на вкладке «Запись нот»."
                : "Исправьте визуальную партию перед сохранением.")}
            {issues.length > 0 && (
              <ul>
                {issues.slice(0, 8).map((issue, index) => (
                  <li key={index}>
                    Такт {issue.measure}
                    {issue.event ? `, событие ${issue.event}` : ""}:{" "}
                    {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={closeEditor}>
            Отмена
          </button>
          <button
            className="btn btn-primary"
            disabled={!name.trim() || sourcePending || issues.length > 0}
          >
            <Check size={17} />
            Сохранить партию
          </button>
        </div>
      </form>
    </Modal>
  );
}
