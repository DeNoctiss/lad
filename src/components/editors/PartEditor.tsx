import { useState } from "react";
import type { TabPart } from "../../lib/model";
import { emptyTab, uid } from "../../lib/model";
import { Modal } from "../ui/Modal";
import { AlignLeft, Check, Guitar, Plus } from "lucide-react";
import type { TabScore } from "../../lib/tabTypes";
import {
  createScore,
  kindForInstrument,
  parseNotation,
  scoreIssues,
  serializeNotation,
  validateScore,
} from "../../lib/tablature";
import { VisualTabEditor } from "../tabs/VisualTabEditor";
import { TabScoreView } from "../tabs/TabScoreView";
import { TabGuide } from "../tabs/TabGuide";

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
