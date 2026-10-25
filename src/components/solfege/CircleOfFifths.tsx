import { useState } from "react";
import {
  ALL_KEYS,
  CIRCLE,
  diatonicChords,
  keyFor,
  signLabel,
} from "../../lib/solfege/theory";
import type { SoundNote } from "../../lib/solfege/exercises";
export function CircleOfFifths({
  play,
  practice,
}: {
  play: (notes: SoundNote[]) => void;
  practice: () => void;
}) {
  const [fifths, setFifths] = useState(0),
    [minor, setMinor] = useState(false);
  const key = keyFor(fifths),
    chords = diatonicChords(key);
  const scale = minor
    ? [
        ...key.midi.slice(5),
        ...key.midi.slice(0, 5).map((n) => n + 12),
        key.midi[5] + 12,
      ]
    : [...key.midi, key.midi[0] + 12];
  const names = minor
    ? [...key.notes.slice(5), ...key.notes.slice(0, 5)]
    : key.notes;
  return (
    <div className="sf-circle-layout">
      <section className="sf-card">
        <h2>Кварто-квинтовый круг</h2>
        <p className="sf-muted">
          По часовой стрелке — квинта вверх. Против — кварта вверх.
        </p>
        <div
          className="sf-circle"
          role="group"
          aria-label="Тональности на круге"
        >
          <div className="sf-circle-center">
            <strong>{minor ? key.minor + "m" : key.tonic}</strong>
            <span>{signLabel(fifths)}</span>
          </div>
          {CIRCLE.map((f, i) => {
            const k = keyFor(f),
              angle = (i * Math.PI) / 6 - Math.PI / 2,
              selected = (f - fifths) % 12 === 0;
            return (
              <button
                key={f}
                aria-label={`${k.tonic} мажор, ${k.minor} минор`}
                aria-pressed={selected}
                className="sf-circle-key"
                style={{
                  left: `${50 + Math.cos(angle) * 40}%`,
                  top: `${50 + Math.sin(angle) * 40}%`,
                }}
                onClick={() => setFifths(f)}
              >
                <strong>{k.tonic}</strong>
                <span>{k.minor}m</span>
              </button>
            );
          })}
        </div>
        <p className="sf-muted">
          Внешнее название — мажор, внутреннее — параллельный минор. У них
          одинаковые ключевые знаки.
        </p>
      </section>
      <section className="sf-card sf-key-details">
        <div className="sf-eyebrow">Исследуйте тональность</div>
        <h2>{minor ? key.minor + " минор" : key.tonic + " мажор"}</h2>
        <label>
          Тональность, включая энгармонические варианты
          <select
            value={fifths}
            onChange={(e) => setFifths(Number(e.target.value))}
          >
            {ALL_KEYS.map((k) => (
              <option key={k.fifths} value={k.fifths}>
                {k.tonic} мажор / {k.minor} минор — {signLabel(k.fifths)}
              </option>
            ))}
          </select>
        </label>
        <div className="sf-row">
          <button aria-pressed={!minor} onClick={() => setMinor(false)}>
            Мажор
          </button>
          <button aria-pressed={minor} onClick={() => setMinor(true)}>
            Натуральный минор
          </button>
        </div>
        <div className="sf-callout">
          <strong>{signLabel(fifths)}</strong>
          <p>Порядок знаков: {key.signs.join(" → ") || "знаков нет"}.</p>
        </div>
        <div className="sf-scale">
          {names.map((n, i) => (
            <button
              key={n}
              onClick={() => play([{ midi: scale[i], beat: 0, duration: 1 }])}
            >
              <strong>{n}</strong>
              <span>{i + 1} ступень</span>
            </button>
          ))}
        </div>
        <div className="sf-row">
          <button
            className="sf-primary"
            onClick={() =>
              play(
                scale.map((midi, beat) => ({
                  midi,
                  beat: beat * 0.7,
                  duration: 0.6,
                })),
              )
            }
          >
            ▶ Прослушать гамму
          </button>
          <button onClick={practice}>Практика знаков</button>
        </div>
        <h3>Гармония {key.tonic} мажора</h3>
        <p className="sf-muted">
          Нажмите аккорд, чтобы услышать его. I — тоника, IV — субдоминанта, V —
          доминанта.
        </p>
        <div className="sf-row">
          {chords.map((c) => (
            <button
              key={c.numeral}
              onClick={() =>
                play(c.midi.map((midi) => ({ midi, beat: 0, duration: 1.5 })))
              }
            >
              {c.numeral} · {c.name}
            </button>
          ))}
        </div>
        <button
          onClick={() =>
            play(
              [0, 3, 4, 0].flatMap((n, i) =>
                chords[n].midi.map((midi) => ({
                  midi,
                  beat: i * 2,
                  duration: 1.7,
                })),
              ),
            )
          }
        >
          ▶ Каденция I–IV–V–I
        </button>
        <p className="sf-muted">
          ♯ повышает звук на полутон, ♭ понижает. F♯ и G♭ звучат одинаково в
          равномерной темперации, но записываются по-разному.
        </p>
      </section>
    </div>
  );
}
