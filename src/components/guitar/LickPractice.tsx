import { useEffect, useMemo, useRef, useState } from "react";
import {
  InstrumentInput,
  inputDevices,
  type InstrumentFrame,
} from "../../lib/audio/instrumentInput";
import {
  LickFollower,
  practiceSteps,
  type FollowResult,
} from "../../lib/guitar/practice";
import { GuitarAudio } from "../../lib/guitar/audio";
import { OPEN, pitchName, type LickNote } from "../../lib/guitar/model";
import { Disclosure } from "../ui/Disclosure";
const empty: FollowResult = {
  index: 0,
  status: "listening",
  cents: null,
  accepted: false,
};
const messages = {
  listening: "Сыграйте указанную ноту",
  uncertain: "Нужен чистый одиночный звук",
  low: "Ниже нужной ноты",
  high: "Выше нужной ноты",
  holding: "Верно — немного удержите",
  repeat: "Повторите щипок или приглушите струну",
  complete: "Лик пройден!",
};
export function LickPractice({
  notes,
  active,
  onNote,
}: {
  notes: LickNote[];
  active: boolean;
  onNote: (index: number, midi: number) => void;
}) {
  const steps = useMemo(() => practiceSteps(notes), [notes]),
    follower = useMemo(() => new LickFollower(steps), [steps]);
  const input = useRef(new InstrumentInput()).current,
    audio = useRef(new GuitarAudio()).current,
    callback = useRef(onNote);
  callback.current = onNote;
  const generation = useRef(0),
    previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState(empty),
    [frame, setFrame] = useState<InstrumentFrame | null>(null),
    [running, setRunning] = useState(false),
    [pending, setPending] = useState(false),
    [previewing, setPreviewing] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]),
    [device, setDevice] = useState(""),
    [error, setError] = useState("");
  const step = steps[Math.min(state.index, steps.length - 1)];
  function stop() {
    generation.current++;
    input.stop();
    audio.stop();
    if (previewTimer.current) clearTimeout(previewTimer.current);
    setRunning(false);
    setPending(false);
    setPreviewing(false);
    setFrame(null);
  }
  async function refresh() {
    try {
      setDevices(await inputDevices());
    } catch {
      setError("Не удалось получить список аудиовходов.");
    }
  }
  useEffect(() => {
    const token = { live: true };
    const refreshSafe = () => {
      void inputDevices()
        .then((list) => {
          if (token.live) setDevices(list);
        })
        .catch(() => {});
    };
    refreshSafe();
    navigator.mediaDevices?.addEventListener("devicechange", refreshSafe);
    const hide = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      token.live = false;
      generation.current++;
      input.stop();
      audio.dispose();
      if (previewTimer.current) clearTimeout(previewTimer.current);
      navigator.mediaDevices?.removeEventListener("devicechange", refreshSafe);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [input, audio]);
  useEffect(() => {
    if (!active) stop();
  }, [active]);
  useEffect(() => {
    stop();
    follower.seek();
    setState(empty);
    if (steps[0]) callback.current(steps[0].noteIndex, steps[0].midi);
  }, [follower, steps]);
  function seek(index: number) {
    stop();
    follower.seek(index);
    setState({ ...empty, index: follower.index });
    const next = steps[follower.index];
    if (next) callback.current(next.noteIndex, next.midi);
  }
  async function connect() {
    stop();
    setError("");
    if (follower.index >= steps.length) {
      follower.seek();
      setState(empty);
    } else follower.seek(follower.index);
    const next = steps[follower.index];
    if (next) callback.current(next.noteIndex, next.midi);
    const token = generation.current;
    setPending(true);
    try {
      const started = await input.start(
        device,
        (p) => {
          if (token !== generation.current) return;
          setFrame(p);
          const result = follower.update(p, performance.now());
          setState(result);
          if (result.accepted) {
            const target = steps[Math.min(result.index, steps.length - 1)];
            if (target) callback.current(target.noteIndex, target.midi);
          }
          if (result.status === "complete") {
            input.stop();
            setRunning(false);
          }
        },
        () => {
          setRunning(false);
          setError(
            "Аудиовход отключён. Подключите устройство и включите проверку снова.",
          );
        },
      );
      if (token !== generation.current) return;
      setRunning(started);
      setPending(false);
      if (started) void refresh();
    } catch (e) {
      if (token === generation.current) {
        setPending(false);
        setError(e instanceof Error ? e.message : "Ошибка аудиовхода");
      }
    }
  }
  async function preview() {
    stop();
    setError("");
    setPreviewing(true);
    const token = generation.current;
    try {
      const string = Math.max(
        0,
        OPEN.findIndex((m) => step.midi >= m && step.midi - m <= 24),
      );
      await audio.play(
        [
          {
            string,
            fret: step.midi - OPEN[string],
            beats: 1,
            technique: "pick",
          },
        ],
        80,
      );
      if (token === generation.current)
        previewTimer.current = setTimeout(() => setPreviewing(false), 1100);
    } catch (e) {
      if (token === generation.current) {
        setPreviewing(false);
        setError(e instanceof Error ? e.message : "Ошибка звука");
      }
    }
  }
  if (!step) return <p>В этой фразе пока нет нот.</p>;
  return (
    <section className="gl-practice" aria-label="Практика лика с гитарой">
      <div className="gl-practice-header">
        <strong>Сыграть по шагам</strong>
        <span>
          Шаг {Math.min(state.index + 1, steps.length)} из {steps.length}
        </span>
      </div>
      <progress
        aria-label="Пройденные шаги"
        max={steps.length}
        value={state.index}
      />
      <div className="gl-practice-readout">
        <div>
          <span>Нужная нота</span>
          <strong>{pitchName(step.midi)}</strong>
          <span>{step.label}</span>
        </div>
        <div>
          <span>Слышу</span>
          <strong>
            {frame?.midi == null ? "—" : pitchName(Math.round(frame.midi))}
          </strong>
          <span>
            {frame?.midi == null || state.cents === null
              ? "Одиночные ноты"
              : `${Math.round(state.cents) > 0 ? "+" : ""}${Math.round(state.cents)} центов`}
          </span>
        </div>
        <div className={`gl-practice-status ${state.status}`} role="status">
          <strong>
            {running || state.status === "complete"
              ? messages[state.status]
              : "Проверка на паузе"}
          </strong>
          <span>
            {frame?.peak && frame.peak >= 0.98
              ? "Перегрузка: уменьшите входной уровень"
              : running && (frame?.rms ?? 0) < 0.006
                ? "Тихий сигнал или тишина"
                : "Проверяем высоту, без оценки ритма"}
          </span>
        </div>
      </div>
      <div className="gl-transport">
        <button
          disabled={previewing || !active}
          onClick={() => (running || pending ? stop() : void connect())}
        >
          {pending
            ? "Отменить подключение"
            : running
              ? "Пауза проверки"
              : "Включить проверку"}
        </button>
        <button disabled={previewing} onClick={() => void preview()}>
          Послушать ноту
        </button>
        <button onClick={() => seek(0)}>Начать заново</button>
        <button disabled={!state.index} onClick={() => seek(state.index - 1)}>
          ← Шаг
        </button>
        <button
          disabled={state.index >= steps.length - 1}
          onClick={() => seek(state.index + 1)}
        >
          Шаг →
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      <Disclosure title="Аудиовход и помощь">
        <label className="gl-input-picker">
          Устройство ввода{" "}
          <select
            aria-label="Устройство ввода гитары"
            value={device}
            onChange={(e) => {
              stop();
              setDevice(e.target.value);
            }}
          >
            <option value="">По умолчанию</option>
            {devices.map((d, i) => (
              <option key={d.deviceId || i} value={d.deviceId}>
                {d.label || `Аудиовход ${i + 1}`}
              </option>
            ))}
          </select>
        </label>
        <button onClick={() => void refresh()}>Обновить устройства</button>
        <label>
          Уровень сигнала{" "}
          <meter min={0} max={1} value={Math.min(1, (frame?.rms ?? 0) * 5)} />
        </label>
        <p>
          Подключите гитару к звуковой карте или используйте микрофон. Играйте
          по одной ноте, без перегруза и эффектов. Нужен стандартный строй
          E–A–D–G–B–E. Для прослушивания используйте наушники.
        </p>
        <p>
          Струну и лад выбираете по схеме: звук не позволяет надёжно различать
          одинаковую ноту на разных струнах. Для переходов проверяются начальная
          и конечная высоты; способ исполнения и ритм пока не оцениваются. При
          вибрато проверяется основная нота.
        </p>
        <p>
          После прослушивания включите проверку вручную. Повторная одинаковая
          нота требует нового щипка или короткого приглушения. Ввод прекращается
          при уходе со страницы или скрытии вкладки. Аудио не записывается и не
          отправляется на сервер.
        </p>
      </Disclosure>
    </section>
  );
}
