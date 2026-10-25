import { useEffect, useRef, useState } from "react";
import { CircleDot, Ear, Mic, TrendingUp, Square } from "lucide-react";
import { SolfegeAudio } from "../lib/solfege/audio";
import {
  KINDS,
  type ExerciseKind,
  type SoundNote,
} from "../lib/solfege/exercises";
import {
  addAttempt,
  emptyProgress,
  parseProgress,
  PROGRESS_KEY,
  stats,
  type Attempt,
} from "../lib/solfege/progress";
import { CircleOfFifths } from "../components/solfege/CircleOfFifths";
import { ExercisePanel } from "../components/solfege/ExercisePanel";
import { Intonation } from "../components/solfege/Intonation";
import "../styles/solfege.css";
type Tab = "practice" | "circle" | "sing" | "progress";
function readProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return { value: raw ? parseProgress(raw) : emptyProgress(), error: "" };
  } catch {
    return {
      value: emptyProgress(),
      error:
        "Прогресс не удалось прочитать. Исходные данные сохранены: автоматическая запись отключена. Можно импортировать исправную копию.",
    };
  }
}
export function SolfegePage({
  initialKind,
  navigate,
}: {
  initialKind?: string;
  navigate: (route: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("practice"),
    [kind, setKind] = useState<ExerciseKind>(
      KINDS.find((k) => k.id === initialKind)?.id ?? "intervals",
    ),
    [level, setLevel] = useState(1),
    [mode, setMode] = useState<"learn" | "practice">("learn");
  const [loaded] = useState(readProgress),
    [progress, setProgress] = useState(loaded.value),
    [blocked, setBlocked] = useState(!!loaded.error);
  const [error, setError] = useState(loaded.error),
    [notice, setNotice] = useState(""),
    [bpm, setBpm] = useState("80");
  const audio = useRef(new SolfegeAudio()).current,
    file = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const total = stats(progress.attempts);
  const [audioState, setAudioState] = useState(audio.state);
  useEffect(() => audio.subscribe(setAudioState), [audio]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) audio.stop();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      audio.dispose();
      document.removeEventListener("visibilitychange", hide);
    };
  }, [audio]);
  function switchTab(next: Tab) {
    audio.stop();
    setTab(next);
    setNotice("");
  }
  function practice(next: ExerciseKind) {
    audio.stop();
    setKind(next);
    setPickerOpen(false);
    setTab("practice");
  }
  async function play(
    notes: SoundNote[],
    countIn = false,
    pulse = false,
  ): Promise<boolean> {
    setError(blocked ? loaded.error : "");
    try {
      return await audio.play(
        notes,
        Math.max(40, Math.min(160, Number(bpm) || 80)),
        countIn,
        pulse,
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось воспроизвести звук",
      );
      return false;
    }
  }
  function record(attempt: Attempt) {
    const next = addAttempt(progress, attempt);
    setProgress(next);
    if (!blocked) {
      try {
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
      } catch {
        setError(
          "Не удалось сохранить прогресс. Экспортируйте его, чтобы не потерять результаты.",
        );
      }
    }
  }
  function exportProgress() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(progress, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "lad-solfege-progress.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importProgress(f?: File) {
    if (!f) return;
    try {
      if (f.size > 2000000)
        throw new Error("Файл слишком большой — максимум 2 МБ.");
      const next = parseProgress(await f.text());
      if (
        !window.confirm(
          "Заменить прогресс сольфеджио данными из файла? Библиотека песен не изменится.",
        )
      )
        return;
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
      setProgress(next);
      setBlocked(false);
      setError("");
      setNotice("Прогресс импортирован");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось импортировать прогресс",
      );
    }
  }
  return (
    <div className="sf-page">
      <header className="sf-workspace-header">
        <div>
          <span className="sf-eyebrow">
            Практика слуха и музыкального мышления
          </span>
          <h1>Сольфеджио</h1>
        </div>
        <div className="sf-header-summary">
          <span>
            {total.answered} ответов ·{" "}
            {total.percent === null
              ? "Начните с любого задания"
              : `${total.percent}% верно`}
          </span>
          <button onClick={() => navigate("theory")}>
            Учебник по темам ↗
          </button>
        </div>
      </header>
      <nav className="sf-tabs" aria-label="Разделы сольфеджио">
        {(
          [
            { id: "practice", label: "Практика", icon: Ear },
            { id: "circle", label: "Круг тональностей", icon: CircleDot },
            { id: "sing", label: "Интонация", icon: Mic },
            { id: "progress", label: "Прогресс", icon: TrendingUp },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            aria-current={tab === t.id ? "page" : undefined}
            onClick={() => switchTab(t.id)}
          >
            <t.icon size={19} />
            {t.label}
          </button>
        ))}
      </nav>
      <div className="sf-audio-bar">
        <label>
          Темп, BPM{" "}
          <input
            aria-label="Темп сольфеджио"
            type="number"
            min="40"
            max="160"
            value={bpm}
            onChange={(e) => setBpm(e.target.value)}
            onBlur={() =>
              setBpm(String(Math.max(40, Math.min(160, Number(bpm) || 80))))
            }
          />
        </label>
        <button onClick={() => audio.stop()}>
          <Square size={15} /> Остановить звук
        </button>
        <span className="sf-muted">
          {audioState === "loading"
            ? "Загружаем рояль…"
            : audioState === "playing"
              ? "Звучит рояль"
              : "Рояль · тот же звук, что в табулатурах"}
        </span>
      </div>
      {error && (
        <div role="alert" className="sf-error">
          {error}
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      {tab === "practice" && (
        <div className="sf-practice-layout">
          <aside className="sf-exercise-picker">
            <button
              className="sf-picker-toggle"
              aria-expanded={pickerOpen}
              aria-controls="sf-kind-list"
              onClick={() => setPickerOpen((v) => !v)}
            >
              {KINDS.find((k) => k.id === kind)?.title} · Сменить{" "}
              {pickerOpen ? "▴" : "▾"}
            </button>
            <h2>Что тренируем</h2>
            <p className="sf-muted">
              14 видов · новые задания при каждом повторе
            </p>
            <nav
              id="sf-kind-list"
              className="sf-kind-list"
              data-expanded={pickerOpen}
              aria-label="Виды упражнений"
            >
              {Array.from(new Set(KINDS.map((k) => k.group))).map((group) => (
                <section key={group}>
                  <h3>{group}</h3>
                  {KINDS.filter((k) => k.group === group).map((k) => (
                    <button
                      key={k.id}
                      aria-pressed={kind === k.id}
                      onClick={() => practice(k.id)}
                    >
                      <strong>{k.title}</strong>
                      <span>{k.description}</span>
                    </button>
                  ))}
                </section>
              ))}
            </nav>
          </aside>
          <div className="sf-practice-main">
            <div className="sf-session-settings">
              <div>
                <span className="sf-muted">Сложность</span>
                <div
                  className="sf-segmented"
                  role="group"
                  aria-label="Сложность"
                >
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      aria-pressed={level === n}
                      onClick={() => {
                        audio.stop();
                        setLevel(n);
                      }}
                    >
                      {n} · {["Основы", "Развитие", "Вызов"][n - 1]}
                    </button>
                  ))}
                </div>
              </div>
              <label className="sf-hint-toggle">
                <input
                  type="checkbox"
                  checked={mode === "learn"}
                  onChange={(e) =>
                    setMode(e.target.checked ? "learn" : "practice")
                  }
                />
                Подсказки
              </label>
            </div>
            <ExercisePanel
              key={`${kind}-${level}`}
              kind={kind}
              level={level}
              mode={mode}
              play={play}
              stop={() => audio.stop()}
              record={record}
            />
            <p className="sf-practice-footnote">
              Застряли?{" "}
              <button
                className="sf-link"
                onClick={() => navigate(`theory/${kind}`)}
              >
                Разобрать тему в учебнике
              </button>{" "}
              Ответ открывается только после проверки или по вашему запросу.
            </p>
          </div>
        </div>
      )}
      {tab === "circle" && (
        <CircleOfFifths play={play} practice={() => practice("keys")} />
      )}
      {tab === "sing" && <Intonation audio={audio} onError={setError} />}
      {tab === "progress" && (
        <section className="sf-card">
          <h2>Ваш прогресс</h2>
          <p>
            Сохраняется в этом браузере отдельно от песен. Учитывается первая
            проверка каждого задания. Просмотр ответа не повышает точность.
            Хранятся последние 5000 результатов.
          </p>
          <div className="sf-stat-grid">
            <div>
              <strong>{total.correct}</strong>
              <span>верно</span>
            </div>
            <div>
              <strong>{total.answered - total.correct}</strong>
              <span>с ошибкой</span>
            </div>
            <div>
              <strong>{total.revealed}</strong>
              <span>разобрано с ответом</span>
            </div>
          </div>
          <div className="sf-progress-list">
            {KINDS.map((k) => {
              const s = stats(progress.attempts.filter((a) => a.kind === k.id));
              return (
                <div key={k.id}>
                  <div>
                    <strong>{k.title}</strong>
                    <span>
                      {s.answered} попыток ·{" "}
                      {s.percent === null
                        ? "ещё нет оценки"
                        : s.percent + "% верно"}
                    </span>
                  </div>
                  <progress
                    aria-label={`Точность: ${k.title}`}
                    max="100"
                    value={s.percent ?? 0}
                  />
                  <button onClick={() => practice(k.id)}>Тренировать</button>
                </div>
              );
            })}
          </div>
          <div className="sf-row">
            <button onClick={exportProgress}>Экспорт прогресса</button>
            <button onClick={() => file.current?.click()}>
              Импорт прогресса
            </button>
            <input
              hidden
              type="file"
              accept=".json,application/json"
              ref={file}
              onChange={(e) => {
                void importProgress(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
          <p className="sf-muted">
            Экспорт библиотеки в шапке сохраняет песни. Для переноса результатов
            сольфеджио используйте отдельный экспорт здесь.
          </p>
        </section>
      )}
    </div>
  );
}
