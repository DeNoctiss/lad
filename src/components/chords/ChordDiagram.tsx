import { useId } from "react";
import type { Chord } from "../../lib/model";
import { strings } from "./chordUtils";

export function ChordDiagram({
  chord,
  compact = false,
}: {
  chord: Chord;
  compact?: boolean;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const left = 44;
  const top = 34;
  const spacing = 25;
  const fretHeight = 29;
  const description = chord.frets
    .map(
      (fret, index) =>
        `${strings[index]}: ${fret < 0 ? "не звучит" : fret === 0 ? "открытая" : `${fret} лад`}`,
    )
    .join("; ");

  // Determine which strings are covered by each barre
  const barres = chord.barres ?? [];
  const barreStrings = barres.map((barreFret) => {
    const covered: [number, number] = [-1, -1];
    chord.frets.forEach((f, i) => {
      if (f === barreFret) {
        if (covered[0] === -1) covered[0] = i;
        covered[1] = i;
      }
    });
    return { fret: barreFret, from: covered[0], to: covered[1] };
  });

  return (
    <svg
      className={`chord-diagram${compact ? " chord-diagram-compact" : ""}`}
      viewBox="0 0 210 219"
      role="img"
      aria-labelledby={`${titleId} ${descriptionId}`}
    >
      <title id={titleId}>{chord.name || "Предпросмотр аккорда"}</title>
      <desc id={descriptionId}>
        Слева направо от шестой струны к первой. {description}. Позиция:{" "}
        {chord.baseFret}–{chord.baseFret + 4} лады.
      </desc>
      {Array.from({ length: 6 }, (_, index) => (
        <line
          key={`fret-${index}`}
          x1={left}
          x2={left + spacing * 5}
          y1={top + index * fretHeight}
          y2={top + index * fretHeight}
          className={
            index === 0 && chord.baseFret === 1 ? "chord-nut" : "chord-fret"
          }
        />
      ))}
      {strings.map((string, index) => (
        <g key={string}>
          <line
            x1={left + index * spacing}
            x2={left + index * spacing}
            y1={top}
            y2={top + 5 * fretHeight}
            className="chord-string"
            strokeWidth={1.65 - index * 0.16}
          />
          <text
            x={left + index * spacing}
            y={201}
            className="chord-string-label"
            textAnchor="middle"
          >
            {string}
          </text>
        </g>
      ))}
      {Array.from({ length: 5 }, (_, index) => (
        <text
          key={`position-${index}`}
          x={25}
          y={top + (index + 0.5) * fretHeight + 4}
          textAnchor="end"
          className="chord-fret-label"
        >
          {chord.baseFret + index}
        </text>
      ))}
      {/* Draw barres as rounded rectangles behind the dots */}
      {barreStrings.map((barre, idx) => {
        if (
          barre.fret < chord.baseFret ||
          barre.fret > chord.baseFret + 4 ||
          barre.from < 0
        )
          return null;
        const x1 = left + barre.from * spacing;
        const x2 = left + barre.to * spacing;
        const cy = top + (barre.fret - chord.baseFret + 0.5) * fretHeight;
        return (
          <rect
            key={`barre-${idx}`}
            x={x1 - 8}
            y={cy - 7}
            width={x2 - x1 + 16}
            height={14}
            rx={7}
            className="chord-barre"
          />
        );
      })}
      {chord.frets.map((fret, index) => {
        const x = left + index * spacing;
        if (fret === -1)
          return (
            <path
              key={index}
              d={`M ${x - 4} 13 l 8 8 M ${x + 4} 13 l -8 8`}
              className="chord-mute"
            />
          );
        if (fret === 0)
          return (
            <circle key={index} cx={x} cy={17} r={4.5} className="chord-open" />
          );
        if (fret < chord.baseFret || fret > chord.baseFret + 4) return null;
        const cy = top + (fret - chord.baseFret + 0.5) * fretHeight;
        const finger = chord.fingers?.[index] ?? 0;
        return (
          <g key={index}>
            <circle cx={x} cy={cy} r={8} className="chord-dot" />
            {finger > 0 && (
              <text
                x={x}
                y={cy + 4}
                className="chord-finger"
                textAnchor="middle"
              >
                {finger}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
