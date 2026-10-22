import { midiToFrequency } from "../../lib/vocal/pitch";
import { Activity, AudioLines, Lightbulb, RotateCcw } from "lucide-react";
import { noteName } from "../../lib/vocal/model";
import type { TrainingMetrics, Pitch } from "../../lib/vocal/pitch";
export function TrainingFeedback({
  metrics,
  pitch,
  micOn,
  onReset,
}: {
  metrics: TrainingMetrics;
  pitch: Pitch;
  micOn: boolean;
  onReset: () => void;
}) {
  const cents = metrics.cents,
    accuracy = metrics.accuracy;
  const deviation = cents === null ? null : Math.round(cents);
  const hint = !micOn
    ? "Наденьте наушники и включите микрофон. Затем запустите тренировку."
    : metrics.scored < 5
      ? "Спойте фразу под эталон. Результат появится после первых нот."
      : metrics.coverage !== null && metrics.coverage < 35
        ? "Голос слышен не на всех нотах. Подвиньтесь к микрофону и пойте протяжно."
        : deviation === null
          ? "На паузах можно вдохнуть. Следующая нота подсвечена на дорожке."
          : Math.abs(deviation) <= 25
            ? "Вы близко к эталону. Держите звук ровно, без лишнего напряжения."
            : Math.abs(Math.abs(deviation) - 1200) < 90
              ? "Разница примерно в октаву. Проверьте высоту эталона и распознанных нот; при необходимости сдвиньте ноты в редакторе. Не форсируйте голос."
              : deviation > 0
                ? "Голос выше эталона. Попробуйте плавно опуститься к голубой ноте."
                : "Голос ниже эталона. Попробуйте плавно подняться к голубой ноте.";
  return (
    <aside className="vocal-feedback" aria-label="Результаты тренировки">
      <section className="vocal-card vocal-pitch-card">
        <h3>Текущая нота</h3>
        <div className="vocal-current-note">
          {micOn && pitch.midi !== null ? noteName(pitch.midi) : "—"}
        </div>
        {micOn && pitch.frequency !== null && (
          <small>{Math.round(pitch.frequency)} Гц</small>
        )}
        <div className="vocal-cents">
          {deviation === null
            ? "Ожидаю голос"
            : (deviation > 0 ? "+" : "") + deviation + " центов"}
        </div>
        <p className="vocal-muted">
          Эталон:{" "}
          {metrics.target === null
            ? "пауза"
            : `${noteName(metrics.target)} · ${Math.round(midiToFrequency(metrics.target))} Гц`}
        </p>
        <div
          className="vocal-gauge"
          style={{
            background:
              "conic-gradient(var(--vocal-good) " +
              (accuracy ?? 0) * 3.6 +
              "deg, var(--line) 0deg)",
          }}
        >
          <div>
            <strong>{accuracy === null ? "—" : accuracy + "%"}</strong>
            <span>Точность</span>
          </div>
        </div>
        <div className="vocal-cent-scale" aria-label="Отклонение от эталона">
          <span>−100</span>
          <span>0</span>
          <span>+100</span>
          <i
            style={{
              left: 50 + Math.max(-100, Math.min(100, cents ?? 0)) / 2 + "%",
              opacity: cents === null ? 0.3 : 1,
            }}
          />
        </div>
      </section>
      <section className="vocal-card vocal-metrics">
        <div>
          <AudioLines size={18} />
          <span>Начало нот</span>
          <strong>
            {metrics.rhythm === null ? "—" : metrics.rhythm + "%"}
          </strong>
        </div>
        <div>
          <Activity size={18} />
          <span>Стабильность</span>
          <strong>
            {metrics.stability === null ? "—" : metrics.stability + "%"}
          </strong>
        </div>
        <div>
          <Activity size={18} />
          <span>Спето</span>
          <strong>
            {metrics.coverage === null ? "—" : metrics.coverage + "%"}
          </strong>
        </div>
      </section>
      <section className="vocal-card vocal-hint">
        <h3>
          <Lightbulb size={18} />
          Подсказка
        </h3>
        <p>{hint}</p>
      </section>
      <button className="btn" onClick={onReset}>
        <RotateCcw size={16} />
        Сбросить попытку
      </button>
      <details className="vocal-score-help">
        <summary>Как считается результат?</summary>
        <p>
          Точность — доля времени эталонных нот, когда голос попал в выбранный
          допуск. Молчание считается пропуском. «Начало нот» сравнивает
          вступления, «Спето» — наличие голоса, стабильность — разброс высоты
          внутри ноты. Это ориентиры для практики, а не профессиональная оценка
          вокала. Новая петля начинает новую попытку.
        </p>
      </details>
    </aside>
  );
}
