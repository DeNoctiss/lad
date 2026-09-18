import { ChevronDown, ChevronUp, Guitar, Pencil, Trash2 } from "lucide-react";
import type { TabPart } from "../../lib/model";
import { TabScoreView } from "../tabs/TabScoreView";

export function PartCard({
  part,
  bpm,
  collapsed,
  onToggle,
  onEdit,
  onDelete,
}: {
  part: TabPart;
  bpm: number;
  collapsed: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="part-card">
      <div className="part-header">
        <button
          className="part-title"
          aria-expanded={!collapsed}
          onClick={onToggle}
        >
          <Guitar size={18} />
          <span>
            <strong>{part.name}</strong>
            <small>
              {part.instrument} · {part.tuning}
              <span className="part-saved-format">
                {part.format === "visual" ? "Визуальная" : "Текст"}
              </span>
            </small>
          </span>
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
        <div className="heading-actions">
          <button
            className="btn-icon"
            aria-label={`Редактировать ${part.name}`}
            onClick={onEdit}
          >
            <Pencil size={15} />
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
      {!collapsed &&
        (part.format === "visual" && part.score ? (
          <TabScoreView
            score={part.score}
            bpm={bpm}
            tuning={part.tuning}
            sound={part.sound}
          />
        ) : (
          <pre className="tab-content">
            {part.content || "Партия пока пуста"}
          </pre>
        ))}
    </article>
  );
}
