import { Pencil, Trash2 } from "lucide-react";
import type { TabPart } from "../../lib/model";
import { TabScoreView } from "../tabs/TabScoreView";
import { PartIcon } from "./PartNavigation";

export function PartCard({
  part,
  bpm,
  onEdit,
  onDelete,
}: {
  part: TabPart;
  bpm: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="part-card">
      <div className="part-header">
        <div className="part-title">
          <PartIcon instrument={part.instrument} />
          <span>
            <strong>{part.name}</strong>
            <small>
              {part.instrument} · {part.tuning}
              <span className="part-saved-format">
                {part.format === "visual" ? "Визуальная" : "Текст"}
              </span>
            </small>
          </span>
        </div>
        <div className="heading-actions">
          <button
            className="btn btn-primary"
            aria-label={`Редактировать ${part.name}`}
            onClick={onEdit}
          >
            <Pencil size={15} />
            <span>Редактировать</span>
          </button>
          <button
            className="btn-icon"
            aria-label={`Удалить ${part.name}`}
            onClick={() => {
              if (window.confirm(`Удалить партию «${part.name}»?`)) onDelete();
            }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      {part.format === "visual" && part.score ? (
        <TabScoreView
          score={part.score}
          bpm={bpm}
          tuning={part.tuning}
          sound={part.sound}
        />
      ) : (
        <pre className="tab-content">{part.content || "Партия пока пуста"}</pre>
      )}
    </article>
  );
}
