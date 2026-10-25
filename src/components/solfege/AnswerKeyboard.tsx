import { pitchName, mod } from "../../lib/guitar/model";
import type { SoundNote } from "../../lib/solfege/exercises";
import "../../styles/answerKeyboard.css";
export function AnswerKeyboard({
  selected,
  onChange,
  disabled,
  play,
  expected,
  base = 60,
}: {
  selected: number[];
  onChange: (n: number[]) => void;
  disabled: boolean;
  play: (notes: SoundNote[]) => Promise<boolean>;
  expected?: number[];
  base?: number;
}) {
  const start = Math.floor(base / 12) * 12,
    keys = Array.from({ length: 25 }, (_, i) => start + i);
  let white = 0;
  return (
    <div>
      <div className="ak-scroll">
        <div className="ak-keyboard" role="group" aria-label="Ответ на пианино">
          {keys.map((m) => {
            const black = [1, 3, 6, 8, 10].includes(mod(m)),
              position = black ? white * 42 - 13 : white++ * 42;
            return (
              <button
                key={m}
                disabled={disabled}
                aria-label={pitchName(m)}
                aria-pressed={selected.includes(m)}
                className={`ak-key ${black ? "black" : "white"} ${selected.includes(m) ? "selected" : ""} ${expected?.includes(m) ? "expected" : ""}`}
                style={{ left: position, width: black ? 26 : 40 }}
                onClick={() => {
                  onChange(
                    selected.includes(m)
                      ? selected.filter((n) => n !== m)
                      : [...selected, m].sort((a, b) => a - b),
                  );
                  void play([{ midi: m, beat: 0, duration: 0.65 }]);
                }}
              >
                <span>{pitchName(m)}</span>
              </button>
            );
          })}
        </div>
      </div>
      <p>Выбрано: {selected.map(pitchName).join(" · ") || "нажмите клавиши"}</p>
    </div>
  );
}
