import { useRef } from "react";
import { pianoKeys, pianoLabel } from "../../../lib/piano";

export function PianoKeyboard({
  notes,
  onKey,
}: {
  notes: string[];
  onKey?: (key: string) => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  let white = 0;
  const positions = pianoKeys.map((key) => ({
    ...key,
    left: key.black ? white * 28 - 9 : white++ * 28,
  }));
  return (
    <div
      className="piano-keyboard-scroll"
      ref={viewport}
      tabIndex={0}
      role="region"
      aria-label="Клавиатура пианино, A0–C8, горизонтальная прокрутка"
    >
      <div className="piano-keyboard" style={{ width: white * 28 }}>
        {positions.map((key) => (
          <button
            type="button"
            key={key.name}
            data-note={key.name}
            className={`piano-key ${key.black ? "piano-key-black" : "piano-key-white"}`}
            style={{ left: key.left }}
            aria-label={`Клавиша ${pianoLabel(key.name)}`}
            aria-pressed={notes.includes(key.name)}
            disabled={!onKey}
            onClick={() => onKey?.(key.name)}
            title={pianoLabel(key.name)}
          >
            <span>{key.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
