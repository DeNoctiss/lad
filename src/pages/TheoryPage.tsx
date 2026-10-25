import { useEffect, useRef, useState } from "react";
import { TOPICS, topicFor } from "../lib/solfege/course";
import { SolfegeAudio } from "../lib/solfege/audio";
import "../styles/solfege.css";
export function TheoryPage({
  topic,
  navigate,
}: {
  topic?: string;
  navigate: (route: string) => void;
}) {
  const lesson = topicFor(topic),
    index = TOPICS.indexOf(lesson),
    audio = useRef(new SolfegeAudio()).current;
  const [state, setState] = useState(audio.state),
    [error, setError] = useState("");
  useEffect(() => audio.subscribe(setState), [audio]);
  useEffect(() => {
    audio.stop();
    setError("");
  }, [lesson.id, audio]);
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
  return (
    <div className="sf-page sf-theory-page">
      <header className="sf-workspace-header">
        <div>
          <span className="sf-eyebrow">Базовый учебник · 11 тем</span>
          <h1>Теория музыки</h1>
          <p>Устройство музыки: объяснения, построение и звучащие примеры.</p>
        </div>
        <button onClick={() => navigate("solfege")}>К практике →</button>
      </header>
      <div className="sf-theory-layout">
        <nav className="sf-course-nav" aria-label="Темы учебника">
          {TOPICS.map((t) => (
            <button
              key={t.id}
              aria-current={lesson.id === t.id ? "page" : undefined}
              onClick={() => navigate(`theory/${t.id}`)}
            >
              {t.title}
            </button>
          ))}
        </nav>
        <article className="sf-card sf-lesson" key={lesson.id}>
          <span className="sf-eyebrow">
            Тема {index + 1} из {TOPICS.length}
          </span>
          <h2>{lesson.title.slice(4)}</h2>
          <p className="sf-lesson-lead">{lesson.summary}</p>
          {lesson.sections.map((s) => (
            <section key={s.title}>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </section>
          ))}
          {lesson.table && (
            <div className="sf-table-wrap">
              <table>
                <thead>
                  <tr>
                    {lesson.table.head.map((h) => (
                      <th key={h} scope="col">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lesson.table.rows.map((r, i) => (
                    <tr key={i}>
                      {r.map((c, j) => (
                        <td key={j}>{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <section className="sf-listening-examples">
            <h3>Услышать разницу</h3>
            {lesson.examples.map((e) => (
              <div key={e.title}>
                <button
                  onClick={() => {
                    setError("");
                    void audio.play(e.notes).catch((e) => setError(e.message));
                  }}
                >
                  ▶ {e.title}
                </button>
                <p>{e.caption}</p>
              </div>
            ))}
            <button onClick={() => audio.stop()}>Остановить звук</button>
            <span aria-live="polite" className="sf-muted">
              {state === "loading"
                ? " Загружаем рояль…"
                : state === "playing"
                  ? " Воспроизведение"
                  : ""}
            </span>
          </section>
          {error && (
            <p role="alert" className="sf-error">
              {error}
            </p>
          )}
          <details className="sf-selfcheck">
            <summary>Проверьте себя: {lesson.check.question}</summary>
            <p>{lesson.check.answer}</p>
          </details>
          <div className="sf-row">
            <button
              className="sf-primary"
              onClick={() => navigate(`solfege/${lesson.practice}`)}
            >
              Закрепить в упражнении →
            </button>
            {index < TOPICS.length - 1 && (
              <button
                onClick={() => navigate(`theory/${TOPICS[index + 1].id}`)}
              >
                Следующая тема
              </button>
            )}
          </div>
          {lesson.source && (
            <p className="sf-muted">
              Дополнительное чтение:{" "}
              <a href={lesson.source} target="_blank" rel="noreferrer">
                Open Music Theory — соответствующая глава (англ.)
              </a>
              . Здесь приведено самостоятельное краткое объяснение, а не перевод
              учебника.
            </p>
          )}
        </article>
      </div>
    </div>
  );
}
