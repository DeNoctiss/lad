import { Mic, ArrowUpRight, Play, Plus } from "lucide-react";
import { songSources } from "../../lib/vocal/demoCatalog";
import { exerciseNames } from "../../lib/vocal/exercises";
export function VocalDemoShelf({
  onOsen,
  onExercise,
  onSong,
}: {
  onOsen: () => void;
  onExercise: (index: number) => void;
  onSong: (index: number) => void;
}) {
  return (
    <section
      className="vocal-demo-shelf"
      aria-label="Знакомство с вокальным тренажёром"
    >
      <div className="vocal-demo-header">
        <div>
          <span className="vocal-demo-tag">
            <Mic size={15} />
            ПРАКТИКА
          </span>
          <h2>Выберите мелодию для тренировки</h2>
          <p>
            Мелодия, микрофон и понятная обратная связь — в одном тренажёре.
          </p>
        </div>
      </div>
      <div className="vocal-demo-exercises">
        <button className="btn" onClick={onOsen}>
          Открыть шаблон «Осень»
        </button>
        {exerciseNames.map((name, i) => (
          <button className="btn" key={name} onClick={() => onExercise(i)}>
            <Play size={16} />
            {name}
            <span>{["Мелодия", "Ритм", "Устойчивость"][i]}</span>
          </button>
        ))}
      </div>
      <details>
        <summary>Три выбранные песни для разбора</summary>
        <p>
          Заготовки с отдельными партиями инструментов и ссылками на
          опубликованные табы. Точные ноты и аудио нужно импортировать; учебные
          мелодии выше — отдельные авторские примеры.
        </p>
        <div className="vocal-demo-songs">
          {songSources.map((s, i) => (
            <article key={s.id}>
              <small>{s.artist}</small>
              <h3>{s.title}</h3>
              <a href={s.url} target="_blank" rel="noreferrer">
                Открыть разбор
                <ArrowUpRight size={15} />
              </a>
              <button className="btn" onClick={() => onSong(i)}>
                <Plus size={16} />
                Открыть заготовку
              </button>
            </article>
          ))}
        </div>
      </details>
    </section>
  );
}
