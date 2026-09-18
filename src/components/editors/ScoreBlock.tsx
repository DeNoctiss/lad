import type { TabKind, TabScore } from "../../lib/tabTypes";
import { serializeNotation } from "../../lib/tablature";
import { VisualTabEditor } from "../tabs/VisualTabEditor";
import { TabScoreView } from "../tabs/TabScoreView";

export function ScoreBlock({
  score,
  kind,
  tuning,
  notation,
  sourcePending,
  scoreMode,
  onScoreModeChange,
  onScoreChange,
  onNotationChange,
  onApplyNotation,
}: {
  score: TabScore;
  kind: TabKind;
  tuning: string;
  notation: string;
  sourcePending: boolean;
  scoreMode: "visual" | "notation";
  onScoreModeChange: (mode: "visual" | "notation") => void;
  onScoreChange: (score: TabScore) => void;
  onNotationChange: (notation: string) => void;
  onApplyNotation: () => void;
}) {
  return (
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
          onClick={() => onScoreModeChange("visual")}
        >
          На схеме
        </button>
        <button
          type="button"
          aria-pressed={scoreMode === "notation"}
          onClick={() => onScoreModeChange("notation")}
        >
          Запись нот
        </button>
      </div>
      {scoreMode === "visual" ? (
        <VisualTabEditor score={score} onChange={onScoreChange} />
      ) : (
        <>
          <label className="field">
            Ритмическая запись
            <span className="field-help">
              {kind === "piano"
                ? "Клавиша@длительность · пример: [C4,E4,G4]@2 D4@4 r@4. "
                : "Струна:лад@длительность · пример: 1:5~h@8 1:7@8 r@2. "}
              | — следующий такт. Размер {score.meter.beats}/{score.meter.unit}{" "}
              меняется на схеме.
            </span>
            <textarea
              aria-label="Ритмическая запись"
              className="tab-editor"
              rows={6}
              spellCheck={false}
              value={notation}
              onChange={(event) => onNotationChange(event.target.value)}
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
                onClick={() => onNotationChange(serializeNotation(score))}
              >
                Отменить правки записи
              </button>
              <button
                type="button"
                className="btn btn-primary btn-small"
                onClick={onApplyNotation}
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
  );
}
