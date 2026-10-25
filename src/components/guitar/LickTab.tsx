import {
  OPEN,
  mod,
  SYMBOLS,
  TECHNIQUES,
  type LickNote,
} from "../../lib/guitar/model";
import { NOTE_NAMES } from "../../lib/scales";
export function LickTab({
  notes,
  active,
  onSelect,
  width,
}: {
  notes: LickNote[];
  active: number;
  onSelect: (beat: number) => void;
  width: number;
}) {
  const w = Math.max(600, width, notes.length * 100 + 70),
    step = (w - 70) / notes.length;
  return (
    <div className="gl-scroll">
      <svg
        width={w}
        height="245"
        role="img"
        aria-label="Табулатура учебного лика"
      >
        {OPEN.map((m, s) => (
          <g key={s}>
            <text x="12" y={45 + s * 29}>
              {NOTE_NAMES[mod(m)]}
            </text>
            <line
              x1="40"
              x2={w}
              y1={40 + s * 29}
              y2={40 + s * 29}
              className="gl-string"
            />
          </g>
        ))}
        {notes.map((n, i) => {
          const select = () =>
            onSelect(notes.slice(0, i).reduce((a, n) => a + n.beats, 0));
          return (
            <g
              key={i}
              role="button"
              tabIndex={0}
              aria-label={`Нота ${i + 1}, струна ${n.string + 1}, лад ${n.fret}, ${TECHNIQUES[n.technique]}`}
              onClick={select}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  select();
                }
              }}
            >
              <text x={70 + i * step + step / 2} y="18" textAnchor="middle">
                {SYMBOLS[n.technique]}
              </text>
              <rect
                x={70 + i * step}
                y="25"
                width={step - 8}
                height="170"
                rx="8"
                className={active === i ? "gl-tab-active" : "gl-tab-cell"}
              />
              <text
                x={70 + i * step + step / 2}
                y={45 + n.string * 29}
                textAnchor="middle"
              >
                {n.fret}
                {n.target === undefined
                  ? ""
                  : `${n.technique === "slide" ? "/" : n.technique === "hammer" ? "h" : "p"}${n.target}`}
              </text>
              <text x={70 + i * step + step / 2} y="220" textAnchor="middle">
                {n.beats} дол.
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
