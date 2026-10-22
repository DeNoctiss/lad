import { lazy, Suspense } from "react";
import { VocalDemoShelf } from "../components/vocal/VocalDemoShelf";
import type { Song } from "../lib/model";
import type { VocalProject } from "../lib/vocal/model";
import "../styles/vocal.css";
const VocalTrainer = lazy(() =>
  import("../components/vocal/VocalTrainer").then((m) => ({
    default: m.VocalTrainer,
  })),
);
export function VocalPage({
  project,
  onChange,
  onOpenTemplate,
  onExercise,
  onSong,
}: {
  project?: VocalProject;
  onChange: (project: VocalProject) => void;
  onOpenTemplate: () => void;
  onExercise: (index: number) => void;
  onSong: (index: number) => void;
}) {
  const song: Song = {
    id: "vocal-workspace",
    bandId: "",
    title: "Свободная тренировка",
    bpm: project?.bpm ?? 120,
    key: "—",
    capo: 0,
    favorite: false,
    lyrics: "",
    chords: [],
    parts: [],
    updatedAt: "",
    vocal: project,
  };
  return (
    <section className="vocal-standalone-page">
      <p className="vocal-standalone-intro">
        Свободная тренировка с вашим MIDI или акапеллой. Ноты сохраняются
        автоматически, создавать песню в библиотеке не нужно.
      </p>
      <details className="vocal-examples">
        <summary>Учебные примеры и шаблоны песен</summary>
        <VocalDemoShelf
          onOsen={onOpenTemplate}
          onExercise={onExercise}
          onSong={onSong}
        />
      </details>
      <Suspense fallback={<p>Загружаю вокальный тренажёр…</p>}>
        <VocalTrainer song={song} active onChange={onChange} />
      </Suspense>
    </section>
  );
}
