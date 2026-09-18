import { ArrowUpRight, Music2, Plus } from "lucide-react";

export function Hero({ onNewSong }: { onNewSong: () => void }) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <span className="hero-label">
          <span />
          ВАШ ЛИЧНЫЙ ПЕСЕННИК
        </span>
        <h1>
          Хорошая музыка
          <br />
          начинается с <em>пары аккордов.</em>
        </h1>
        <p>
          Любимые группы, тексты и табы.
          <br />
          Всё в одном месте — осталось взять гитару.
        </p>
        <button className="hero-link" onClick={onNewSong}>
          Записать новую песню
          <ArrowUpRight size={17} />
        </button>
      </div>
      <div className="hero-illustration" aria-hidden="true">
        <span className="orbit orbit-one" />
        <span className="orbit orbit-two" />
        <span className="orbit orbit-three" />
        <div className="record">
          <div className="record-label">
            <span>СТОРОНА А</span>
            <Music2 size={34} strokeWidth={1} />
            <span>МУЗЫКА ВНУТРИ</span>
          </div>
        </div>
        <div className="hero-note">
          настроено на вдохновение <span>↗</span>
        </div>
        <span className="spark spark-one">
          <Plus size={35} strokeWidth={1} />
        </span>
        <span className="spark spark-two">+</span>
        <span className="spark spark-three">
          <Music2 size={26} strokeWidth={1.2} />
        </span>
      </div>
      <span className="hero-number">ВЫПУСК 001 / ВАША КОЛЛЕКЦИЯ</span>
    </section>
  );
}
