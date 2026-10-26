import { Disclosure } from "../ui/Disclosure";
import { LickPractice } from "./LickPractice";
import { usePracticeSetting } from "../../lib/guitar/settings";
import { useEffect, useMemo, useRef, useState } from "react";
import { NOTE_NAMES } from "../../lib/scales";
import {
  boxPositions,
  neighbouringBoxes,
  fullPentatonicPositions,
  LICKS,
  TECHNIQUES,
  transposeLick,
} from "../../lib/guitar/model";
import { GuitarAudio } from "../../lib/guitar/audio";
import { PROGRESSIONS, chordData } from "../../lib/guitar/progressions";
import { AnimatedNeck } from "./AnimatedNeck";
import { LickTab } from "./LickTab";
import "../../styles/guitarLab.css";
export function GuitarLab({
  onSaveLick,
  active: isActive = true,
}: {
  onSaveLick?: (title: string, content: string) => void;
  active?: boolean;
}) {
  const [practice, setPractice] = useState(false);
  const [practicePitch, setPracticePitch] = useState<number | null>(null);
  const [editDurations, setEditDurations] = useState(false);
  const [mode, setMode] = usePracticeSetting("mode"),
    [root, setRoot] = usePracticeSetting("root"),
    [major, setMajor] = usePracticeSetting("major"),
    [box, setBox] = usePracticeSetting("box"),
    [adjacent, setAdjacent] = usePracticeSetting("adjacent"),
    [all, setAll] = usePracticeSetting("all"),
    [blue, setBlue] = usePracticeSetting("blue"),
    [labels, setLabels] = usePracticeSetting("labels");
  const [lickId, setLickId] = usePracticeSetting("lickId"),
    [bpm, setBpm] = usePracticeSetting("bpm"),
    [loop, setLoop] = usePracticeSetting("loop"),
    [animate, setAnimate] = usePracticeSetting("animate"),
    [beat, setBeat] = useState(0),
    [playing, setPlaying] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [genre, setGenre] = usePracticeSetting("genre"),
    [progression, setProgression] = usePracticeSetting("progression"),
    [backing, setBacking] = usePracticeSetting("backing");
  const audio = useRef(new GuitarAudio()).current,
    raf = useRef(0),
    request = useRef(0),
    container = useRef<HTMLDivElement>(null),
    [width, setWidth] = useState(800);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const lick = LICKS[lickId],
    notes = useMemo(() => transposeLick(lick, root), [lick, root]),
    total = notes.reduce((sum, n) => sum + n.beats, 0),
    tempo = Math.max(40, Math.min(160, Number(bpm) || 80));
  const [durations, setDurations] = usePracticeSetting("durations");
  const prog = PROGRESSIONS[progression],
    chords = prog.chords.map((c) => chordData(c, root - (prog.minor ? 9 : 0))),
    lengths = chords.map((_, i) => durations[i] ?? 4),
    starts = lengths.map((_, i) =>
      lengths.slice(0, i).reduce((a, b) => a + b, 0),
    ),
    progressionLength = lengths.reduce((a, b) => a + b, 0),
    currentChordIndex = Math.max(
      0,
      starts.findIndex(
        (s, i) =>
          Math.min(beat, progressionLength - 0.000001) % progressionLength >=
            s &&
          Math.min(beat, progressionLength - 0.000001) % progressionLength <
            s + lengths[i],
      ),
    ),
    currentChord = chords[currentChordIndex];
  useEffect(() => {
    if (!isActive) stop();
  }, [isActive]);
  let cursor = 0;
  const index = notes.findIndex((n) => {
      cursor += n.beats;
      return beat < cursor;
    }),
    active = index < 0 ? notes.length - 1 : index,
    note = notes[active],
    start = notes.slice(0, active).reduce((s, n) => s + n.beats, 0);
  function stop(reset = false) {
    request.current++;
    cancelAnimationFrame(raf.current);
    audio.stop();
    setPlaying(false);
    setLoading(false);
    if (reset) setBeat(0);
  }
  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      request.current++;
      audio.dispose();
    },
    [audio],
  );
  useEffect(() => {
    const hide = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  });
  async function play(offset = beat) {
    stop();
    const token = request.current;
    setError("");
    setLoading(true);
    try {
      const duration = mode === "progressions" ? progressionLength : total;
      if (offset >= duration) offset = 0;
      const accompaniment =
        mode === "progressions" || backing
          ? chords.flatMap((c, i) =>
              c.midi.map((midi) => ({
                midi,
                beat: starts[i],
                duration: lengths[i] - 0.08,
              })),
            )
          : [];
      if (
        !(await audio.play(
          mode === "progressions" ? [] : notes,
          tempo,
          offset,
          accompaniment,
        )) ||
        token !== request.current
      )
        return;
      setLoading(false);
      setPlaying(true);
      const tick = () => {
        if (token !== request.current) return;
        const p = Math.max(
          0,
          ((audio.context!.currentTime - audio.startTime) * tempo) / 60,
        );
        if (p >= duration) {
          audio.stop();
          setBeat(duration);
          setPlaying(false);
          if (loop) void play(0);
          return;
        }
        setBeat(p);
        raf.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      if (token === request.current) {
        audio.stop();
        setLoading(false);
        setPlaying(false);
        setError(e instanceof Error ? e.message : "Не удалось воспроизвести");
      }
    }
  }
  function change(fn: () => void) {
    stop(true);
    setPracticePitch(null);
    fn();
  }
  const positions = all
    ? fullPentatonicPositions(root, major, box)
    : adjacent
      ? neighbouringBoxes(root, major, box)
      : boxPositions(root, major, box);
  const shown =
    mode === "licks"
      ? notes.flatMap((n) => [
          { string: n.string, fret: n.fret },
          ...(n.target === undefined
            ? []
            : [{ string: n.string, fret: n.target }]),
        ])
      : positions;
  return (
    <div className="gl-lab" ref={container}>
      <div className="gl-tabs" role="group" aria-label="Гитарная практика">
        {(
          [
            ["boxes", "Боксы пентатоники"],
            ["licks", "Лики и движения"],
            ["progressions", "Прогрессии"],
          ] as const
        ).map(([id, title]) => (
          <button
            key={id}
            aria-pressed={mode === id}
            onClick={() => change(() => setMode(id))}
          >
            {title}
          </button>
        ))}
      </div>
      <Disclosure
        title={`Тональность · ${NOTE_NAMES[root]} ${mode !== "licks" && major ? "мажор" : "минор"} · настройки`}
      >
        <div className="gl-controls">
          <label>
            Тоника
            <select
              aria-label="Тоника"
              value={root}
              onChange={(e) => change(() => setRoot(+e.target.value))}
            >
              {NOTE_NAMES.map((n, i) => (
                <option value={i} key={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label>
            Подписи
            <select
              aria-label="Подписи"
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
            >
              <option value="both">Ноты + ступени</option>
              <option value="notes">Ноты</option>
              <option value="degrees">Ступени</option>
              {mode === "boxes" && (
                <option value="fingers">Пальцы · вариант</option>
              )}
            </select>
          </label>
          {mode !== "licks" && (
            <label>
              Пентатоника
              <select
                value={String(major)}
                onChange={(e) =>
                  change(() => setMajor(e.target.value === "true"))
                }
              >
                <option value="false">Минорная</option>
                <option value="true">Мажорная</option>
              </select>
            </label>
          )}
          {mode !== "boxes" && (
            <label>
              Темп, BPM
              <input
                aria-label="Темп гитарной практики"
                type="number"
                min="40"
                max="160"
                value={bpm}
                onChange={(e) => change(() => setBpm(e.target.value))}
                onBlur={() => setBpm(String(tempo))}
              />
            </label>
          )}
        </div>
      </Disclosure>
      {mode === "boxes" && (
        <>
          <div className="gl-tabs">
            {[0, 1, 2, 3, 4].map((i) => (
              <button
                key={i}
                aria-pressed={box === i && !all}
                onClick={() => {
                  setBox(i);
                  setAll(false);
                }}
              >
                Бокс {i + 1}
              </button>
            ))}
            <button aria-pressed={all} onClick={() => setAll(!all)}>
              Весь гриф
            </button>
          </div>
          <div className="gl-controls">
            <label>
              <input
                type="checkbox"
                checked={adjacent}
                onChange={(e) => setAdjacent(e.target.checked)}
              />
              Соседний бокс
            </label>
            <label>
              <input
                type="checkbox"
                checked={blue}
                onChange={(e) => setBlue(e.target.checked)}
              />
              Блюзовая нота {major ? "♭3" : "♭5"}
            </label>
          </div>
        </>
      )}
      {mode === "licks" && (
        <>
          <label className="gl-picker">
            Учебная фраза
            <select
              aria-label="Учебная фраза"
              value={lickId}
              onChange={(e) => change(() => setLickId(+e.target.value))}
            >
              {LICKS.map((l, i) => (
                <option key={l.id} value={i}>
                  {i + 1}. {l.title}
                </option>
              ))}
            </select>
          </label>
          <p>
            {lick.goal} · {NOTE_NAMES[root]} минор. Все лики — авторские учебные
            примеры.
          </p>
          <Disclosure title="Анимация и аккомпанемент">
            {" "}
            <div className="gl-controls">
              <label>
                <input
                  type="checkbox"
                  checked={animate}
                  onChange={(e) => setAnimate(e.target.checked)}
                />
                Анимация движений
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={backing}
                  onChange={(e) => change(() => setBacking(e.target.checked))}
                />
                Аккомпанемент выбранной прогрессии
              </label>
            </div>
          </Disclosure>{" "}
          {backing && (
            <p>
              {prog.degrees}: {chords.map((c) => c.name).join(" → ")}. Выбрать
              другую можно во вкладке «Прогрессии». Для минорных ликов начните с
              минорного оборота.
            </p>
          )}
        </>
      )}
      {mode === "progressions" && (
        <>
          <Disclosure title={`Выбрать прогрессию · ${prog.degrees}`}>
            {" "}
            <div className="gl-tabs">
              {["Все", "Поп", "Рок", "Джаз", "Блюз"].map((g) => (
                <button
                  key={g}
                  aria-pressed={genre === g}
                  onClick={() => setGenre(g)}
                >
                  {g}
                </button>
              ))}
            </div>
            <div className="gl-catalog">
              {PROGRESSIONS.map(
                (p, i) =>
                  (genre === "Все" || genre === p.genre) && (
                    <button
                      key={i}
                      aria-pressed={progression === i}
                      onClick={() =>
                        change(() => {
                          setProgression(i);
                          setDurations([]);
                          setMajor(!p.minor);
                        })
                      }
                    >
                      <strong>{p.degrees}</strong>
                      <span>
                        {p.genre} · {p.source}
                      </span>
                    </button>
                  ),
              )}
            </div>
          </Disclosure>{" "}
          <p>
            Выбрано: <strong>{prog.degrees}</strong> ·{" "}
            {prog.minor ? "минор" : "мажор"}. Длительность каждого блока можно
            изменить. Учебная подборка, не статистический рейтинг.{" "}
            <a
              href={
                prog.source === "Musicca"
                  ? "https://www.musicca.com/chord-player"
                  : "https://www.hooktheory.com/trends"
              }
              target="_blank"
              rel="noreferrer"
            >
              Источник ↗
            </a>
          </p>
          <button
            aria-pressed={editDurations}
            onClick={() => setEditDurations(!editDurations)}
          >
            Длительности аккордов
          </button>
          <div className="gl-chords">
            {chords.map((c, i) => (
              <span className={currentChordIndex === i ? "active" : ""} key={i}>
                {c.name}
                <label className="gl-duration" hidden={!editDurations}>
                  Доли
                  <select
                    aria-label={`Длительность аккорда ${i + 1}`}
                    value={lengths[i]}
                    onChange={(e) =>
                      change(() =>
                        setDurations(
                          lengths.map((n, k) =>
                            k === i ? +e.target.value : n,
                          ),
                        ),
                      )
                    }
                  >
                    {[0.5, 1, 2, 3, 4, 6, 8].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </span>
            ))}
          </div>
          <p>
            Обводка — ноты текущего аккорда {currentChord.name}. Пустая обводка
            показывает ноты вне пентатоники.
          </p>
        </>
      )}
      {mode === "licks" && (
        <div className="gl-tabs" aria-label="Режим лика">
          <button
            aria-pressed={!practice}
            onClick={() => {
              stop(true);
              setPractice(false);
              setPracticePitch(null);
            }}
          >
            Послушать
          </button>
          <button
            aria-pressed={practice}
            onClick={() => {
              stop(true);
              setPractice(true);
            }}
          >
            Сыграть по шагам
          </button>
        </div>
      )}
      {mode !== "boxes" && !(mode === "licks" && practice) && (
        <div className="gl-transport">
          <button
            disabled={loading}
            onClick={() => (playing ? stop() : void play())}
          >
            {loading ? "Загрузка…" : playing ? "Ⅱ Пауза" : "▶ Играть"}
          </button>
          <button onClick={() => stop(true)}>■ Сначала</button>
          <label>
            <input
              type="checkbox"
              checked={loop}
              onChange={(e) => {
                stop();
                setLoop(e.target.checked);
              }}
            />
            Повторять
          </label>
          {mode === "licks" && (
            <>
              <button
                onClick={() => {
                  stop();
                  setBeat(Math.max(0, start - (notes[active - 1]?.beats ?? 0)));
                }}
              >
                ← Нота
              </button>
              <button
                onClick={() => {
                  stop();
                  setBeat(active + 1 < notes.length ? start + note.beats : 0);
                }}
              >
                Нота →
              </button>
              <span>
                {TECHNIQUES[note.technique]} · струна {note.string + 1}, лад{" "}
                {note.fret}
              </span>
            </>
          )}
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      <AnimatedNeck
        positions={shown}
        root={root}
        major={major}
        blue={mode === "boxes" && blue}
        labels={labels === "fingers" && mode !== "boxes" ? "both" : labels}
        chordTones={
          mode === "progressions" || (mode === "licks" && backing)
            ? currentChord.tones
            : []
        }
        notes={mode === "licks" ? notes : undefined}
        active={active}
        beat={beat}
        tempo={tempo}
        animate={animate}
        playing={playing}
        width={width}
        practicePitch={practice && mode === "licks" ? practicePitch : null}
      />
      {mode === "boxes" && (
        <Disclosure title="Как читать боксы">
          {" "}
          <p>
            Полный гриф: открытые струны и 24 лада. На узком экране
            прокручивайте его по горизонтали. Стандартный строй E–A–D–G–B–E.
            Формы сдвигаются вместе с тоникой. Золотым выделена тоника. Номер
            бокса — аппликатура, не ступень. Пальцы: один из вариантов, с
            подготовкой указательного пальца на каждой струне.
          </p>
        </Disclosure>
      )}
      {mode === "licks" && practice && (
        <LickPractice
          key={`${lick.id}-${root}`}
          notes={notes}
          active={isActive}
          onNote={(index, midi) => {
            setBeat(notes.slice(0, index).reduce((sum, n) => sum + n.beats, 0));
            setPracticePitch(midi);
          }}
        />
      )}
      {mode === "licks" && (
        <>
          <h3>Табулатура · нажмите ноту для разбора</h3>
          <LickTab
            notes={notes}
            active={active}
            width={width}
            onSelect={(b) => {
              stop();
              setPractice(false);
              setPracticePitch(null);
              setBeat(b);
            }}
          />
          {onSaveLick && (
            <button
              onClick={() =>
                onSaveLick(
                  `${lick.title} · ${NOTE_NAMES[root]}m`,
                  notes
                    .map(
                      (n) =>
                        `Струна ${n.string + 1}: ${n.fret}${n.target === undefined ? "" : " → " + n.target} · ${n.beats} дол. · ${TECHNIQUES[n.technique]}`,
                    )
                    .join("\n"),
                )
              }
            >
              Сохранить текстовый разбор в блокнот
            </button>
          )}
          <Disclosure title="Обозначения и приёмы">
            {" "}
            <p>
              Пунктир — следующая позиция. Сплошная стрелка — приём. Кружок
              обозначает звучащую позицию, не один и тот же палец. Звук —
              учебная имитация на локальных сэмплах.
            </p>
          </Disclosure>
        </>
      )}
    </div>
  );
}
