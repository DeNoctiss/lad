import { useState } from "react";
import { Guitar, Plus } from "lucide-react";
import type { Song, TabPart } from "../../lib/model";
import { TabGuide } from "../tabs/TabGuide";
import { PartCard } from "./PartCard";
import { EmptyState } from "../ui/EmptyState";

export function PartsPanel({
  song,
  onUpdate,
  onEditPart,
}: {
  song: Song;
  onUpdate: (song: Song) => void;
  onEditPart: (part: TabPart | "new") => void;
}) {
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const toggle = (id: string) =>
    setCollapsed((items) =>
      items.includes(id) ? items.filter((item) => item !== id) : [...items, id],
    );
  const deletePart = (part: TabPart) =>
    onUpdate({
      ...song,
      parts: song.parts.filter((item) => item.id !== part.id),
      updatedAt: new Date().toISOString(),
    });
  return (
    <div className="parts-panel" role="tabpanel">
      <div className="parts-intro">
        <div>
          <h3>Каждому инструменту — своя партия</h3>
          <p>Ваши табы, рисунки и музыкальные заметки.</p>
        </div>
        <button
          className="btn btn-primary btn-small"
          onClick={() => onEditPart("new")}
        >
          <Plus size={16} />
          Партия
        </button>
      </div>
      <TabGuide />
      {song.parts.length ? (
        song.parts.map((part) => (
          <PartCard
            key={part.id}
            part={part}
            bpm={song.bpm}
            collapsed={collapsed.includes(part.id)}
            onToggle={() => toggle(part.id)}
            onEdit={() => onEditPart(part)}
            onDelete={() => deletePart(part)}
          />
        ))
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
    </div>
  );
}
