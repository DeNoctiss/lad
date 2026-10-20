import { Plus } from "lucide-react";

export function Hero({ onNewSong }: { onNewSong: () => void }) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <span className="hero-label">
          <span />
          ВАШ ЛИЧНЫЙ ПЕСЕННИК
        </span>
        <h1>
          Ваша музыка. <em>В одном месте.</em>
        </h1>
        <p>
          Сохраняйте песни, записывайте партии и возвращайтесь к любимым
          мелодиям.
        </p>
      </div>
      <button className="btn btn-primary" onClick={onNewSong}>
        <Plus size={18} />
        Записать новую песню
      </button>
    </section>
  );
}
