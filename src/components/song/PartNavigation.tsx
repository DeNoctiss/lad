import { Drum, Guitar, Music2, Piano, Plus } from "lucide-react";
import type { TabPart } from "../../lib/model";

export function PartIcon({ instrument }: { instrument: string }) {
  const Icon =
    instrument === "Пианино"
      ? Piano
      : instrument === "Барабаны"
        ? Drum
        : instrument === "Другое"
          ? Music2
          : Guitar;
  return <Icon size={20} aria-hidden="true" />;
}

export function PartNavigation({
  parts,
  activeId,
  onSelect,
  onAdd,
  addDisabled = false,
}: {
  parts: TabPart[];
  activeId?: string;
  onSelect: (part: TabPart) => void;
  onAdd: () => void;
  addDisabled?: boolean;
}) {
  return (
    <nav className="part-navigation" aria-label="Партии инструментов">
      <div className="part-navigation-heading">
        <strong>Партии</strong>
        <span>{parts.length}</span>
      </div>
      <div className="part-navigation-list">
        {parts.map((part) => (
          <button
            key={part.id}
            type="button"
            className="part-navigation-item"
            aria-pressed={part.id === activeId}
            onClick={() => onSelect(part)}
          >
            <PartIcon instrument={part.instrument} />
            <span>
              <strong>{part.name}</strong>
              <small>{part.instrument}</small>
            </span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="btn part-add"
        aria-label="Партия"
        onClick={onAdd}
        disabled={addDisabled}
      >
        <Plus size={18} />
        Добавить партию
      </button>
    </nav>
  );
}
