import { useState, useRef } from "react";
import {
  generateExercise,
  freshExercise,
  exerciseSignature,
  isCorrect,
  rhythmBeats,
  KINDS,
  type ExerciseKind,
  type SoundNote,
} from "../../lib/solfege/exercises";
import type { Attempt } from "../../lib/solfege/progress";
import { AnswerKeyboard } from "./AnswerKeyboard";
import { pitchName } from "../../lib/guitar/model";
import { Staff } from "./Staff";
export function ExercisePanel({
  kind,
  level,
  mode,
  play,
  stop,
  record,
  audioState = "idle",
}: {
  audioState?: string;
  kind: ExerciseKind;
  level: number;
  mode: "learn" | "practice";
  play: (
    notes: SoundNote[],
    countIn?: boolean,
    pulse?: boolean,
  ) => Promise<boolean>;
  stop: () => void;
  record: (a: Attempt) => void;
}) {
  const [q, setQ] = useState(() => generateExercise(kind, level));
  const recent = useRef<string[]>([exerciseSignature(q)]);
  const request = useRef(0);
  const [number, setNumber] = useState(1);
  const [keys, setKeys] = useState<number[]>([]);
  const [response, setResponse] = useState<string[]>([]),
    [result, setResult] = useState<"correct" | "incorrect" | "revealed" | null>(
      null,
    ),
    [heard, setHeard] = useState(false);
  const sequence = kind === "rhythm" || kind === "melody",
    auditory = !!q.auditory;
  function submit(outcome: "correct" | "incorrect" | "revealed") {
    if (result) return;
    setResult(outcome);
    record({ id: q.id, kind, level, outcome, date: new Date().toISOString() });
  }
  function answer(option: string) {
    if (result) return;
    if (sequence) {
      if (
        response.length < 16 &&
        (kind !== "rhythm" ||
          rhythmBeats([...response, option]) <= (q.beats ?? 4))
      )
        setResponse([...response, option]);
    } else {
      setResponse([option]);
      submit(isCorrect(q, [option]) ? "correct" : "incorrect");
    }
  }
  const ready =
    kind === "rhythm"
      ? rhythmBeats(response) === (q.beats ?? 4)
      : kind === "melody"
        ? response.length === q.answer.length
        : response.length > 0;
  return (
    <section className="sf-card sf-exercise">
      <div className="sf-row sf-between">
        <span className="sf-eyebrow">
          Задание {number} · {KINDS.find((k) => k.id === kind)?.title}
        </span>
        <span className="sf-muted">
          {mode === "learn"
            ? "Обучение с подсказками"
            : "Самостоятельная практика"}
        </span>
      </div>
      <h2>{q.prompt}</h2>
      {q.staff && <Staff notes={q.staff} />}
      {mode === "learn" && (
        <details className="sf-callout">
          <summary>Подсказка к заданию</summary>
          <p>{q.hint}</p>
        </details>
      )}
      <div className="sf-row">
        {q.notes.length > 0 && (
          <button
            className="sf-primary"
            disabled={audioState === "loading"}
            onClick={async () => {
              const token = ++request.current;
              const started = await play(
                q.notes,
                kind === "rhythm",
                kind === "rhythm",
              );
              if (token === request.current && started) setHeard(true);
            }}
          >
            ▶{" "}
            {audioState === "loading"
              ? "Загружаю звук…"
              : heard
                ? "Послушать ещё раз"
                : "Слушать задание"}
          </button>
        )}
        {(audioState === "playing" || audioState === "loading") && (
          <button
            onClick={() => {
              request.current++;
              stop();
            }}
          >
            Остановить звук
          </button>
        )}
        {q.tonic !== undefined && (
          <button
            onClick={() => play([{ midi: q.tonic!, beat: 0, duration: 1.4 }])}
          >
            ▶ Тоника — I ступень
          </button>
        )}
      </div>
      {sequence && (
        <>
          <p>
            {kind === "rhythm"
              ? `Заполнено ${rhythmBeats(response)} из ${q.beats ?? 4} долей`
              : `Выбрано ${response.length} из ${q.answer.length} ступеней`}
          </p>
          <div
            className="sf-response"
            aria-label="Ваш ответ"
            aria-live="polite"
          >
            {response.length ? (
              response.map((n, i) => <span key={i}>{n}</span>)
            ) : (
              <span className="sf-muted">
                Нажимайте варианты в нужном порядке
              </span>
            )}
          </div>
        </>
      )}
      {q.keyboardAnswer ? (
        <>
          <AnswerKeyboard
            selected={keys}
            onChange={setKeys}
            disabled={!!result}
            play={play}
            base={q.keyboardRoot}
            expected={result ? q.keyboardAnswer : undefined}
          />
          <div className="sf-row">
            <button
              disabled={!!result || !keys.length}
              onClick={() => setKeys([])}
            >
              Очистить
            </button>
            <button
              disabled={!keys.length}
              onClick={() =>
                play(keys.map((midi) => ({ midi, beat: 0, duration: 1 })))
              }
            >
              Прослушать выбранное
            </button>
            <button
              disabled={!!result || !keys.length}
              onClick={() =>
                submit(
                  keys.length === q.keyboardAnswer!.length &&
                    keys.every((n, i) => n === q.keyboardAnswer![i])
                    ? "correct"
                    : "incorrect",
                )
              }
            >
              Проверить
            </button>
          </div>
        </>
      ) : (
        <div className="sf-answers" role="group" aria-label="Варианты ответа">
          {q.options.map((option) => (
            <button
              key={option}
              disabled={
                !!result ||
                (auditory && !heard) ||
                (sequence &&
                  (kind === "rhythm"
                    ? rhythmBeats([...response, option]) > (q.beats ?? 4)
                    : response.length >= q.answer.length))
              }
              aria-pressed={!sequence && response[0] === option}
              onClick={() => answer(option)}
            >
              {option}
              {kind === "melody" || kind === "degrees" ? " ступень" : ""}
            </button>
          ))}
        </div>
      )}
      {auditory && !heard && (
        <p className="sf-muted">
          Сначала прослушайте задание, затем выберите ответ.
        </p>
      )}
      {sequence && (
        <div className="sf-row">
          <button
            disabled={!!result || !response.length}
            onClick={() => setResponse(response.slice(0, -1))}
          >
            Убрать последний
          </button>
          <button
            className="sf-primary"
            disabled={!!result || !ready}
            onClick={() =>
              submit(isCorrect(q, response) ? "correct" : "incorrect")
            }
          >
            Проверить ответ
          </button>
        </div>
      )}
      {result ? (
        <div className={`sf-result ${result}`} role="status">
          <strong>
            {result === "correct"
              ? "Верно!"
              : result === "incorrect"
                ? "Пока не совпало — разберём ответ"
                : "Ответ открыт для разбора"}
          </strong>
          <p>{q.explanation}</p>
          {q.keyboardAnswer && (
            <p>
              Нужные клавиши: {q.keyboardAnswer.map(pitchName).join(" · ")}.
              Зелёная отметка показывает правильные клавиши; золотой цвет — ваш
              выбор.
            </p>
          )}
          <p className="sf-muted">
            {result === "revealed"
              ? "Просмотр не засчитан как самостоятельная попытка."
              : "В статистику записана первая попытка."}
          </p>
        </div>
      ) : (
        <button className="sf-link" onClick={() => submit("revealed")}>
          Показать ответ и разобрать
        </button>
      )}
      <div className="sf-row">
        <button
          onClick={() => {
            stop();
            request.current++;
            const next = freshExercise(kind, level, recent.current);
            recent.current = [...recent.current, exerciseSignature(next)].slice(
              -8,
            );
            setQ(next);
            setNumber((n) => n + 1);
            setResponse([]);
            setKeys([]);
            setResult(null);
            setHeard(false);
          }}
        >
          {result ? "Следующее задание →" : "Другое задание"}
        </button>
      </div>
    </section>
  );
}
