import { useId, useState } from "react";
import type { TabPart } from "../../lib/model";
import { emptyTab, uid } from "../../lib/model";
import { Modal } from "../ui/Modal";
import { Check, Settings2 } from "lucide-react";
import type { TabScore } from "../../lib/tabTypes";
import {
  createScore,
  kindForInstrument,
  parseNotation,
  scoreIssues,
  serializeNotation,
  validateScore,
} from "../../lib/tablature";
import { TabGuide } from "../tabs/TabGuide";
import { PartMetaFields } from "./PartMetaFields";
import { PartSoundSelect } from "./PartSoundSelect";
import { FormatSwitch } from "./FormatSwitch";
import { ScoreBlock } from "./ScoreBlock";
import { TextTabBlock } from "./TextTabBlock";
import { PartValidation } from "./PartValidation";
import { PartNavigation } from "../song/PartNavigation";
import { ThemeToggle } from "../layout/ThemeToggle";

export function PartEditor({
  part,
  bpm,
  onSave,
  onClose,
  parts = [],
  songTitle,
  onSwitchPart,
  onLyrics,
}: {
  part?: TabPart;
  /** Song tempo passed to the preview player; defaults to 92. */
  bpm?: number;
  onSave: (part: TabPart) => void;
  onClose: () => void;
  parts?: TabPart[];
  songTitle?: string;
  onSwitchPart?: (part: TabPart | "new") => void;
  onLyrics?: () => void;
}) {
  const formId = useId();
  const [name, setName] = useState(part?.name ?? "");
  const [instrument, setInstrument] = useState(
    part?.instrument ?? "Ритм-гитара",
  );
  const [tuning, setTuning] = useState(part?.tuning ?? "E A D G B e");
  const [sound, setSound] = useState<string | undefined>(part?.sound);
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
    sound,
    content,
    format,
    score.meter,
    serializeNotation(score),
    notation,
  ]);
  const [initialSnapshot] = useState(snapshot);
  const leaveEditor = (action: () => void) => {
    if (
      snapshot === initialSnapshot ||
      window.confirm("Отменить несохранённые изменения партии?")
    )
      action();
  };
  const closeEditor = () => leaveEditor(onClose);
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
    if (kindForInstrument(next) !== kind) {
      setSound(undefined);
      setTuning(
        next === "Барабаны"
          ? "CC · SP · RD · HH · HT · MT · SD · LT · BD"
          : next === "Бас-гитара"
            ? "E A D G"
            : next === "Пианино"
              ? "88 клавиш · A0–C8"
              : "E A D G B e",
      );
    }
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
  const submit = () => {
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
        ...(sound ? { sound } : {}),
      });
    } catch (error) {
      setNotationError(
        error instanceof Error ? error.message : "Проверьте партию",
      );
    }
  };
  return (
    <Modal
      title={part ? "Редактировать партию" : "Новая партия"}
      onClose={closeEditor}
      wide
      className="part-editor-modal"
      eyebrow={songTitle ? `ЛАД / ${songTitle}` : "ЛАД / ТАБУЛАТУРЫ"}
      headerActions={
        <>
          <ThemeToggle />
          <button
            type="submit"
            form={formId}
            className="btn btn-primary"
            disabled={!name.trim() || sourcePending || issues.length > 0}
          >
            <Check size={17} />
            Сохранить партию
          </button>
        </>
      }
    >
      <div
        className="editor-song-modes"
        role="group"
        aria-label="Содержимое песни"
      >
        <button type="button" onClick={() => leaveEditor(onLyrics ?? onClose)}>
          Текст и аккорды
        </button>
        <button type="button" aria-pressed="true">
          Табулатуры <span>{parts.length}</span>
        </button>
        <span className="editor-draft-state">
          {snapshot === initialSnapshot
            ? "Партия открыта"
            : "Есть несохранённые изменения"}
        </span>
      </div>
      <form
        id={formId}
        className="part-editor-form"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="part-editor-layout">
          <PartNavigation
            parts={parts}
            activeId={part?.id}
            addDisabled={!part}
            onSelect={(next) => {
              if (next.id !== part?.id) leaveEditor(() => onSwitchPart?.(next));
            }}
            onAdd={() => {
              if (part) leaveEditor(() => onSwitchPart?.("new"));
            }}
          />
          <div className="part-editor-main">
            <details className="part-settings" open={part ? undefined : true}>
              <summary>
                <Settings2 size={17} />
                <span>
                  <strong>{name.trim() || "Новая партия"}</strong>
                  <small>{instrument} · Настройки партии</small>
                </span>
              </summary>
              <div className="part-settings-body">
                <PartMetaFields
                  name={name}
                  instrument={instrument}
                  tuning={tuning}
                  kind={kind}
                  onNameChange={setName}
                  onInstrumentChange={changeInstrument}
                  onTuningChange={setTuning}
                  autoFocus={!part}
                >
                  <PartSoundSelect
                    kind={kind}
                    value={sound ?? ""}
                    onChange={setSound}
                  />
                </PartMetaFields>
                <FormatSwitch format={format} onChange={setFormat} />
              </div>
            </details>
            {format === "visual" ? (
              <ScoreBlock
                score={score}
                kind={kind}
                tuning={tuning}
                sound={sound}
                bpm={bpm}
                notation={notation}
                sourcePending={sourcePending}
                scoreMode={scoreMode}
                onScoreModeChange={setScoreMode}
                onScoreChange={changeScore}
                onNotationChange={(value) => {
                  setNotation(value);
                  setNotationError("");
                }}
                onApplyNotation={applyNotation}
              />
            ) : (
              <TextTabBlock
                instrument={instrument}
                content={content}
                onChange={setContent}
              />
            )}
            <TabGuide key={kind} kind={kind} onInsertExample={insertExample} />
            <PartValidation
              notationError={notationError}
              sourcePending={sourcePending}
              issues={issues}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
