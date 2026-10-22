import { plural } from "../../lib/plural";
import { Modal } from "../ui/Modal";
import { TranscriptionDialog } from "./TranscriptionDialog";
import type { PitchRange } from "../../lib/vocal/yin";
import {
  regridProject,
  replaceMelody,
  shiftNotes,
  audioEndBeat,
} from "../../lib/vocal/projectEditing";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AudioLines,
  FileMusic,
  Guitar,
  PlusCircle,
  Download,
  Upload,
  Play,
  Pause,
  SkipBack,
  Repeat2,
  Mic,
  Check,
} from "lucide-react";
import type { Song } from "../../lib/model";
import {
  createVocalProject,
  validateVocalProject,
  monophonic,
  overlaps,
  barLength,
  MAX_BEATS,
  MIN_MIDI,
  MAX_MIDI,
  noteName,
} from "../../lib/vocal/model";
import type {
  VocalNote,
  VocalProject,
  VocalSettings,
} from "../../lib/vocal/model";
import { readMidi } from "../../lib/vocal/midi";
import type { MidiImport } from "../../lib/vocal/midi";
import { notesFromPart } from "../../lib/vocal/fromTab";
import { scoreTake } from "../../lib/vocal/pitch";
import type { TrackKind } from "../../lib/vocal/transport";
import { exerciseNames, vocalExercise } from "../../lib/vocal/exercises";
import { useVocalSession } from "./useVocalSession";
import { VocalControls } from "./VocalControls";
import { PianoRoll } from "./PianoRoll";
import { TrainingFeedback } from "./TrainingFeedback";
import { SourceDialog } from "./SourceDialog";
import "../../styles/vocal.css";
const formatTime = (seconds: number) =>
  Math.floor(seconds / 60) +
  ":" +
  String(Math.floor(seconds % 60)).padStart(2, "0");
export function VocalTrainer({
  song,
  active,
  onChange,
}: {
  song: Song;
  active: boolean;
  onChange: (project: VocalProject) => void;
}) {
  const [project, setProject] = useState(() =>
    song.vocal ? structuredClone(song.vocal) : createVocalProject(song.bpm),
  );
  const projectRef = useRef(project);
  projectRef.current = project;
  const importId = useRef(0);
  useEffect(
    () => () => {
      importId.current++;
    },
    [],
  );
  const [readingFile, setReadingFile] = useState("");
  const [acapellaFile, setAcapellaFile] = useState<File | null>(null);
  const [confirmation, setConfirmation] = useState<{ run: () => void } | null>(
    null,
  );
  const [mode, setMode] = useState<"editor" | "training">("editor");
  const [source, setSource] = useState<"midi" | "tab" | null>(null),
    [midi, setMidi] = useState<MidiImport | undefined>();
  const [notice, setNotice] = useState<{ id: number; text: string } | null>(
    null,
  );
  const noticeId = useRef(0);
  const announce = (text: string) =>
    setNotice({ id: ++noticeId.current, text });
  const [midiName, setMidiName] = useState("");
  const [revision, setRevision] = useState(0);
  const [focusNote, setFocusNote] = useState<{
    id: string;
    request: number;
  } | null>(null);
  const focusRequest = useRef(0);
  const [shiftIssue, setShiftIssue] = useState<{
    semitones: number;
    notes: VocalNote[];
  } | null>(null);
  const [history, setHistory] = useState<{
    undo: VocalNote[][];
    redo: VocalNote[][];
  }>({ undo: [], redo: [] });
  const session = useVocalSession(project, mode === "training", active);
  const midiInput = useRef<HTMLInputElement>(null),
    audioInput = useRef<HTMLInputElement>(null),
    jsonInput = useRef<HTMLInputElement>(null);
  const usableParts = song.parts.filter(
    (p) => p.score && p.score.kind !== "drums",
  );
  const commit = (p: VocalProject) => {
    projectRef.current = p;
    setProject(p);
    onChange(p);
  };
  const changeNotes = (notes: VocalNote[]) => {
    setShiftIssue(null);
    if (notes.length > 10000) {
      session.setError("В партии может быть не больше 10 000 нот");
      return;
    }
    setHistory((h) => ({
      undo: [...h.undo.slice(-39), project.notes],
      redo: [],
    }));
    commit({ ...project, notes });
    session.resetTake();
  };
  const undo = () => {
    const notes = history.undo.at(-1);
    if (!notes) return;
    setHistory((h) => ({
      undo: h.undo.slice(0, -1),
      redo: [...h.redo, project.notes],
    }));
    commit({ ...project, notes });
    session.resetTake();
  };
  const redo = () => {
    const notes = history.redo.at(-1);
    if (!notes) return;
    setHistory((h) => ({
      undo: [...h.undo, project.notes],
      redo: h.redo.slice(0, -1),
    }));
    commit({ ...project, notes });
    session.resetTake();
  };
  const confirmReplace = (run: () => void) => {
    if (!projectRef.current.notes.length) run();
    else setConfirmation({ run });
  };
  const replace = (next: VocalProject) => {
    setNotice(null);
    if (!next.audio?.acapella) session.removeAudio("acapella");
    if (!next.audio?.backing) session.removeAudio("backing");
    session.pause();
    session.seek(0, next.length);
    if (next.notes !== projectRef.current.notes) {
      setRevision((v) => v + 1);
      setFocusNote(null);
    }
    setShiftIssue(null);
    setHistory({ undo: [], redo: [] });
    commit(next);
    setSource(null);
  };
  async function importMidi(file: File) {
    session.cancel();
    const id = ++importId.current;
    setReadingFile("Читаю MIDI…");
    setNotice(null);
    session.setError("");
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("MIDI больше 5 МБ");
      const result = readMidi(await file.arrayBuffer());
      if (id !== importId.current) return;
      setMidi(result);
      setMidiName(file.name);
      setSource("midi");
      session.setError("");
    } catch (e) {
      if (id === importId.current)
        session.setError(e instanceof Error ? e.message : "Ошибка MIDI");
    } finally {
      if (id === importId.current) setReadingFile("");
    }
  }
  async function importJson(file: File) {
    session.cancel();
    const id = ++importId.current;
    setReadingFile("Читаю проект…");
    setNotice(null);
    session.setError("");
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("JSON больше 5 МБ");
      const next = validateVocalProject(JSON.parse(await file.text()));
      if (id !== importId.current) return;
      if (overlaps(next.notes))
        throw new Error("Вокальная линия должна быть одноголосной");
      next.notes.sort((a, b) => a.start - b.start);
      confirmReplace(() => {
        session.removeAudio("acapella");
        session.removeAudio("backing");
        session.clearDetected();
        replace(next);
        session.setError("");
        announce(
          `Загружен проект «${file.name}» · ${plural(next.notes.length, ["нота", "ноты", "нот"])}.`,
        );
      });
    } catch (e) {
      if (id === importId.current)
        session.setError(e instanceof Error ? e.message : "Ошибка JSON");
    } finally {
      if (id === importId.current) setReadingFile("");
    }
  }
  const chooseSource = (index: number, voice: "high" | "low") => {
    try {
      let next: VocalProject;
      if (source === "midi" && midi) {
        const notes = monophonic(midi.tracks[index].notes, voice);
        const end = Math.max(0, ...notes.map((n) => n.start + n.duration));
        const length = Math.min(MAX_BEATS, Math.max(4, Math.ceil(end / 4) * 4));
        next = replaceMelody(projectRef.current, {
          notes,
          bpm: midi.bpm,
          meter: midi.meter,
          length,
          source: (
            "MIDI · " +
            midiName +
            " · " +
            midi.tracks[index].name
          ).slice(0, 500),
        });
      } else {
        const part = usableParts[index];
        const converted = notesFromPart(part, song.bpm, song.capo, voice);
        next = replaceMelody(projectRef.current, {
          ...converted,
          length: Math.max(4, converted.length),
          bpm: song.bpm,
          source: "Из табулатуры · " + part.name,
        });
      }
      session.clearDetected();
      replace(next);
      session.setError("");
      announce(
        source === "midi"
          ? `Загружен MIDI «${midiName}» · ${plural(next.notes.length, ["нота", "ноты", "нот"])} · ${next.bpm} BPM. Скорость 1×, транспонирование 0.`
          : `Создана вокальная партия из табулатуры · ${plural(next.notes.length, ["нота", "ноты", "нот"])}.`,
      );
    } catch (e) {
      session.setError(
        e instanceof Error ? e.message : "Не удалось создать партию",
      );
    }
  };
  async function loadAudio(
    kind: TrackKind,
    file: File,
    transcribe = false,
    range: PitchRange = "auto",
  ) {
    ++importId.current;
    setReadingFile("");
    setNotice(null);
    setShiftIssue(null);
    const result = await session.loadAudio(kind, file, transcribe, range);
    if (!result) return;
    const latest = projectRef.current,
      previous = latest.audio?.[kind];
    const meta = {
      ...result.audio.meta,
      offset: !transcribe && previous?.name === file.name ? previous.offset : 0,
    };
    const length = Math.min(
      MAX_BEATS,
      Math.max(
        latest.length,
        Math.ceil(
          audioEndBeat(meta.duration, meta.originalBpm, meta.offset) / 4,
        ) * 4,
      ),
    );
    let next = { ...latest, length, audio: { ...latest.audio, [kind]: meta } };
    if (result.transcription) {
      if (!result.transcription.notes.length)
        session.setError(
          "Устойчивых нот не найдено. Используйте запись одного голоса. Аудио загружено, текущие ноты сохранены.",
        );
      else
        next = {
          ...next,
          notes: result.transcription.notes,
          source: "Распознано из акапеллы · " + file.name,
          settings: {
            ...next.settings,
            speed: 1,
            transpose: 0,
            loop: false,
            loopStart: 0,
            loopEnd: length,
          },
        };
    } else if (kind === "acapella") session.clearDetected();
    replace(next);
    if (result.transcription?.notes.length)
      announce(
        `Акапелла «${file.name}» распознана · ${plural(next.notes.length, ["нота", "ноты", "нот"])}. Проверьте результат в редакторе.`,
      );
    else if (!result.transcription)
      announce(
        `${kind === "acapella" ? "Акапелла" : "Минусовка"} «${file.name}» загружена · ${formatTime(meta.duration)}. Ноты сохранены.`,
      );
  }
  const updateSettings = (s: Partial<VocalSettings>) =>
    commit({ ...project, settings: { ...project.settings, ...s } });
  const metrics = useMemo(
    () =>
      scoreTake(
        session.trace,
        project.notes,
        project.settings.transpose,
        project.settings.tolerance,
      ),
    [
      session.trace,
      project.notes,
      project.settings.transpose,
      project.settings.tolerance,
    ],
  );
  const duration =
    (project.length * 60) / (project.bpm * project.settings.speed);
  const locked = !!session.busy || !!readingFile || session.playing;
  const exportProject = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(project, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "lad-vocal-" + song.id + ".json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="vocal-studio">
      <header className="vocal-studio-heading">
        <div>
          <h2>Вокальный тренажёр</h2>
          <p>Мелодия, которую видно.</p>
        </div>
        <div
          className="vocal-mode-switch"
          role="group"
          aria-label="Режим вокального тренажёра"
        >
          <button
            className={mode === "editor" ? "active" : ""}
            aria-pressed={mode === "editor"}
            onClick={() => {
              session.pause();
              session.stopMic();
              setMode("editor");
            }}
          >
            Редактор
          </button>
          <button
            className={mode === "training" ? "active" : ""}
            aria-pressed={mode === "training"}
            onClick={() => {
              session.pause();
              setMode("training");
            }}
          >
            Тренировка
          </button>
        </div>
        <div className="vocal-project-actions">
          <span className="vocal-save-state">
            <Check size={15} />
            Автосохранение
          </span>
          <button className="btn" onClick={exportProject}>
            <Download size={16} />
            JSON
          </button>
          <button
            className="btn-icon"
            title="Импорт вокального проекта JSON"
            aria-label="Импорт вокального проекта JSON"
            disabled={locked}
            onClick={() => jsonInput.current?.click()}
          >
            <Upload size={18} />
          </button>
        </div>
      </header>
      <details className="vocal-help">
        <summary>Как пользоваться вокальным тренажёром</summary>
        <ol>
          <li>
            <strong>Подготовьте мелодию.</strong> Импортируйте MIDI и выберите
            дорожку, распознайте акапеллу с одним голосом, возьмите партию из
            табулатуры или нарисуйте ноты.
          </li>
          <li>
            <strong>Проверьте ноты.</strong> В редакторе можно передвигать,
            удлинять и удалять их. Масштаб — кнопками +/− или Ctrl / ⌘ + колесо;
            «Вся мелодия» покажет весь фрагмент. Распознавание акапеллы требует
            проверки.
          </li>
          <li>
            <strong>Добавьте фон.</strong> Загрузите акапеллу или минусовку в
            «Дорожки и звук». Такая загрузка сохраняет ноты. Сдвиг аудио в
            «Дополнительно» помогает совместить запись с MIDI.
          </li>
          <li>
            <strong>Подберите темп и высоту.</strong> «Скорость» замедляет
            звучание, BPM меняет только сетку. «На октаву ниже/выше» меняет
            ноты; «Транспонирование» меняет и ноты, и аудио при воспроизведении.
          </li>
          <li>
            <strong>Спойте фрагмент.</strong> Перейдите в «Тренировку», наденьте
            наушники, включите микрофон и воспроизведение. Сравнивайте зелёную
            линию голоса с нотами; для повторения используйте петлю.
          </li>
          <li>
            <strong>Настройте отклик.</strong> Начните с быстрого режима
            микрофона. Если нота нестабильна, попробуйте устойчивый. Компенсация
            в «Дополнительно» выравнивает график; задержку звука она не
            уменьшает.
          </li>
        </ol>
        <p>
          Ноты и настройки сохраняются в этом браузере. JSON и экспорт
          библиотеки — резервная копия. Аудио после перезагрузки нужно выбрать
          снова. Микрофон и импорт обрабатываются на устройстве.
        </p>
      </details>
      <div className="vocal-sources" aria-label="Создать вокальную партию">
        {[
          {
            icon: FileMusic,
            title: "MIDI",
            text: "Импорт нот из MIDI-файла",
            action: () => midiInput.current?.click(),
          },
          {
            icon: AudioLines,
            title: "Акапелла",
            text: "Распознать ноты из записи",
            action: () => audioInput.current?.click(),
          },
          {
            icon: Guitar,
            title: "Из табулатуры",
            text: "Взять партию этой песни",
            action: () => setSource("tab"),
          },
          {
            icon: PlusCircle,
            title: "Создать вручную",
            text: "Чистая сетка для мелодии",
            action: () => {
              confirmReplace(() => {
                session.clearDetected();
                replace(createVocalProject(song.bpm));
              });
            },
          },
        ].map(({ icon: Icon, title, text, action }) => (
          <button
            className="vocal-source-card"
            key={title}
            disabled={locked}
            onClick={action}
          >
            <span>
              <Icon size={27} />
            </span>
            <div>
              <strong>{title}</strong>
              <small>{text}</small>
            </div>
          </button>
        ))}
      </div>
      <input
        hidden
        type="file"
        aria-label="Импорт MIDI-файла"
        ref={midiInput}
        accept=".mid,.midi"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void importMidi(f);
        }}
      />
      <input
        hidden
        type="file"
        aria-label="Распознать акапеллу"
        ref={audioInput}
        accept="audio/*,.mp3,.wav"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) setAcapellaFile(f);
        }}
      />
      <input
        hidden
        type="file"
        aria-label="Импорт JSON-файла вокала"
        ref={jsonInput}
        accept=".json,application/json"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void importJson(f);
        }}
      />
      <div
        className="vocal-announcements"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {notice && (
          <div className="vocal-success" key={notice.id}>
            <Check size={20} aria-hidden="true" />
            <span>{notice.text}</span>
            <button
              className="btn-icon"
              aria-label="Закрыть уведомление об успешной загрузке"
              onClick={() => setNotice(null)}
            >
              ×
            </button>
          </div>
        )}
      </div>
      {session.error && (
        <div className="vocal-error" role="alert">
          {session.error}
          <button
            onClick={() => session.setError("")}
            aria-label="Закрыть сообщение"
          >
            ×
          </button>
        </div>
      )}
      {(session.busy || readingFile) && (
        <div className="vocal-progress" role="status">
          <span className="vocal-spinner" />
          {session.busy || readingFile}
          <button
            className="btn"
            onClick={() => {
              importId.current++;
              setReadingFile("");
              session.cancel();
            }}
          >
            Отменить
          </button>
        </div>
      )}
      {!project.notes.length && (
        <div className="vocal-empty-state">
          <div>
            <strong>Начните с нескольких нот</strong>
            <p>
              Выберите источник выше или попробуйте готовое учебное упражнение.
            </p>
          </div>
          <div>
            {exerciseNames.map((name, i) => (
              <button
                key={name}
                className="btn"
                disabled={locked}
                onClick={() => replace(vocalExercise(i))}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}
      <div
        className={"vocal-workspace " + (mode === "training" ? "training" : "")}
      >
        <VocalControls
          project={project}
          session={session}
          onSettings={updateSettings}
          onBpm={(bpm) => {
            try {
              const next = regridProject(project, bpm);
              session.seek((session.position * bpm) / project.bpm, next.length);
              session.clearDetected();
              setHistory({ undo: [], redo: [] });
              commit(next);
              return true;
            } catch (e) {
              session.setError(
                e instanceof Error ? e.message : "Не удалось изменить сетку",
              );
              return false;
            }
          }}
          onTranscribe={() => {
            const file = session.audio.acapella?.file;
            if (file) setAcapellaFile(file);
          }}
          onLength={(length) => {
            const min = Math.max(
              0,
              ...project.notes.map((n) => n.start + n.duration),
            );
            if (length < min) {
              session.setError(
                "Сначала удалите или перенесите ноты за новой границей проекта.",
              );
              return;
            }
            setHistory({ undo: [], redo: [] });
            commit({
              ...project,
              length,
              settings: {
                ...project.settings,
                loopStart: Math.min(project.settings.loopStart, length - 0.25),
                loopEnd: Math.min(project.settings.loopEnd, length),
              },
            });
          }}
          onAudio={(kind, file) => void loadAudio(kind, file)}
          onRemoveAudio={(kind) => {
            session.removeAudio(kind);
            commit({
              ...project,
              audio: { ...project.audio, [kind]: undefined },
            });
          }}
          onOffset={(kind, offset) => {
            const meta = project.audio?.[kind];
            if (meta)
              commit({
                ...project,
                audio: { ...project.audio, [kind]: { ...meta, offset } },
              });
          }}
        />
        <div className="vocal-main">
          <PianoRoll
            project={project}
            revision={revision}
            focusNote={focusNote}
            onNotes={changeNotes}
            onUndo={undo}
            onRedo={redo}
            canUndo={!!history.undo.length}
            canRedo={!!history.redo.length}
            position={session.position}
            playing={locked}
            training={mode === "training"}
            trace={session.trace}
            detected={session.detected}
            audio={
              session.audio.acapella
                ? {
                    ...session.audio.acapella,
                    meta:
                      project.audio?.acapella ?? session.audio.acapella.meta,
                  }
                : undefined
            }
            onSeek={session.seek}
            onOctave={(semitones) => {
              const blocked = project.notes.filter(
                (n) =>
                  n.midi + semitones < MIN_MIDI ||
                  n.midi + semitones > MAX_MIDI,
              );
              if (blocked.length) {
                setShiftIssue({ semitones, notes: blocked });
                return;
              }
              try {
                changeNotes(shiftNotes(project.notes, semitones));
                session.clearDetected();
                session.setError("");
              } catch (e) {
                session.setError(
                  e instanceof Error ? e.message : "Не удалось сдвинуть ноты",
                );
              }
            }}
            onPreview={(n) => {
              if (!locked) session.transport.preview(n);
            }}
          />
          <div className="vocal-transport">
            <button
              className="btn-icon"
              aria-label="В начало вокальной партии"
              disabled={!!session.busy}
              onClick={() =>
                session.seek(
                  project.settings.loop ? project.settings.loopStart : 0,
                )
              }
            >
              <SkipBack size={21} />
            </button>
            <button
              className="vocal-play-button"
              aria-label={
                session.playing
                  ? "Приостановить вокальную партию"
                  : "Воспроизвести вокальную партию"
              }
              disabled={!project.notes.length || !!session.busy}
              onClick={() =>
                session.playing ? session.pause() : void session.start()
              }
            >
              {session.playing ? (
                <Pause size={24} fill="currentColor" />
              ) : (
                <Play size={24} fill="currentColor" />
              )}
            </button>
            <span className="vocal-time">
              {session.counting
                ? "Отсчёт…"
                : formatTime(
                    (session.position * 60) /
                      (project.bpm * project.settings.speed),
                  )}{" "}
              / {formatTime(duration)}
            </span>
            <input
              aria-label="Позиция воспроизведения"
              type="range"
              min={0}
              max={project.length}
              step={0.05}
              disabled={!!session.busy}
              value={session.position}
              onChange={(e) => session.seek(Number(e.target.value))}
            />
            <button
              className={
                "btn-icon " + (project.settings.loop ? "selected" : "")
              }
              aria-pressed={project.settings.loop}
              aria-label="Повторять фрагмент"
              disabled={locked}
              onClick={() => updateSettings({ loop: !project.settings.loop })}
            >
              <Repeat2 size={21} />
            </button>
            {mode === "training" && (
              <button
                className="btn vocal-mobile-mic"
                onClick={() => void session.toggleMic()}
              >
                <Mic size={17} />
                {session.micOn ? "Микрофон включён" : "Включить микрофон"}
              </button>
            )}
          </div>
          {project.settings.loop && (
            <div className="vocal-loop-controls">
              <Repeat2 size={17} />
              <strong>Петля, доли</strong>
              <label>
                От{" "}
                <input
                  aria-label="Начало петли"
                  type="number"
                  min={0}
                  max={project.settings.loopEnd - 0.25}
                  step={0.25}
                  disabled={locked}
                  value={project.settings.loopStart}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (n >= 0 && n <= project.settings.loopEnd - 0.25)
                      updateSettings({ loopStart: n });
                  }}
                />
              </label>
              <label>
                До{" "}
                <input
                  aria-label="Конец петли"
                  type="number"
                  min={project.settings.loopStart + 0.25}
                  max={project.length}
                  step={0.25}
                  disabled={locked}
                  value={project.settings.loopEnd}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (n > project.settings.loopStart && n <= project.length)
                      updateSettings({
                        loopEnd: Math.max(n, project.settings.loopStart + 0.25),
                      });
                  }}
                />
              </label>
              <span className="vocal-muted">
                {(
                  (project.settings.loopEnd - project.settings.loopStart) /
                  barLength(project)
                ).toLocaleString("ru", { maximumFractionDigits: 2 })}{" "}
                такт.
              </span>
            </div>
          )}
          <div className="vocal-source-caption">
            <span>{project.source}</span>
            <span>
              {project.meter.beats}/{project.meter.unit} · {project.bpm} BPM
            </span>
          </div>
        </div>
        {mode === "training" && (
          <TrainingFeedback
            metrics={metrics}
            pitch={session.pitch}
            micOn={session.micOn}
            onReset={session.resetTake}
          />
        )}
      </div>
      {shiftIssue && (
        <Modal
          title="Некоторые ноты мешают сдвигу"
          eyebrow="ДИАПАЗОН A0–C8"
          onClose={() => setShiftIssue(null)}
        >
          <p>
            Нот за пределами диапазона: {shiftIssue.notes.length}. Первая —{" "}
            <strong>{noteName(shiftIssue.notes[0].midi)}</strong> на отметке{" "}
            <strong>
              {formatTime((shiftIssue.notes[0].start * 60) / project.bpm)}
            </strong>
            : после сдвига получится{" "}
            {noteName(shiftIssue.notes[0].midi + shiftIssue.semitones)}. Текущие
            ноты не изменены.
          </p>
          <p>
            Проверьте её в редакторе. Если это ошибка исходного MIDI или
            распознавания, можно явно удалить мешающие ноты и сдвинуть
            оставшиеся. Действие можно отменить.
          </p>
          <div className="modal-actions vocal-shift-actions">
            <button className="btn" onClick={() => setShiftIssue(null)}>
              Отмена
            </button>
            <button
              className="btn"
              onClick={() => {
                const n = shiftIssue.notes[0];
                setFocusNote({ id: n.id, request: ++focusRequest.current });
                session.seek(n.start);
                setShiftIssue(null);
              }}
            >
              Показать ноту {noteName(shiftIssue.notes[0].midi)}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                const excluded = new Set(shiftIssue.notes.map((n) => n.id));
                const notes = shiftNotes(
                  project.notes.filter((n) => !excluded.has(n.id)),
                  shiftIssue.semitones,
                );
                changeNotes(notes);
                session.clearDetected();
                session.setError("");
                announce(
                  `Удалено мешающих нот: ${excluded.size}. Остальные сдвинуты на ${shiftIssue.semitones} полутонов. Доступна отмена.`,
                );
              }}
            >
              Удалить {plural(shiftIssue.notes.length, ["ноту", "ноты", "нот"])}{" "}
              и сдвинуть
            </button>
          </div>
        </Modal>
      )}
      {confirmation && (
        <Modal
          title="Заменить вокальную партию?"
          eyebrow="ВОКАЛЬНЫЙ ТРЕНАЖЁР"
          onClose={() => setConfirmation(null)}
        >
          <p>
            Текущие ноты будут заменены. Перед заменой их можно сохранить
            кнопкой JSON.
          </p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setConfirmation(null)}>
              Отмена
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                const run = confirmation.run;
                setConfirmation(null);
                run();
              }}
            >
              Заменить ноты
            </button>
          </div>
        </Modal>
      )}
      {acapellaFile && (
        <TranscriptionDialog
          file={acapellaFile}
          replacing={!!project.notes.length}
          onClose={() => setAcapellaFile(null)}
          onStart={(range) => {
            const file = acapellaFile;
            setAcapellaFile(null);
            void loadAudio("acapella", file, true, range);
          }}
        />
      )}
      {source && (
        <SourceDialog
          midi={source === "midi" ? midi : undefined}
          parts={source === "tab" ? usableParts : undefined}
          onClose={() => setSource(null)}
          onChoose={chooseSource}
          replacing={!!project.notes.length}
        />
      )}
    </div>
  );
}
