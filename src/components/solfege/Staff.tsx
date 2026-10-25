/** Natural notes only; deliberate fixed CSS size keeps staff and labels legible. */
export function Staff({ notes }: { notes: number[] }) {
  const step = (midi: number) =>
    Math.floor(midi / 12) * 7 +
    [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6][midi % 12] -
    35;
  const width = Math.max(250, 85 + notes.length * 65);
  return (
    <div className="sf-staff">
      <svg
        width={width}
        height="170"
        role="img"
        aria-label="Задание на нотном стане, скрипичный ключ"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={i}
            x1="20"
            x2={width - 15}
            y1={55 + i * 14}
            y2={55 + i * 14}
            stroke="currentColor"
            opacity=".5"
          />
        ))}
        {/* Vector G-clef: no dependency on OS musical-symbol fonts. The inner curl sits on G4. */}
        <path
          transform="translate(48 97)"
          d="M -7 32 C -18 25 -22 39 -10 42 C 1 46 13 39 9 23 L -2 -41 C -6 -60 8 -63 10 -49 C 13 -32 -12 -22 -19 -7 C -27 11 -13 23 3 20 C 23 17 25 -2 10 -9 C -5 -16 -17 -3 -10 7 C -6 13 4 13 8 6 C 11 0 5 -6 -1 -3"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {notes.map((midi, i) => {
          const s = step(midi),
            y = 125 - s * 7,
            x = 95 + i * 65;
          const ledgers =
            s <= 0
              ? Array.from(
                  { length: Math.floor(-s / 2) + 1 },
                  (_, j) => 125 + j * 14,
                )
              : s >= 12
                ? Array.from(
                    { length: Math.floor((s - 12) / 2) + 1 },
                    (_, j) => 41 - j * 14,
                  )
                : [];
          return (
            <g key={i}>
              {ledgers.map((l) => (
                <line
                  key={l}
                  x1={x - 15}
                  x2={x + 15}
                  y1={l}
                  y2={l}
                  stroke="currentColor"
                />
              ))}
              <ellipse
                cx={x}
                cy={y}
                rx="9"
                ry="6"
                transform={`rotate(-18 ${x} ${y})`}
                fill="currentColor"
              />
              <line
                x1={x + (s < 6 ? 8 : -8)}
                x2={x + (s < 6 ? 8 : -8)}
                y1={y}
                y2={y + (s < 6 ? -35 : 35)}
                stroke="currentColor"
                strokeWidth="2"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
