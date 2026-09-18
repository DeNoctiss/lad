import { useEffect, useId, useRef, useState } from "react";
import { Music2, Loader2, Pause, Play, Square } from "lucide-react";
import { durationTicks, measureTicks } from "../../lib/tablature";
import { TabPlayer } from "../../lib/playback";
import "../../styles/tabScore.css";
import { PianoNotation } from "./PianoNotation";
import { StringMeasure } from "./score/StringMeasure";
import { DrumMeasure } from "./score/DrumMeasure";
import {
  ROW_SIZE,
  LEFT,
  RIGHT,
  instruments,
  usedTicks,
  remainingLabel,
} from "./score/scoreShared";
import type { TabScoreViewProps } from "./score/scoreShared";
export type { TabScoreViewProps };

export function TabScoreView({
  score,
  selectedMeasure,
  selectedEvent,
  onSelect,
  onLaneClick,
  bpm = 92,
  tuning = "E A D G B e",
}: TabScoreViewProps) {
  const id = useId();
  const stripRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<TabPlayer | null>(null);
  const [playerState, setPlayerState] = useState<
    "stopped" | "loading" | "playing" | "paused"
  >("stopped");
  const [playhead, setPlayhead] = useState<{
    measure: number;
    event: number;
  } | null>(null);
  const measureCount = score.measures.length;
  const multiRow = measureCount > ROW_SIZE;

  useEffect(
    () => () => {
      playerRef.current?.stop();
    },
    [],
  );

  const hasNotes = score.measures.some((m) =>
    m.events.some((e) => e.notes.length > 0),
  );

  function togglePlay() {
    const player = (playerRef.current ??= new TabPlayer());
    if (playerState === "playing") {
      player.pause();
      return;
    }
    if (playerState === "paused") {
      player.resume();
      return;
    }
    if (playerState === "loading") return;
    void player.play(score, {
      bpm,
      tuningText: tuning,
      onEvent: (measure, event) => {
        setPlayhead(
          measure === null || event === null ? null : { measure, event },
        );
      },
      onStateChange: setPlayerState,
    });
  }

  function stopPlayback() {
    playerRef.current?.stop();
  }

  useEffect(() => {
    if (selectedMeasure === undefined) return;
    const strip = stripRef.current;
    const bar = strip?.querySelector<HTMLElement>(
      `[data-measure="${selectedMeasure}"]`,
    );
    if (strip && bar)
      bar.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [selectedMeasure]);

  useEffect(() => {
    if (!playhead) return;
    const strip = stripRef.current;
    const bar = strip?.querySelector<HTMLElement>(
      `[data-measure="${playhead.measure}"]`,
    );
    if (strip && bar)
      bar.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [playhead]);
  function jumpToMeasure(value: number) {
    const strip = stripRef.current;
    const bar = strip?.querySelector<HTMLElement>(
      `[data-measure="${value - 1}"]`,
    );
    if (strip && bar) bar.scrollIntoView({ block: "start", inline: "start" });
  }
  const total = measureTicks(score.meter);
  let shortest = total / score.meter.beats / 2;
  for (const measure of score.measures)
    for (const event of measure.events) {
      const ticks = durationTicks(event);
      if (ticks > 0) shortest = Math.min(shortest, ticks);
    }
  const width = Math.max(320, LEFT + RIGHT + Math.ceil(total / shortest) * 32);
  const props = {
    score,
    selectedMeasure,
    selectedEvent,
    onSelect,
    onLaneClick,
    width,
    playingMeasure: playhead?.measure,
    playingEvent: playhead?.event,
    tuning,
  };
  return (
    <section className="tab-score-view" aria-labelledby={`${id}-heading`}>
      <header className="tab-score-header">
        <div className="tab-score-heading">
          <span className="tab-score-icon">
            <Music2 size={20} aria-hidden="true" />
          </span>
          <div>
            <h3 id={`${id}-heading`}>
              {instruments[score.kind]} <span>Табулатура</span>
            </h3>
            <p>
              {score.meter.beats}/{score.meter.unit} · {measureCount} такт(ов) ·{" "}
              {onSelect || onLaneClick ? "Режим редактирования" : "Просмотр"}
            </p>
          </div>
        </div>
        <div className="tab-score-transport">
          {hasNotes && (
            <>
              <button
                type="button"
                className="btn-icon tab-score-play"
                aria-label={
                  playerState === "playing"
                    ? "Пауза"
                    : playerState === "paused"
                      ? "Продолжить"
                      : playerState === "loading"
                        ? "Загрузка звука"
                        : "Играть"
                }
                disabled={playerState === "loading"}
                onClick={togglePlay}
              >
                {playerState === "loading" ? (
                  <Loader2
                    size={16}
                    className="tab-score-spin"
                    aria-hidden="true"
                  />
                ) : playerState === "playing" ? (
                  <Pause size={16} aria-hidden="true" />
                ) : (
                  <Play size={16} aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                className="btn-icon tab-score-stop"
                aria-label="Стоп"
                disabled={playerState === "stopped"}
                onClick={stopPlayback}
              >
                <Square size={14} aria-hidden="true" />
              </button>
              <span className="tab-score-bpm">{bpm} BPM</span>
            </>
          )}
          {multiRow && (
            <nav className="tab-score-pagination" aria-label="Переход к такту">
              <label htmlFor={`${id}-jump`}>К такту</label>
              <input
                id={`${id}-jump`}
                type="number"
                min={1}
                max={measureCount}
                placeholder="1"
                onBlur={(event) => {
                  const bar = Number(event.currentTarget.value);
                  if (Number.isInteger(bar) && bar >= 1 && bar <= measureCount)
                    jumpToMeasure(bar);
                  else event.currentTarget.value = "";
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    event.currentTarget.blur();
                  }
                }}
              />
              <span className="tab-score-pagination-hint">
                по {ROW_SIZE} в ряд
              </span>
            </nav>
          )}
        </div>
      </header>
      {measureCount === 0 ? (
        <p className="tab-score-empty">
          Пока нет тактов. Создайте первый такт в редакторе.
        </p>
      ) : score.kind === "piano" ? (
        <PianoNotation {...props} start={0} end={measureCount} />
      ) : (
        <div
          className="tab-score-strip"
          ref={stripRef}
          tabIndex={0}
          role="region"
          aria-label="Такты по три в ряд, прокрутка и изменение высоты"
        >
          <div className="tab-score-measures">
            {score.measures.map((measure, measureIndex) => {
              const used = usedTicks(measure.events);
              return (
                <article
                  className={`tab-score-measure${selectedMeasure === measureIndex ? " tab-score-measure-selected" : ""}`}
                  key={measure.id}
                  aria-labelledby={`${id}-measure-${measureIndex}`}
                  data-measure={measureIndex}
                >
                  <div className="tab-score-measure-header">
                    <h4 id={`${id}-measure-${measureIndex}`}>
                      <span className="tab-score-measure-number">
                        {measureIndex + 1}
                      </span>
                      Такт{" "}
                      <span className="tab-score-meter">
                        {score.meter.beats}/{score.meter.unit}
                      </span>
                    </h4>
                    <span
                      className={`tab-score-capacity${used > total ? " tab-score-capacity-error" : ""}`}
                    >
                      {remainingLabel(used, total, score.meter.beats)}
                    </span>
                  </div>
                  <div className="tab-score-scroll">
                    {score.kind === "drums" ? (
                      <DrumMeasure {...props} measureIndex={measureIndex} />
                    ) : (
                      <StringMeasure {...props} measureIndex={measureIndex} />
                    )}
                  </div>
                  {used < total && (
                    <p className="tab-score-measure-hint">
                      {measure.events.length === 0
                        ? "Пустой такт — это ещё не пауза."
                        : "Светлая область не заполнена: добавьте ноты или явные паузы."}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}
      {score.kind !== "piano" && (
        <details className="tab-score-legend">
          <summary>Обозначения и управление</summary>
          {score.kind === "drums" ? (
            <p>
              <strong>Обозначения</strong> · точка — продление на половину · 3 —
              триоль · &gt; — акцент · (удар) — ghost · ⊗ — открытый хай-хэт ·
              дорожки: CC — крэш, SP — сплэш, RD — райд, HH — хай-хэт, HT/MT/LT
              — томы, SD — малый, BD — бочка
            </p>
          ) : (
            <p>
              <strong>Обозначения</strong> · точка — продление на половину · 3 —
              триоль · P.M. — приглушение · ~ — вибрато · b½ / b1 — бенд · &gt;
              — акцент · (нота) — ghost
            </p>
          )}
          {score.kind !== "drums" && (
            <p>
              H — хаммер-он · P — пулл-офф · / и \ — слайды · лига — продление ·
              ? — связь без подходящей следующей ноты. Струны: высокая сверху,
              низкая снизу.
            </p>
          )}
          {(onSelect || onLaneClick) && (
            <p>
              {onLaneClick
                ? score.kind === "drums"
                  ? "Нажмите на ячейку, чтобы изменить удар."
                  : "Нажмите на струну у существующего события, чтобы изменить ноту."
                : "Нажмите на событие, чтобы выбрать его."}{" "}
              Клавиатура: Tab, затем Enter или Пробел.
            </p>
          )}
        </details>
      )}
    </section>
  );
}
