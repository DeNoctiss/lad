import { NumberField } from "./NumberField";
import {
  Mic,
  Music2,
  AudioLines,
  Headphones,
  Settings2,
  Upload,
  X,
} from "lucide-react";
import type { VocalProject, VocalSettings } from "../../lib/vocal/model";
import { barLength } from "../../lib/vocal/model";
import type { VocalSession } from "./useVocalSession";
import type { TrackKind } from "../../lib/vocal/transport";
export function VocalControls({
  project,
  onSettings,
  onBpm,
  onTranscribe,
  onLength,
  session,
  onAudio,
  onRemoveAudio,
  onOffset,
}: {
  project: VocalProject;
  onSettings: (s: Partial<VocalSettings>) => void;
  onBpm: (bpm: number) => boolean;
  onTranscribe: () => void;
  onLength: (beats: number) => void;
  session: VocalSession;
  onAudio: (kind: TrackKind, file: File) => void;
  onRemoveAudio: (kind: TrackKind) => void;
  onOffset: (kind: TrackKind, offset: number) => void;
}) {
  const s = project.settings,
    locked = session.playing || !!session.busy;
  return (
    <aside className="vocal-controls" aria-label="Дорожки, звук и параметры">
      <section className="vocal-card">
        <h3>
          <Headphones size={17} />
          Дорожки и звук
        </h3>
        {(
          [
            ["referenceVolume", "Эталон", Music2],
            ["acapellaVolume", "Акапелла", Mic],
            ["backingVolume", "Минусовка", AudioLines],
          ] as const
        ).map(([key, label, Icon]) => {
          const kind =
            key === "acapellaVolume"
              ? "acapella"
              : key === "backingVolume"
                ? "backing"
                : null;
          const meta = kind && project.audio?.[kind],
            loaded = kind && session.audio[kind];
          return (
            <div className="vocal-mixer-track" key={key}>
              <div className="vocal-track-heading">
                <Icon size={19} />
                <strong>{label}</strong>
                <button
                  className="vocal-switch"
                  role="switch"
                  aria-checked={s[key] > 0 && (!kind || !!loaded)}
                  aria-label={"Звук: " + label}
                  disabled={!!kind && !loaded}
                  onClick={() => onSettings({ [key]: s[key] > 0 ? 0 : 0.6 })}
                >
                  <span />
                </button>
              </div>
              <div className="vocal-volume">
                <input
                  aria-label={"Громкость: " + label}
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={s[key]}
                  disabled={!!kind && !loaded}
                  onChange={(e) =>
                    onSettings({ [key]: Number(e.target.value) })
                  }
                />
                <output>{Math.round(s[key] * 100)}%</output>
              </div>
              {kind && (
                <>
                  <div className="vocal-file-row">
                    <label className="vocal-file-button">
                      <Upload size={14} />
                      {loaded ? "Заменить" : "Загрузить"}
                      <input
                        type="file"
                        aria-label={"Загрузить аудио: " + label}
                        accept="audio/*,.mp3,.wav"
                        disabled={locked}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = "";
                          if (f) onAudio(kind, f);
                        }}
                      />
                    </label>
                    {meta && (
                      <button
                        aria-label={"Убрать " + label.toLowerCase()}
                        className="btn-icon"
                        disabled={locked}
                        onClick={() => onRemoveAudio(kind)}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {kind === "acapella" && loaded && (
                    <button
                      className="btn vocal-reanalyze"
                      disabled={locked}
                      onClick={onTranscribe}
                    >
                      Распознать загруженную акапеллу
                    </button>
                  )}
                  {meta ? (
                    <small className="vocal-file-name" title={meta.name}>
                      {meta.name}
                      {!loaded && " · загрузите повторно"}
                    </small>
                  ) : (
                    <small className="vocal-muted">MP3 / WAV · до 6 мин</small>
                  )}
                </>
              )}
            </div>
          );
        })}
      </section>
      <section className="vocal-card">
        <h3>
          <Settings2 size={17} />
          Параметры
        </h3>
        <label className="vocal-field">
          Транспонирование
          <div className="vocal-stepper">
            <button
              aria-label="На полтона ниже"
              disabled={locked || s.transpose <= -12}
              onClick={() => onSettings({ transpose: s.transpose - 1 })}
            >
              −
            </button>
            <output>
              {s.transpose > 0 ? "+" : ""}
              {s.transpose}
            </output>
            <button
              aria-label="На полтона выше"
              disabled={locked || s.transpose >= 12}
              onClick={() => onSettings({ transpose: s.transpose + 1 })}
            >
              +
            </button>
          </div>
          <small>Полутонов · ноты и аудио</small>
        </label>
        <label className="vocal-field">
          Скорость
          <select
            aria-label="Скорость воспроизведения"
            disabled={locked}
            value={s.speed}
            onChange={(e) => onSettings({ speed: Number(e.target.value) })}
          >
            {[0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 1, 1.1, 1.2, 1.25, 1.5].map(
              (v) => (
                <option key={v} value={v}>
                  {v}×
                </option>
              ),
            )}
          </select>
          <small>Без изменения высоты</small>
        </label>
        <label className="vocal-field">
          Сетка, BPM
          <NumberField
            label="Сетка, BPM"
            value={project.bpm}
            min={20}
            max={300}
            disabled={locked}
            onCommit={onBpm}
          />
          <small>BPM меняет разметку. Скорость звучания — выше.</small>
        </label>
        <label className="vocal-check">
          <input
            type="checkbox"
            checked={s.metronome}
            onChange={(e) => onSettings({ metronome: e.target.checked })}
            disabled={locked}
          />
          Метроном
        </label>
        <label className="vocal-check">
          <input
            type="checkbox"
            checked={s.countIn}
            onChange={(e) => onSettings({ countIn: e.target.checked })}
            disabled={locked}
          />
          Отсчёт в один такт
        </label>
      </section>
      <section className="vocal-card">
        <h3>
          <Mic size={17} />
          Микрофон
          <span className={"vocal-status-dot " + (session.micOn ? "on" : "")} />
        </h3>
        <select
          aria-label="Устройство микрофона"
          value={session.deviceId}
          onChange={(e) => session.setDeviceId(e.target.value)}
        >
          <option value="">Системный микрофон</option>
          {session.devices
            .filter((d) => d.deviceId)
            .map((d, i) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || "Микрофон " + (i + 1)}
              </option>
            ))}
        </select>
        <label className="vocal-field vocal-mic-mode">
          Режим определения нот
          <select
            aria-label="Режим определения нот"
            value={s.analysisMode ?? "fast"}
            disabled={locked || session.micPending}
            onChange={(e) => {
              session.stopMic();
              onSettings({ analysisMode: e.target.value as "fast" | "stable" });
            }}
          >
            <option value="fast">Быстрый отклик</option>
            <option value="stable">Устойчивый · длиннее анализ</option>
          </select>
          <small>
            Если высота скачет, попробуйте устойчивый режим. После смены
            включите микрофон снова.
          </small>
        </label>
        <div
          className="vocal-level"
          role="meter"
          aria-label="Уровень микрофона"
          aria-valuenow={Math.round(Math.min(1, session.pitch.rms * 6) * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {Array.from({ length: 22 }, (_, i) => (
            <i
              key={i}
              className={
                session.micOn && i < session.pitch.rms * 132 ? "lit" : ""
              }
            />
          ))}
        </div>
        <button
          className={
            "btn vocal-mic-button " + (session.micOn ? "" : "btn-primary")
          }
          onClick={() => void session.toggleMic()}
        >
          <Mic size={16} />
          {session.micPending
            ? "Отменить подключение"
            : session.micOn
              ? "Выключить микрофон"
              : "Включить микрофон"}
        </button>
        <small className="vocal-muted">
          Звук обрабатывается на устройстве.
        </small>
      </section>
      <details className="vocal-card vocal-advanced">
        <summary>Дополнительно</summary>
        <div className="vocal-calibration">
          <p>Проверка высоты эталона</p>
          <button
            className="btn"
            disabled={locked}
            onClick={() => session.transport.preview(57)}
          >
            A3 · 220 Гц
          </button>
          <button
            className="btn"
            disabled={locked}
            onClick={() => session.transport.preview(69)}
          >
            A4 · 440 Гц
          </button>
        </div>
        <label className="vocal-field">
          Допуск, центов
          <select
            aria-label="Допуск точности"
            value={s.tolerance}
            onChange={(e) => onSettings({ tolerance: Number(e.target.value) })}
            disabled={locked}
          >
            <option value={25}>25 · точнее</option>
            <option value={50}>50 · обычный</option>
            <option value={75}>75 · начинающий</option>
          </select>
        </label>
        <label className="vocal-field">
          Компенсация задержки, мс
          <NumberField
            label="Компенсация задержки, мс"
            value={s.latencyMs}
            min={0}
            max={500}
            disabled={locked}
            onCommit={(latencyMs) => {
              onSettings({ latencyMs });
              return true;
            }}
          />
          <small>
            Сдвигает линию голоса назад по времени для оценки попадания в ноты.
            Задержку звука в наушниках не уменьшает. Подберите на короткой
            знакомой фразе.
          </small>
        </label>
        <div className="vocal-latency-info">
          <strong>Что влияет на задержку</strong>
          <p>
            Для меньшего отставания используйте проводные наушники и микрофон.
            Если звуковая карта поддерживает прямой мониторинг, слушайте себя
            через неё, а «Слышать свой голос» здесь оставьте на нуле.
          </p>
          {session.micTiming ? (
            <>
              <p>
                Окно анализа: {Math.round(session.micTiming.windowMs)} мс ·
                обновление: {session.micTiming.intervalMs} мс.
              </p>
              <p>
                Оценка браузера: вход{" "}
                {session.micTiming.inputMs === null
                  ? "не указан"
                  : Math.round(session.micTiming.inputMs) + " мс"}
                ; выход{" "}
                {session.micTiming.outputMs === null
                  ? "не указан"
                  : Math.round(session.micTiming.outputMs) + " мс"}
                .
              </p>
              <small>
                Это отдельные показатели, а не замер полной задержки «голос →
                наушники».
              </small>
            </>
          ) : (
            <small>
              Включите микрофон, чтобы увидеть параметры анализа и доступные
              оценки браузера.
            </small>
          )}
        </div>
        <label className="vocal-field">
          Слышать свой голос
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={s.monitorVolume}
            onChange={(e) =>
              onSettings({ monitorVolume: Number(e.target.value) })
            }
          />
          <small>
            Только в наушниках · {Math.round(s.monitorVolume * 100)}%
          </small>
        </label>
        <label className="vocal-field">
          Длина, тактов
          <input
            type="number"
            min={1}
            max={Math.floor(4096 / barLength(project))}
            value={+(project.length / barLength(project)).toFixed(2)}
            disabled={locked}
            onChange={(e) => {
              const beats = Number(e.target.value) * barLength(project);
              if (beats >= barLength(project) && beats <= 4096) onLength(beats);
            }}
          />
        </label>
        {(["acapella", "backing"] as const).map(
          (kind) =>
            project.audio?.[kind] && (
              <label className="vocal-field" key={kind}>
                {kind === "acapella" ? "Акапелла" : "Минусовка"}: сдвиг, долей
                <input
                  type="number"
                  min={-4096}
                  max={4096}
                  step={0.25}
                  disabled={locked}
                  value={project.audio[kind]!.offset}
                  onChange={(e) =>
                    onOffset(
                      kind,
                      Math.max(-4096, Math.min(4096, Number(e.target.value))),
                    )
                  }
                />
              </label>
            ),
        )}
      </details>
    </aside>
  );
}
