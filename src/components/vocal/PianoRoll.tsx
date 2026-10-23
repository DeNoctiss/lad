import {
  ROLL_GRIDS,
  dragVocalNote,
  noteGeometry,
  sameVocalNote,
} from "../../lib/vocal/rollEditing";
import type { NoteDragAction } from "../../lib/vocal/rollEditing";
import { midiToFrequency } from "../../lib/vocal/pitch";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  MousePointer2,
  Pencil,
  Eraser,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Trash2,
} from "lucide-react";
import {
  clamp,
  noteId,
  noteName,
  placeNote,
  barLength,
} from "../../lib/vocal/model";
import type {
  VocalProject,
  VocalNote,
  PitchPoint,
} from "../../lib/vocal/model";
import type { LoadedAudio } from "./useVocalSession";
const ROW = 24,
  TOP = 32,
  HIGH = 120,
  LOW = 9;
type Tool = "select" | "draw" | "erase";
type Gesture = {
  type: "draw" | NoteDragAction;
  pointerId: number;
  x: number;
  y: number;
  note: VocalNote;
  current: VocalNote;
};
const black = (n: number) => [1, 3, 6, 8, 10].includes(n % 12);
export function PianoRoll({
  project,
  revision,
  focusNote,
  onNotes,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  position,
  playing,
  training,
  trace,
  detected,
  audio,
  onSeek,
  onPreview,
  onOctave,
}: {
  project: VocalProject;
  revision: number;
  focusNote: { id: string; request: number } | null;
  onNotes: (notes: VocalNote[]) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  position: number;
  playing: boolean;
  training: boolean;
  trace: PitchPoint[];
  detected: PitchPoint[];
  audio?: LoadedAudio;
  onSeek: (beat: number) => void;
  onPreview: (midi: number) => void;
  onOctave: (semitones: number) => void;
}) {
  const [tool, setTool] = useState<Tool>("select"),
    [selectedGrid, setGrid] = useState(0.25),
    [zoom, setZoom] = useState(1);
  const [selected, setSelected] = useState<string | null>(null),
    [gesture, setGesture] = useState<Gesture | null>(null),
    [scrollX, setScrollX] = useState(0);
  const scroll = useRef<HTMLDivElement>(null),
    gestureRef = useRef<Gesture | null>(null);
  const grid = Math.min(selectedGrid, project.length);
  const gridOption = ROLL_GRIDS.find((g) => g.step === selectedGrid)!;
  const patternId = useId().replace(/:/g, "");
  const [hoverAction, setHoverAction] = useState<NoteDragAction | null>(null);
  const ppb = 48 * zoom,
    width = Math.max(720, project.length * ppb),
    height = (HIGH - LOW + 1) * ROW;
  const showSubdivisions = grid * ppb >= 5;
  const measureBeats = barLength(project);
  const rulerStride = Math.max(
    1,
    2 ** Math.ceil(Math.log2(40 / (measureBeats * ppb))),
  );
  const barStride = Math.max(
    1,
    2 ** Math.ceil(Math.log2(8 / (measureBeats * ppb))),
  );
  const zoomAnchor = useRef<{ beat: number; x: number } | null>(null);
  const changeZoom = (value: number, pointerX?: number) => {
    const el = scroll.current,
      x = pointerX ?? (el ? el.clientWidth / 2 : 0);
    zoomAnchor.current = { beat: ((el?.scrollLeft ?? 0) + x - 64) / ppb, x };
    setZoom(clamp(value, 0.01, 8));
  };
  useLayoutEffect(() => {
    const anchor = zoomAnchor.current;
    if (anchor && scroll.current)
      scroll.current.scrollLeft = Math.max(
        0,
        anchor.beat * ppb + 64 - anchor.x,
      );
    zoomAnchor.current = null;
  }, [ppb]);
  useEffect(() => {
    const el = scroll.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      changeZoom(
        zoom * Math.exp(-e.deltaY * 0.003),
        e.clientX - el.getBoundingClientRect().left,
      );
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [zoom, ppb]);
  const fit = () => {
    const start = project.notes.length
      ? Math.min(...project.notes.map((n) => n.start))
      : 0;
    const end = project.notes.length
      ? Math.max(...project.notes.map((n) => n.start + n.duration))
      : project.length;
    zoomAnchor.current = { beat: Math.max(0, start - 0.5), x: 64 };
    setZoom(
      clamp(
        ((scroll.current?.clientWidth ?? 800) - 90) /
          (Math.max(1, end - start + 1) * 48),
        0.01,
        8,
      ),
    );
    if (scroll.current)
      scroll.current.scrollLeft = Math.max(0, start - 0.5) * ppb;
  };
  const previousNotes = useRef(project.notes);
  useEffect(() => {
    const old = previousNotes.current;
    if (old.length && old.length === project.notes.length) {
      const delta = project.notes[0].midi - old[0].midi;
      if (
        Math.abs(delta) === 12 &&
        project.notes.every(
          (n, i) => n.id === old[i].id && n.midi - old[i].midi === delta,
        ) &&
        scroll.current
      )
        scroll.current.scrollTop -= delta * ROW;
    }
    previousNotes.current = project.notes;
  }, [project.notes]);
  const locked = training || playing;
  const setDrag = (value: Gesture | null) => {
    gestureRef.current = value;
    setGesture(value);
  };
  const note = project.notes.find((n) => n.id === selected);
  const center = () => {
    if (scroll.current) {
      const ns = project.notes.map((n) => n.midi).sort((a, b) => a - b),
        middle =
          (ns[Math.floor(ns.length / 2)] ?? 60) + project.settings.transpose;
      scroll.current.scrollTop = Math.max(0, (HIGH - middle) * ROW - 150);
    }
  };
  const source = project.source;
  useEffect(() => {
    center();
  }, [source, project.settings.transpose, revision]); // keep vertical position while editing
  useEffect(() => {
    setSelected(null);
    setDrag(null);
    if (scroll.current) scroll.current.scrollLeft = 0;
  }, [revision]);
  useEffect(() => {
    if (!focusNote || !scroll.current) return;
    const n = project.notes.find((n) => n.id === focusNote.id);
    if (!n) return;
    setSelected(n.id);
    setDrag(null);
    setTool("select");
    const el = scroll.current;
    el.scrollLeft = Math.max(0, n.start * ppb - el.clientWidth / 2 + 64);
    el.scrollTop = Math.max(
      0,
      (HIGH - n.midi - project.settings.transpose) * ROW -
        el.clientHeight / 2 +
        TOP,
    );
    el.scrollIntoView({ block: "nearest" });
    el.querySelector<SVGSVGElement>(".vocal-roll-svg")?.focus({
      preventScroll: true,
    });
  }, [focusNote]);
  useEffect(() => {
    const el = scroll.current;
    if (!el || !playing) return;
    const x = position * ppb;
    if (x > el.scrollLeft + el.clientWidth - 110 || x < el.scrollLeft)
      el.scrollLeft = Math.max(0, x - 110);
  }, [position, playing, ppb]);
  const point = (e: ReactPointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const down = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (locked || e.button !== 0 || gestureRef.current) return;
    e.preventDefault();
    e.currentTarget.focus({ preventScroll: true });
    const p = point(e),
      id = (e.target as Element)
        .closest("[data-vocal-note]")
        ?.getAttribute("data-vocal-note");
    const target = project.notes.find((n) => n.id === id);
    if (tool === "erase") {
      if (target) onNotes(project.notes.filter((n) => n.id !== id));
      return;
    }
    if (target) {
      setSelected(target.id);
      onPreview(target.midi + project.settings.transpose);
      const action = (e.target as Element)
        .closest("[data-note-action]")
        ?.getAttribute("data-note-action") as NoteDragAction | undefined;
      setDrag({
        type: action ?? "move",
        pointerId: e.pointerId,
        x: p.x,
        y: p.y,
        note: target,
        current: target,
      });
    } else if (tool === "draw") {
      const start = clamp(
        Math.floor(p.x / ppb / grid) * grid,
        0,
        project.length - grid,
      );
      const n = {
        id: noteId(),
        midi: clamp(
          HIGH - Math.floor(p.y / ROW) - project.settings.transpose,
          21,
          108,
        ),
        start,
        duration: grid,
      };
      setSelected(n.id);
      setDrag({
        type: "draw",
        pointerId: e.pointerId,
        x: p.x,
        y: p.y,
        note: n,
        current: n,
      });
      onPreview(n.midi + project.settings.transpose);
    } else {
      setSelected(null);
      onSeek(clamp(p.x / ppb, 0, project.length));
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: ReactPointerEvent<SVGSVGElement>) => {
    const g = gestureRef.current;
    if (!g) {
      const action = (e.target as Element)
        .closest("[data-note-action]")
        ?.getAttribute("data-note-action") as NoteDragAction | undefined;
      setHoverAction(!locked && tool !== "erase" ? (action ?? null) : null);
      return;
    }
    if (e.pointerId !== g.pointerId) return;
    const p = point(e),
      dx = p.x - g.x,
      dy = p.y - g.y;
    if (
      g.type !== "draw" &&
      Math.abs(dx) < 3 &&
      (g.type !== "move" || Math.abs(dy) < 3)
    ) {
      setDrag({ ...g, current: g.note });
      return;
    }
    const current =
      g.type === "draw"
        ? {
            ...g.note,
            duration: clamp(
              Math.ceil((p.x / ppb - g.note.start) / grid) * grid,
              grid,
              project.length - g.note.start,
            ),
          }
        : dragVocalNote(
            g.note,
            g.type,
            Math.abs(dx) < 3 ? 0 : dx / ppb,
            -Math.round(dy / ROW),
            grid,
            project.length,
          );
    setDrag({ ...g, current });
  };
  const finish = (e: ReactPointerEvent<SVGSVGElement>) => {
    const g = gestureRef.current;
    if (!g || e.pointerId !== g.pointerId) return;
    if (g.type === "draw" || !sameVocalNote(g.note, g.current))
      onNotes(placeNote(project.notes, g.current));
    setDrag(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const updateNote = (n: VocalNote) => {
    const start = clamp(
      n.start,
      0,
      project.length - (n.duration === note?.duration ? n.duration : 1 / 64),
    );
    const next = {
      ...n,
      midi: clamp(Math.round(n.midi), 21, 108),
      start,
      duration: clamp(n.duration, 1 / 64, project.length - start),
    };
    if (!note || !sameVocalNote(note, next))
      onNotes(placeNote(project.notes, next));
  };
  const path = (points: PitchPoint[], transpose: number) => {
    let d = "",
      previous = -1;
    for (const p of points) {
      if (p.midi === null) {
        previous = -1;
        continue;
      }
      const x = p.beat * ppb,
        y = (HIGH - p.midi - transpose + 0.5) * ROW;
      d +=
        (previous < 0 || p.beat - previous > 0.4 ? "M" : "L") +
        x.toFixed(1) +
        "," +
        y.toFixed(1);
      previous = p.beat;
    }
    return d;
  };
  const visibleNotes = gesture
    ? placeNote(project.notes, gesture.current)
    : project.notes;
  const wfDurationBeats = audio
    ? (audio.meta.duration * audio.meta.originalBpm) / 60
    : 0;
  return (
    <section className="vocal-roll-panel" aria-label="Редактор вокальных нот">
      <div className="vocal-roll-toolbar">
        <div className="vocal-roll-title">
          <span className="vocal-dot" />
          <strong>Piano Roll</strong>
          <span className="vocal-muted">{project.notes.length} нот</span>
        </div>
        <div
          className="vocal-tool-group"
          role="group"
          aria-label="Инструменты редактора"
        >
          {(
            [
              ["select", MousePointer2, "Выбрать и переместить"],
              ["draw", Pencil, "Рисовать ноты"],
              ["erase", Eraser, "Удалять ноты"],
            ] as const
          ).map(([value, Icon, label]) => (
            <button
              key={value}
              className={tool === value ? "selected" : ""}
              title={label}
              aria-label={label}
              aria-pressed={tool === value}
              disabled={locked}
              onClick={() => setTool(value)}
            >
              <Icon size={18} />
            </button>
          ))}
          <button
            aria-label="Отменить изменение нот"
            title="Отменить · Ctrl+Z"
            disabled={!canUndo || locked}
            onClick={onUndo}
          >
            <Undo2 size={18} />
          </button>
          <button
            aria-label="Повторить изменение нот"
            title="Повторить · Ctrl+Shift+Z"
            disabled={!canRedo || locked}
            onClick={onRedo}
          >
            <Redo2 size={18} />
          </button>
        </div>
        <label className="vocal-inline-label">
          Шаг сетки{" "}
          <select
            aria-label="Шаг сетки"
            value={selectedGrid}
            onChange={(e) => setGrid(Number(e.target.value))}
          >
            {ROLL_GRIDS.map((g) => (
              <option key={g.step} value={g.step}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
        <div className="vocal-tool-group">
          <button
            aria-label="Уменьшить масштаб"
            disabled={zoom <= 0.01}
            onClick={() => changeZoom(zoom / 1.4)}
          >
            <ZoomOut size={18} />
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button
            aria-label="Увеличить масштаб"
            disabled={zoom >= 8}
            onClick={() => changeZoom(zoom * 1.4)}
          >
            <ZoomIn size={18} />
          </button>
          <button
            className="vocal-fit-button"
            onClick={fit}
            title="Показать все ноты"
          >
            Вся мелодия
          </button>
        </div>
      </div>
      {!training && (
        <div className="vocal-octave-tools">
          <button
            className="btn"
            disabled={locked || !project.notes.length}
            onClick={() => onOctave(-12)}
          >
            На октаву ниже
          </button>
          <button
            className="btn"
            disabled={locked || !project.notes.length}
            onClick={() => onOctave(12)}
          >
            На октаву выше
          </button>
          <span className="vocal-muted">
            Сдвиг нот без изменения аудио · масштаб: Ctrl / ⌘ + колесо
          </span>
        </div>
      )}
      <div className="vocal-grid-help">
        <span>
          <strong>{gridOption.label}</strong> · {gridOption.description}.
          Привязка при рисовании и перетаскивании; уже записанные ноты не
          меняются.
        </span>
        {!showSubdivisions && (
          <span className="vocal-grid-zoom-hint">
            Мелкие деления скрыты на этом масштабе. Увеличьте масштаб, чтобы
            увидеть выбранный шаг; привязка сохраняется.
          </span>
        )}
        {!training && (
          <span className="vocal-drag-hint">
            {locked
              ? "Для редактирования остановите воспроизведение."
              : tool === "erase"
                ? "Ластик: нажмите на ноту, чтобы удалить её."
                : (gesture?.type ?? hoverAction) === "resize-start"
                  ? "Левый край: меняется начало и длина. Конец ноты остаётся на месте."
                  : (gesture?.type ?? hoverAction) === "resize-end"
                    ? "Правый край: меняется конец и длина. Начало ноты остаётся на месте."
                    : (gesture?.type ?? hoverAction) === "move"
                      ? "Середина: перемещение по времени и высоте с сохранением длины."
                      : "Оба края — длина ноты. Середина — перемещение. Esc — отменить перетаскивание."}
          </span>
        )}
      </div>
      <div className="vocal-waveform" aria-label="Форма волны акапеллы">
        <span className="vocal-wave-label">Аудио</span>
        {audio ? (
          <svg
            width={width}
            height="58"
            style={{ marginLeft: 64 - scrollX }}
            aria-hidden="true"
          >
            <path
              className="vocal-wave-path"
              d={audio.peaks
                .map((v, i) => {
                  const x =
                    (audio.meta.offset +
                      (i / audio.peaks.length) * wfDurationBeats) *
                    ppb;
                  return (
                    "M" +
                    x.toFixed(1) +
                    "," +
                    (29 - v * 27).toFixed(1) +
                    "v" +
                    (v * 54).toFixed(1)
                  );
                })
                .join(" ")}
            />
          </svg>
        ) : (
          <span className="vocal-wave-empty">
            Загрузите акапеллу, чтобы увидеть форму волны
          </span>
        )}
      </div>
      <div
        className="vocal-roll-scroll"
        ref={scroll}
        onScroll={(e) => setScrollX(e.currentTarget.scrollLeft)}
      >
        <div
          className="vocal-roll-content"
          style={{ width: width + 64, height: height + TOP }}
        >
          <div className="vocal-ruler" style={{ width: width + 64 }}>
            <span className="vocal-ruler-corner">Такт</span>
            {Array.from(
              {
                length: Math.ceil(project.length / measureBeats / rulerStride),
              },
              (_, i) => (
                <button
                  key={i}
                  style={{
                    left: 64 + i * rulerStride * measureBeats * ppb,
                    width: rulerStride * measureBeats * ppb,
                  }}
                  onClick={() => onSeek(i * rulerStride * measureBeats)}
                  aria-label={"Перейти к такту " + (i * rulerStride + 1)}
                >
                  {i * rulerStride + 1}
                </button>
              ),
            )}
          </div>
          <div className="vocal-keyboard" style={{ height }}>
            {Array.from({ length: HIGH - LOW + 1 }, (_, i) => HIGH - i).map(
              (n) => (
                <button
                  key={n}
                  className={black(n) ? "black" : "white"}
                  style={{ height: ROW }}
                  aria-label={"Прослушать " + noteName(n)}
                  onClick={() => onPreview(n)}
                >
                  {noteName(n)}
                </button>
              ),
            )}
          </div>
          <svg
            className="vocal-roll-svg"
            data-tool={tool}
            data-locked={locked}
            data-drag={gesture?.type ?? ""}
            style={{ left: 64, top: TOP }}
            width={width}
            height={height}
            role="application"
            aria-label="Поле нот. Выберите карандаш и нарисуйте ноту. Стрелки перемещают выбранную ноту, Delete удаляет."
            tabIndex={0}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={finish}
            onPointerCancel={() => setDrag(null)}
            onLostPointerCapture={() => setDrag(null)}
            onPointerLeave={() => {
              if (!gestureRef.current) setHoverAction(null);
            }}
            onKeyDown={(e) => {
              if (locked) return;
              if (gestureRef.current) {
                if (e.key === "Escape") {
                  e.preventDefault();
                  const id = gestureRef.current.pointerId;
                  setDrag(null);
                  if (e.currentTarget.hasPointerCapture(id))
                    e.currentTarget.releasePointerCapture(id);
                }
                return;
              }
              if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
                e.preventDefault();
                e.shiftKey ? onRedo() : onUndo();
                return;
              }
              if (
                !note ||
                ![
                  "Delete",
                  "Backspace",
                  "ArrowLeft",
                  "ArrowRight",
                  "ArrowUp",
                  "ArrowDown",
                ].includes(e.key)
              )
                return;
              e.preventDefault();
              if (e.key === "Delete" || e.key === "Backspace") {
                onNotes(project.notes.filter((n) => n.id !== selected));
                setSelected(null);
              } else if (e.key === "ArrowUp" || e.key === "ArrowDown")
                updateNote({
                  ...note,
                  midi: note.midi + (e.key === "ArrowUp" ? 1 : -1),
                });
              else {
                const delta = (e.key === "ArrowRight" ? 1 : -1) * grid;
                updateNote(
                  e.shiftKey
                    ? { ...note, duration: note.duration + delta }
                    : { ...note, start: note.start + delta },
                );
              }
            }}
          >
            {Array.from({ length: HIGH - LOW + 1 }, (_, i) => (
              <rect
                key={i}
                x={0}
                y={i * ROW}
                width={width}
                height={ROW}
                className={black(HIGH - i) ? "vocal-row black" : "vocal-row"}
              />
            ))}
            <defs>
              <pattern
                id={patternId + "-step"}
                width={grid * ppb}
                height={height}
                patternUnits="userSpaceOnUse"
              >
                <path d={`M0 0V${height}`} className="vocal-grid-subdivision" />
              </pattern>
              <pattern
                id={patternId + "-beat"}
                width={ppb}
                height={height}
                patternUnits="userSpaceOnUse"
              >
                <path d={`M0 0V${height}`} className="vocal-grid-beat" />
              </pattern>
              <pattern
                id={patternId + "-bar"}
                width={measureBeats * barStride * ppb}
                height={height}
                patternUnits="userSpaceOnUse"
              >
                <path d={`M0 0V${height}`} className="vocal-grid-bar" />
              </pattern>
            </defs>
            {showSubdivisions && (
              <rect
                width={width}
                height={height}
                fill={`url(#${patternId}-step)`}
                className="vocal-grid-layer"
                data-grid-step={grid}
              />
            )}
            {ppb >= 10 && (
              <rect
                width={width}
                height={height}
                fill={`url(#${patternId}-beat)`}
                className="vocal-grid-layer"
              />
            )}
            <rect
              width={width}
              height={height}
              fill={`url(#${patternId}-bar)`}
              className="vocal-grid-layer"
            />
            {project.settings.loop && (
              <rect
                x={project.settings.loopStart * ppb}
                y={0}
                width={
                  (project.settings.loopEnd - project.settings.loopStart) * ppb
                }
                height={height}
                className="vocal-loop-shade"
              />
            )}
            {visibleNotes.map((n) => {
              const shape = noteGeometry(n, ppb),
                y = (HIGH - n.midi - project.settings.transpose) * ROW + 2;
              const region = (x: number) =>
                `M${x} ${y}h${shape.handle}v${ROW - 4}h${-shape.handle}Z`;
              return (
                <g
                  key={n.id}
                  data-vocal-note={n.id}
                  className={
                    "vocal-note " + (n.id === selected ? "active" : "")
                  }
                >
                  <rect
                    className="vocal-note-body"
                    data-note-action="move"
                    x={shape.x}
                    y={y}
                    width={shape.width}
                    height={ROW - 4}
                    rx={4}
                  >
                    <title>
                      {noteName(n.midi + project.settings.transpose)} ·{" "}
                      {locked
                        ? `доля ${n.start + 1}, длительность ${n.duration}`
                        : "середина: переместить по времени и высоте"}
                    </title>
                  </rect>
                  {shape.width > 48 && (
                    <text x={shape.x + shape.handle + 3} y={y + 15}>
                      {noteName(n.midi + project.settings.transpose)}
                    </text>
                  )}
                  <path
                    d={region(shape.x)}
                    className="vocal-note-edge"
                    data-note-action="resize-start"
                  >
                    <title>Левый край: изменить начало и длину ноты</title>
                  </path>
                  <path
                    d={region(shape.x + shape.width - shape.handle)}
                    className="vocal-note-edge"
                    data-note-action="resize-end"
                  >
                    <title>Правый край: изменить конец и длину ноты</title>
                  </path>
                  {shape.width >= 14 && (
                    <path
                      className="vocal-note-grips"
                      d={`M${shape.x + shape.handle / 2} ${y + 5}v${ROW - 14}M${shape.x + shape.width - shape.handle / 2} ${y + 5}v${ROW - 14}`}
                    />
                  )}
                </g>
              );
            })}
            <path
              d={path(detected, project.settings.transpose)}
              className="vocal-detected-trace"
            />
            <path d={path(trace, 0)} className="vocal-live-trace" />
            <line
              x1={position * ppb}
              x2={position * ppb}
              y1={0}
              y2={height}
              className="vocal-playhead"
            />
          </svg>
        </div>
      </div>
      <div className="vocal-overview" aria-hidden="true">
        <svg
          viewBox={"0 0 " + project.length + " 60"}
          preserveAspectRatio="none"
        >
          {project.notes.map((n) => (
            <rect
              key={n.id}
              x={n.start}
              y={clamp(48 - (n.midi - 48) * 1.1, 2, 54)}
              width={n.duration}
              height={2}
            />
          ))}
          <line
            x1={position}
            x2={position}
            y1={0}
            y2={60}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <div className="vocal-note-inspector">
        {note && !training ? (
          <>
            <strong>
              {noteName(note.midi + project.settings.transpose)} ·{" "}
              {Math.round(
                midiToFrequency(note.midi + project.settings.transpose),
              )}{" "}
              Гц
            </strong>
            <label>
              Начало, доли{" "}
              <input
                type="number"
                aria-label="Начало выбранной ноты"
                min={0}
                max={project.length - note.duration}
                step={grid}
                value={+note.start.toFixed(3)}
                disabled={locked}
                onChange={(e) =>
                  updateNote({ ...note, start: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Длительность{" "}
              <input
                type="number"
                aria-label="Длительность выбранной ноты"
                min={1 / 64}
                max={project.length - note.start}
                step={grid}
                value={+note.duration.toFixed(3)}
                disabled={locked}
                onChange={(e) =>
                  updateNote({ ...note, duration: Number(e.target.value) })
                }
              />
            </label>
            <button
              className="btn-icon"
              aria-label="Удалить выбранную ноту"
              disabled={locked}
              onClick={() =>
                onNotes(project.notes.filter((n) => n.id !== selected))
              }
            >
              <Trash2 size={17} />
            </button>
          </>
        ) : (
          <span className="vocal-muted">
            {training
              ? "Голубые блоки — эталон. Зелёная линия — ваш голос. Для занятия наденьте наушники."
              : "Карандаш — добавить · оба края — длительность · середина — перенос · стрелки — сдвиг · Delete — удалить"}
          </span>
        )}
      </div>
    </section>
  );
}
