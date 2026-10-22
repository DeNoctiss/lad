import { midiToFrequency } from "../../lib/vocal/pitch";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  type: "draw" | "move" | "resize";
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
  const ppb = 48 * zoom,
    width = Math.max(720, project.length * ppb),
    height = (HIGH - LOW + 1) * ROW;
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
    if (locked || e.button !== 0) return;
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
      const resize =
        p.x >=
        (target.start + target.duration) * ppb -
          Math.min(12, (target.duration * ppb) / 3);
      setDrag({
        type: resize ? "resize" : "move",
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
      setDrag({ type: "draw", x: p.x, y: p.y, note: n, current: n });
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
    if (!g) return;
    const p = point(e),
      delta = Math.round((p.x - g.x) / ppb / grid) * grid;
    const current =
      g.type === "move"
        ? {
            ...g.note,
            start: clamp(
              g.note.start + delta,
              0,
              project.length - g.note.duration,
            ),
            midi: clamp(g.note.midi - Math.round((p.y - g.y) / ROW), 21, 108),
          }
        : {
            ...g.note,
            duration: clamp(
              g.type === "draw"
                ? Math.ceil((p.x / ppb - g.note.start) / grid) * grid
                : g.note.duration + delta,
              grid,
              project.length - g.note.start,
            ),
          };
    setDrag({ ...g, current });
  };
  const finish = () => {
    const g = gestureRef.current;
    if (g) onNotes(placeNote(project.notes, g.current));
    setDrag(null);
  };
  const updateNote = (n: VocalNote) =>
    onNotes(
      placeNote(project.notes, {
        ...n,
        midi: clamp(Math.round(n.midi), 21, 108),
        start: clamp(n.start, 0, project.length - grid),
        duration: clamp(
          n.duration,
          grid,
          project.length - clamp(n.start, 0, project.length - grid),
        ),
      }),
    );
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
          Сетка{" "}
          <select
            aria-label="Шаг сетки"
            value={grid}
            onChange={(e) => setGrid(Number(e.target.value))}
          >
            <option value={1}>1/4</option>
            <option value={0.5}>1/8</option>
            <option value={0.25}>1/16</option>
            <option value={1 / 3}>Триоль</option>
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
              { length: Math.ceil(project.length / barLength(project)) },
              (_, i) => (
                <button
                  key={i}
                  style={{
                    left: 64 + i * barLength(project) * ppb,
                    width: barLength(project) * ppb,
                  }}
                  onClick={() => onSeek(i * barLength(project))}
                  aria-label={"Перейти к такту " + (i + 1)}
                >
                  {i + 1}
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
            onKeyDown={(e) => {
              if (locked) return;
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
            {Array.from({ length: Math.ceil(project.length) + 1 }, (_, i) => (
              <line
                key={i}
                x1={i * ppb}
                x2={i * ppb}
                y1={0}
                y2={height}
                className={
                  i % barLength(project) === 0
                    ? "vocal-grid-bar"
                    : "vocal-grid-beat"
                }
              />
            ))}
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
            {visibleNotes.map((n) => (
              <g
                key={n.id}
                data-vocal-note={n.id}
                className={"vocal-note " + (n.id === selected ? "active" : "")}
              >
                <title>
                  {noteName(n.midi + project.settings.transpose)} · доля{" "}
                  {n.start + 1} · длительность {n.duration}
                </title>
                <rect
                  x={n.start * ppb + 1}
                  y={(HIGH - n.midi - project.settings.transpose) * ROW + 2}
                  width={Math.max(4, n.duration * ppb - 2)}
                  height={ROW - 4}
                  rx={4}
                />
                {n.duration * ppb > 40 && (
                  <text
                    x={n.start * ppb + 7}
                    y={(HIGH - n.midi - project.settings.transpose) * ROW + 17}
                  >
                    {noteName(n.midi + project.settings.transpose)}
                  </text>
                )}
              </g>
            ))}
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
                max={project.length - grid}
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
                min={grid}
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
              : "Карандаш — добавить · край ноты — длительность · стрелки — сдвиг · Delete — удалить"}
          </span>
        )}
      </div>
    </section>
  );
}
