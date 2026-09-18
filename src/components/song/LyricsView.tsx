import { Music2 } from "lucide-react";
import { parseLyricLine } from "../../lib/model";
import { EmptyState } from "../ui/EmptyState";

export function LyricsView({
  lyrics,
  fontSize,
  onEdit,
}: {
  lyrics: string;
  fontSize: number;
  onEdit: () => void;
}) {
  return (
    <div className="lyrics" style={{ fontSize }} role="tabpanel">
      {lyrics.trim() ? (
        lyrics.split("\n").map((line, index) =>
          /^\{[^}]+\}$/.test(line.trim()) ? (
            <h3 className="lyric-section" key={index}>
              {line.trim().slice(1, -1)}
            </h3>
          ) : !line.trim() ? (
            <div className="lyric-space" key={index} />
          ) : (
            <div className="lyric-line" key={index}>
              {parseLyricLine(line).map((chunk, chunkIndex) => (
                <span className="lyric-chunk" key={chunkIndex}>
                  <span className="lyric-chord">{chunk.chord || "\u00a0"}</span>
                  <span>{chunk.text || "\u00a0"}</span>
                </span>
              ))}
            </div>
          ),
        )
      ) : (
        <EmptyState
          icon={<Music2 />}
          title="Здесь начинается песня"
          action={
            <button className="btn" onClick={onEdit}>
              Добавить текст
            </button>
          }
        >
          Добавьте текст и расставьте аккорды.
        </EmptyState>
      )}
    </div>
  );
}
