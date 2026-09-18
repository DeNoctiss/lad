import { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  Guitar,
  Heart,
  Minus,
  Music2,
  Pencil,
  Plus,
  Printer,
  Trash2,
} from "lucide-react";
import type { Band, Chord, Song, TabPart } from "./model";
import { extractChords, parseLyricLine } from "./model";
import { ChordDiagram } from "./Chords";
import { PartEditor } from "./Editors";
import { TabScoreView } from "./TabScoreView";
import { TabGuide } from "./TabGuide";

export function SongView({
  song,
  band,
  chords,
  onUpdate,
  onEdit,
  navigate,
}: {
  song: Song;
  band: Band;
  chords: Chord[];
  onUpdate: (song: Song) => void;
  onEdit: () => void;
  navigate: (route: string) => void;
}) {
  const [tab, setTab] = useState<"lyrics" | "tabs">("lyrics");
  const [fontSize, setFontSize] = useState(18);
  const [partEditor, setPartEditor] = useState<TabPart | "new" | null>(null);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [positions, setPositions] = useState<Record<string, string>>({});
  const songChords = [
    ...new Set([...extractChords(song.lyrics), ...song.chords]),
  ];
  const savePart = (part: TabPart) => {
    onUpdate({
      ...song,
      parts: song.parts.some((item) => item.id === part.id)
        ? song.parts.map((item) => (item.id === part.id ? part : item))
        : [...song.parts, part],
      updatedAt: new Date().toISOString(),
    });
    setPartEditor(null);
  };
  return (
    <>
      <button className="back-link" onClick={() => navigate(`band/${band.id}`)}>
        <ArrowLeft size={16} />
        {band.name}
      </button>
      <div className="song-heading">
        <div>
          <span className="eyebrow">{band.genre} / ПЕСНЯ</span>
          <h1>{song.title}</h1>
          <div className="song-meta">
            <span>
              <Music2 size={15} />
              {song.key || "Без тональности"}
            </span>
            <span>
              <Clock3 size={15} />
              {song.bpm} BPM
            </span>
            <span>
              <Guitar size={15} />
              {song.capo ? `Каподастр: ${song.capo} лад` : "Без каподастра"}
            </span>
          </div>
        </div>
        <div className="heading-actions">
          <button
            className={`btn-icon favorite ${song.favorite ? "is-favorite" : ""}`}
            aria-label={song.favorite ? "Убрать из избранного" : "В избранное"}
            aria-pressed={song.favorite}
            onClick={() => onUpdate({ ...song, favorite: !song.favorite })}
          >
            <Heart size={20} fill={song.favorite ? "currentColor" : "none"} />
          </button>
          <button className="btn" onClick={onEdit}>
            <Pencil size={16} />
            Редактировать
          </button>
        </div>
      </div>
      <div className="song-layout">
        <section className="song-sheet">
          <div className="sheet-toolbar">
            <div
              className="sheet-tabs"
              role="tablist"
              aria-label="Содержимое песни"
            >
              <button
                role="tab"
                aria-selected={tab === "lyrics"}
                onClick={() => setTab("lyrics")}
                className={tab === "lyrics" ? "active" : ""}
              >
                Текст и аккорды
              </button>
              <button
                role="tab"
                aria-selected={tab === "tabs"}
                onClick={() => setTab("tabs")}
                className={tab === "tabs" ? "active" : ""}
              >
                Табулатуры <span>{song.parts.length}</span>
              </button>
            </div>
            <div className="sheet-tools">
              {tab === "lyrics" && (
                <>
                  <button
                    className="btn-icon"
                    disabled={fontSize <= 14}
                    aria-label="Уменьшить текст"
                    onClick={() => setFontSize((size) => size - 2)}
                  >
                    <Minus size={15} />
                  </button>
                  <span>Aa</span>
                  <button
                    className="btn-icon"
                    disabled={fontSize >= 28}
                    aria-label="Увеличить текст"
                    onClick={() => setFontSize((size) => size + 2)}
                  >
                    <Plus size={15} />
                  </button>
                </>
              )}
              <button
                className="btn-icon print-button"
                aria-label="Распечатать песню"
                onClick={() => window.print()}
              >
                <Printer size={16} />
              </button>
            </div>
          </div>
          {tab === "lyrics" ? (
            <div className="lyrics" style={{ fontSize }} role="tabpanel">
              {song.lyrics.trim() ? (
                song.lyrics.split("\n").map((line, index) =>
                  /^\{[^}]+\}$/.test(line.trim()) ? (
                    <h3 className="lyric-section" key={index}>
                      {line.trim().slice(1, -1)}
                    </h3>
                  ) : !line.trim() ? (
                    <div className="lyric-space" key={index} />
                  ) : (
                    <div className="lyric-line" key={index}>
                      {parseLyricLine(line).map((chunk, chunkIndex) => (
                        <span className="lyric-chunk" key={chunkIndex}>
                          <span className="lyric-chord">
                            {chunk.chord || "\u00a0"}
                          </span>
                          <span>{chunk.text || "\u00a0"}</span>
                        </span>
                      ))}
                    </div>
                  ),
                )
              ) : (
                <div className="empty-state">
                  <Music2 />
                  <h3>Здесь начинается песня</h3>
                  <p>Добавьте текст и расставьте аккорды.</p>
                  <button className="btn" onClick={onEdit}>
                    Добавить текст
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="parts-panel" role="tabpanel">
              <div className="parts-intro">
                <div>
                  <h3>Каждому инструменту — своя партия</h3>
                  <p>Ваши табы, рисунки и музыкальные заметки.</p>
                </div>
                <button
                  className="btn btn-primary btn-small"
                  onClick={() => setPartEditor("new")}
                >
                  <Plus size={16} />
                  Партия
                </button>
              </div>
              <TabGuide />
              {song.parts.length ? (
                song.parts.map((part) => (
                  <article className="part-card" key={part.id}>
                    <div className="part-header">
                      <button
                        className="part-title"
                        aria-expanded={!collapsed.includes(part.id)}
                        onClick={() =>
                          setCollapsed((items) =>
                            items.includes(part.id)
                              ? items.filter((id) => id !== part.id)
                              : [...items, part.id],
                          )
                        }
                      >
                        <Guitar size={18} />
                        <span>
                          <strong>{part.name}</strong>
                          <small>
                            {part.instrument} · {part.tuning}
                            <span className="part-saved-format">
                              {part.format === "visual"
                                ? "Визуальная"
                                : "Текст"}
                            </span>
                          </small>
                        </span>
                        {collapsed.includes(part.id) ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronUp size={16} />
                        )}
                      </button>
                      <div className="heading-actions">
                        <button
                          className="btn-icon"
                          aria-label={`Редактировать ${part.name}`}
                          onClick={() => setPartEditor(part)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="btn-icon"
                          aria-label={`Удалить ${part.name}`}
                          onClick={() => {
                            if (
                              window.confirm(`Удалить партию «${part.name}»?`)
                            )
                              onUpdate({
                                ...song,
                                parts: song.parts.filter(
                                  (item) => item.id !== part.id,
                                ),
                                updatedAt: new Date().toISOString(),
                              });
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    {!collapsed.includes(part.id) &&
                      (part.format === "visual" && part.score ? (
                        <TabScoreView
                          score={part.score}
                          bpm={song.bpm}
                          tuning={part.tuning}
                        />
                      ) : (
                        <pre className="tab-content">
                          {part.content || "Партия пока пуста"}
                        </pre>
                      ))}
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  <Guitar size={36} />
                  <h3>Пока звучит только текст</h3>
                  <p>
                    Добавьте партию ритм-гитары, соло, баса или барабанов.
                    <br />
                    Табулатуру можно заполнить вручную.
                  </p>
                  <button className="btn" onClick={() => setPartEditor("new")}>
                    <Plus size={16} />
                    Добавить первую партию
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="sheet-footer">
            <span>ЛАД / ЛИЧНЫЙ ПЕСЕННИК</span>
            <span>
              {band.name} — {song.title}
            </span>
          </div>
        </section>
        <aside className="song-aside">
          <div className="chord-sidebar">
            <div className="chord-sidebar-heading">
              <h3>Аккорды песни</h3>
              <span className="count-badge">{songChords.length}</span>
            </div>
            <p>Строй: E A D G B e</p>
            <div className="song-chord-grid">
              {songChords.map((name) => {
                const variants = chords.filter((item) => item.name === name);
                const savedId = song.defaultVoicings?.[name];
                const chord =
                  variants.find((item) => item.id === savedId) ??
                  variants.find((item) => item.id === positions[name]) ??
                  variants[0];
                const variantIndex = chord
                  ? variants.findIndex((v) => v.id === chord.id)
                  : -1;
                function setVoicing(id: string) {
                  setPositions((current) => ({ ...current, [name]: id }));
                  const voicings = { ...song.defaultVoicings, [name]: id };
                  onUpdate({ ...song, defaultVoicings: voicings });
                }
                return chord ? (
                  <div className="song-chord" key={name}>
                    <strong>{name}</strong>
                    <ChordDiagram chord={chord} compact />
                    {variants.length > 1 && (
                      <div className="song-chord-switcher">
                        <button
                          type="button"
                          className="btn-icon song-chord-arrow"
                          aria-label={`Предыдущая аппликатура ${name}`}
                          disabled={variantIndex <= 0}
                          onClick={() =>
                            setVoicing(variants[variantIndex - 1].id)
                          }
                        >
                          <ChevronLeft size={16} aria-hidden="true" />
                        </button>
                        <span className="song-chord-position">
                          {variantIndex + 1}/{variants.length}
                        </span>
                        <button
                          type="button"
                          className="btn-icon song-chord-arrow"
                          aria-label={`Следующая аппликатура ${name}`}
                          disabled={variantIndex >= variants.length - 1}
                          onClick={() =>
                            setVoicing(variants[variantIndex + 1].id)
                          }
                        >
                          <ChevronRight size={16} aria-hidden="true" />
                        </button>
                        <select
                          aria-label={`Аппликатура ${name}`}
                          value={chord.id}
                          onChange={(event) => setVoicing(event.target.value)}
                        >
                          {variants.map((variant, index) => (
                            <option key={variant.id} value={variant.id}>
                              {index + 1}: с {variant.baseFret} лада
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="missing-chord" key={name}>
                    <strong>{name}</strong>
                    <span>Нет аппликатуры</span>
                    <button onClick={() => navigate("chords")}>
                      Добавить <Plus size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
            {!songChords.length && (
              <p className="muted">Добавьте аккорды в редакторе песни.</p>
            )}
            <button
              className="chord-library-link"
              onClick={() => navigate("chords")}
            >
              Библиотека аккордов
              <ArrowUpRight size={16} />
            </button>
          </div>
          <div className="practice-note">
            <span className="eyebrow">МАЛЕНЬКОЕ НАПОМИНАНИЕ</span>
            <p>
              Не обязательно играть идеально.
              <br />
              Главное — играть.
            </p>
            <div className="note-line" />
          </div>
        </aside>
      </div>
      {partEditor && (
        <PartEditor
          part={partEditor === "new" ? undefined : partEditor}
          onSave={savePart}
          onClose={() => setPartEditor(null)}
        />
      )}
    </>
  );
}
