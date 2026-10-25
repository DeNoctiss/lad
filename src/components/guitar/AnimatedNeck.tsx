import { useId } from "react";
import { NOTE_NAMES } from "../../lib/scales";
import {
  degree,
  expression,
  mod,
  OPEN,
  type LickNote,
} from "../../lib/guitar/model";
export type Position = { string: number; fret: number; finger?: number };
export function AnimatedNeck({
  positions,
  root,
  labels,
  blue,
  major,
  chordTones = [],
  notes,
  active = 0,
  beat = 0,
  tempo = 80,
  animate = true,
  playing = false,
  width = 800,
}: {
  positions: Position[];
  root: number;
  labels: string;
  blue: boolean;
  major: boolean;
  chordTones?: number[];
  notes?: LickNote[];
  active?: number;
  beat?: number;
  tempo?: number;
  animate?: boolean;
  playing?: boolean;
  width: number;
}) {
  const id = useId().replace(/:/g, ""),
    min = 0,
    max = 24,
    cell = Math.max(46, (width - 65) / (max - min + 1)),
    w = (max - min + 1) * cell + 65;
  const x = (f: number) => 65 + (f - min + 0.5) * cell,
    y = (s: number) => 62 + s * 44,
    map = new Map(positions.map((p) => [`${p.string}-${p.fret}`, p]));
  const n = notes?.[active],
    next = notes?.[active + 1],
    start = notes?.slice(0, active).reduce((a, n) => a + n.beats, 0) ?? 0,
    fraction = n ? (beat - start) / n.beats : 0,
    delta =
      n && animate ? expression(n, fraction, ((beat - start) * 60) / tempo) : 0;
  const horizontal = n && ["slide", "hammer", "pull"].includes(n.technique),
    bend = n && ["bend", "release", "prebend", "vibrato"].includes(n.technique),
    dir = n && n.string < 3 ? 1 : -1;
  const dotX = n ? x(n.fret) + (horizontal ? delta * cell : 0) : 0,
    dotY = n ? y(n.string) + (bend ? delta * 15 * dir : 0) : 0;
  return (
    <div className="gl-scroll gl-full-neck">
      <svg
        width={w}
        height="330"
        role="img"
        aria-label="Гриф: ноты, ступени и движения"
      >
        <defs>
          <marker
            id={id}
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6" fill="#a52650" />
          </marker>
        </defs>
        <rect width={w} height="330" rx="16" className="gl-wood" />
        {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((f) => (
          <g key={f}>
            <line
              x1={x(f) + cell / 2}
              x2={x(f) + cell / 2}
              y1="45"
              y2="295"
              className="gl-fret"
            />
            <text x={x(f)} y="28" textAnchor="middle">
              {f}
            </text>
          </g>
        ))}
        <line
          x1={x(0) + cell / 2}
          x2={x(0) + cell / 2}
          y1="45"
          y2="295"
          className="gl-nut"
        />
        {[3, 5, 7, 9, 12, 15, 17, 19, 21, 24].map((f) => (
          <g key={`marker-${f}`}>
            <circle cx={x(f)} cy="314" r="3" fill="#82968d" />
            {f % 12 === 0 && (
              <circle cx={x(f) + 10} cy="314" r="3" fill="#82968d" />
            )}
          </g>
        ))}
        {OPEN.map((m, s) => (
          <g key={s}>
            <text x="20" y={y(s) + 5}>
              {NOTE_NAMES[mod(m)]}
            </text>
            <line x1="55" x2={w} y1={y(s)} y2={y(s)} className="gl-string" />
            {Array.from({ length: max - min + 1 }, (_, i) => i + min).map(
              (f) => {
                const midi = m + f,
                  pos = map.get(`${s}-${f}`),
                  isRoot = mod(midi) === root,
                  isBlue = blue && mod(midi - root) === (major ? 3 : 6),
                  isChord = chordTones.includes(mod(midi));
                if (!pos && !isBlue && !isChord) return null;
                const label =
                  labels === "fingers"
                    ? (pos?.finger ??
                      (isBlue ? (major ? "♭3" : "♭5") : degree(midi, root)))
                    : labels === "degrees"
                      ? degree(midi, root)
                      : labels === "notes"
                        ? NOTE_NAMES[mod(midi)]
                        : `${NOTE_NAMES[mod(midi)]} · ${degree(midi, root)}`;
                return (
                  <g
                    key={f}
                    data-position={`${s}-${f}`}
                    data-finger={pos?.finger}
                  >
                    <circle
                      cx={x(f)}
                      cy={y(s)}
                      r={labels === "both" ? 21 : 18}
                      className={`${isRoot ? "gl-root" : "gl-note"} ${isChord ? "gl-chord-tone" : ""} ${isBlue ? "gl-blue" : ""} ${!pos && isChord ? "gl-outside" : ""}`}
                      opacity={notes ? 0.45 : 1}
                    />
                    <text x={x(f)} y={y(s) + 5} textAnchor="middle">
                      {labels === "both" ? (
                        <>
                          <tspan x={x(f)} dy="-7">
                            {NOTE_NAMES[mod(midi)]}
                          </tspan>
                          <tspan x={x(f)} dy="16">
                            {degree(midi, root)}
                          </tspan>
                        </>
                      ) : (
                        label
                      )}
                    </text>
                  </g>
                );
              },
            )}
          </g>
        ))}
        {n && (
          <g className="gl-motion">
            {animate && next && (
              <line
                x1={horizontal ? x(n.target!) : x(n.fret)}
                y1={y(n.string)}
                x2={x(next.fret)}
                y2={y(next.string)}
                strokeDasharray="6 6"
                markerEnd={`url(#${id})`}
              />
            )}
            {animate &&
              horizontal &&
              (n.technique === "slide" ? (
                <line
                  x1={x(n.fret)}
                  y1={y(n.string) - 20}
                  x2={x(n.target!)}
                  y2={y(n.string) - 20}
                  markerEnd={`url(#${id})`}
                />
              ) : (
                <path
                  d={`M ${x(n.fret)} ${y(n.string) - 18} Q ${(x(n.fret) + x(n.target!)) / 2} ${y(n.string) - 40} ${x(n.target!)} ${y(n.string) - 18}`}
                  fill="none"
                  markerEnd={`url(#${id})`}
                />
              ))}
            {animate && bend && (
              <>
                <line
                  x1={x(n.fret)}
                  y1={y(n.string)}
                  x2={x(n.fret)}
                  y2={y(n.string) + 32 * dir}
                  markerEnd={`url(#${id})`}
                />
                <path
                  d={`M ${x(n.fret) - 35} ${y(n.string)} Q ${dotX} ${dotY} ${x(n.fret) + 35} ${y(n.string)}`}
                  fill="none"
                />
              </>
            )}
            {animate && (bend || horizontal) && (
              <text
                x={x(n.fret) + 25}
                y={y(n.string) - 25}
                className="gl-technique-label"
              >
                {n.technique === "hammer"
                  ? "H"
                  : n.technique === "pull"
                    ? "P"
                    : n.technique === "vibrato"
                      ? "~"
                      : horizontal
                        ? "слайд"
                        : "1 тон"}
              </text>
            )}
            <circle
              cx={dotX}
              cy={dotY}
              r={
                n.technique === "pick" && playing
                  ? 19 + 3 * Math.exp(-Math.max(0, fraction) * 12)
                  : 19
              }
              className="gl-playhead"
            />
            <text x={dotX} y={dotY + 5} textAnchor="middle">
              {horizontal && fraction >= (n.technique === "slide" ? 0.8 : 0.48)
                ? n.target
                : n.fret}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
