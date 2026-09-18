import { ChordDiagram } from "./ChordDiagram";

export function ChordPreview({
  name,
  baseFret,
  frets,
  error,
}: {
  name: string;
  baseFret: number;
  frets: number[];
  error?: string;
}) {
  const canPreview = !error;
  return (
    <div className="chord-preview">
      <span className="eyebrow">ПРЕДПРОСМОТР</span>
      <h3>{name.trim() || "Ваш аккорд"}</h3>
      {canPreview ? (
        <ChordDiagram chord={{ id: "preview", name, baseFret, frets }} />
      ) : (
        <p className="chord-preview-hint">{error}</p>
      )}
      {canPreview && (
        <span className="chord-position">
          {baseFret}–{baseFret + 4} лады
        </span>
      )}
    </div>
  );
}
