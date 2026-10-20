import { Guitar, Plus } from "lucide-react";
import type { Song, TabPart } from "../../lib/model";
import { TabGuide } from "../tabs/TabGuide";
import { PartCard } from "./PartCard";
import { EmptyState } from "../ui/EmptyState";
import { PartNavigation } from "./PartNavigation";

export function PartsPanel({
  song,
  onUpdate,
  onEditPart,
  activePartId,
  onSelectPart,
}: {
  song: Song;
  onUpdate: (song: Song) => void;
  onEditPart: (part: TabPart | "new") => void;
  activePartId: string | null;
  onSelectPart: (id: string) => void;
}) {
  const active =
    song.parts.find((part) => part.id === activePartId) ?? song.parts[0];
  const deletePart = (part: TabPart) =>
    onUpdate({
      ...song,
      parts: song.parts.filter((item) => item.id !== part.id),
      updatedAt: new Date().toISOString(),
    });
  return (
    <div className="parts-panel">
      <PartNavigation
        parts={song.parts}
        activeId={active?.id}
        onSelect={(part) => onSelectPart(part.id)}
        onAdd={() => onEditPart("new")}
      />
      <div className="part-workspace">
        {active ? (
          <PartCard
            key={active.id}
            part={active}
            bpm={song.bpm}
            onEdit={() => onEditPart(active)}
            onDelete={() => deletePart(active)}
          />
        ) : (
          <EmptyState
            icon={<Guitar size={36} />}
            title="Пока звучит только текст"
            action={
              <button className="btn" onClick={() => onEditPart("new")}>
                <Plus size={16} />
                Добавить первую партию
              </button>
            }
          >
            Добавьте партию ритм-гитары, соло, баса или барабанов.
            <br />
            Табулатуру можно заполнить вручную.
          </EmptyState>
        )}
        <TabGuide />
      </div>
    </div>
  );
}
