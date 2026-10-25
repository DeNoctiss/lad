import { useEffect, useRef, useState } from "react";
import { VocalMicrophone } from "../../lib/vocal/microphone";
import type { Pitch } from "../../lib/vocal/pitch";
import type { SolfegeAudio } from "../../lib/solfege/audio";
import { centsFrom, pitchLabel } from "../../lib/solfege/theory";
import { Staff } from "./Staff";
const PHRASES = [
  [60, 62, 64, 62, 60],
  [60, 64, 67, 64, 60],
  [60, 65, 64, 62, 60],
];
export function Intonation({
  audio,
  onError,
}: {
  audio: SolfegeAudio;
  onError: (text: string) => void;
}) {
  const [octave, setOctave] = useState(-12),
    [phrase, setPhrase] = useState(0),
    [index, setIndex] = useState(0);
  const [active, setActive] = useState(false),
    [starting, setStarting] = useState(false),
    [pitch, setPitch] = useState<Pitch | null>(null);
  const mic = useRef(new VocalMicrophone()),
    alive = useRef(true),
    request = useRef(0);
  const notes = PHRASES[phrase],
    target = notes[index] + octave;
  const stop = () => {
    request.current++;
    mic.current.stop();
    setActive(false);
    setStarting(false);
    setPitch(null);
  };
  useEffect(() => {
    alive.current = true;
    const m = mic.current;
    const hide = () => {
      if (document.hidden) {
        request.current++;
        m.stop();
        setActive(false);
        setStarting(false);
        setPitch(null);
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      alive.current = false;
      request.current++;
      m.stop();
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  async function start() {
    const generation = ++request.current;
    setStarting(true);
    onError("");
    try {
      audio.stop();
      const ctx = await audio.ready();
      if (!alive.current || generation !== request.current) return;
      const ok = await mic.current.start(
        ctx,
        "",
        setPitch,
        () => {
          setActive(false);
          setPitch(null);
        },
        "stable",
      );
      if (alive.current && generation === request.current) setActive(ok);
    } catch (e) {
      if (alive.current && generation === request.current)
        onError(
          e instanceof Error ? e.message : "Не удалось включить микрофон",
        );
    } finally {
      if (alive.current && generation === request.current) setStarting(false);
    }
  }
  function listen(all: boolean) {
    stop();
    void audio
      .play(
        (all ? notes : [notes[index]]).map((midi, beat) => ({
          midi: midi + octave,
          beat,
          duration: 0.8,
        })),
      )
      .catch((e) => onError(String(e)));
  }
  const detected =
    pitch?.midi != null && pitch.confidence >= 0.8 ? pitch.midi : null;
  const cents = detected === null ? null : centsFrom(detected, target);
  return (
    <section className="sf-card">
      <div className="sf-eyebrow">Слушайте · представляйте · пойте</div>
      <h2>Интонация и пение по нотам</h2>
      <p>
        Пройдите фразу по одному звуку. Выберите удобную октаву: цель и
        эталонный звук изменятся вместе. Автоматического зачёта здесь нет —
        индикатор помогает сравнивать высоту, но не оценивает технику пения.
      </p>
      <div className="sf-controls">
        <label>
          Учебная фраза
          <select
            value={phrase}
            onChange={(e) => {
              stop();
              audio.stop();
              setPhrase(Number(e.target.value));
              setIndex(0);
            }}
          >
            {PHRASES.map((_, i) => (
              <option key={i} value={i}>
                Фраза {i + 1}
              </option>
            ))}
          </select>
        </label>
        <label>
          Удобный регистр
          <select
            value={octave}
            onChange={(e) => {
              stop();
              audio.stop();
              setOctave(Number(e.target.value));
            }}
          >
            <option value={-12}>Ниже — C3…G3</option>
            <option value={0}>Средний — C4…G4</option>
            <option value={12}>Выше — C5…G5</option>
          </select>
        </label>
      </div>
      <Staff notes={notes} />
      <p className="sf-muted">
        Запись в скрипичном ключе C4…G4. При выборе нижнего или верхнего
        регистра пойте соответственно на октаву ниже или выше записи.
      </p>
      <div className="sf-row">
        {notes.map((n, i) => (
          <button
            key={i}
            aria-pressed={index === i}
            onClick={() => {
              audio.stop();
              setIndex(i);
              setPitch(null);
            }}
          >
            {i + 1}. {pitchLabel(n + octave)}
          </button>
        ))}
      </div>
      <div className="sf-pitch-display">
        <span>Целевая нота</span>
        <strong>{pitchLabel(target)}</strong>
        <span>Ваш звук: {detected === null ? "—" : pitchLabel(detected)}</span>
        <div
          className="sf-pitch-track"
          role="meter"
          aria-label="Отклонение от цели в центах"
          aria-valuemin={-100}
          aria-valuemax={100}
          aria-valuenow={Math.max(-100, Math.min(100, cents ?? 0))}
          aria-valuetext={
            cents === null ? "Нет уверенного сигнала" : `${cents} центов`
          }
        >
          <i
            style={{
              left: `${50 + Math.max(-100, Math.min(100, cents ?? 0)) / 2}%`,
              opacity: cents === null ? 0 : 1,
            }}
          />
        </div>
        <span>
          {cents === null
            ? active
              ? "Спойте устойчивый звук…"
              : "Микрофон выключен"
            : Math.abs(cents) <= 35
              ? "Рядом с целью · " + cents + " центов"
              : `${cents > 0 ? "Выше" : "Ниже"} цели на ${Math.abs(cents)} центов`}
        </span>
      </div>
      <div className="sf-row">
        <button onClick={() => listen(false)}>▶ Эталон текущей ноты</button>
        <button onClick={() => listen(true)}>▶ Вся фраза</button>
        <button
          className="sf-primary"
          disabled={starting}
          onClick={() => (active ? stop() : void start())}
        >
          {starting
            ? "Подключение…"
            : active
              ? "Выключить микрофон"
              : "Включить микрофон"}
        </button>
      </div>
      <p className="sf-muted">
        Сначала слушайте, затем включайте микрофон и повторяйте. Наушники
        помогают не захватывать эталон из колонок. Звук не записывается и не
        отправляется на сервер. Если неудобно петь — смените регистр; не
        тянитесь за графиком через напряжение. 100 центов = полутон, 1200 =
        октава.
      </p>
    </section>
  );
}
