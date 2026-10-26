import { Plus } from "lucide-react";

export function Hero({ onNewSong }: { onNewSong: () => void }) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <span className="hero-label">
          <span />
          ВАШ ЛИЧНЫЙ ПЕСЕННИК
        </span>
        <h1>Библиотека музыки</h1>
        <p>
          Сохраняйте песни, записывайте партии и возвращайтесь к любимым
          мелодиям.
        </p>
        <details className="hero-features">
          <summary>Что умеет Лад</summary>
          <ul>
            <li>
              <strong>Личная библиотека.</strong> Песни, тексты с аккордами,
              исполнители и избранное в одном месте.
            </li>
            <li>
              <strong>Партии инструментов.</strong> Текстовые и визуальные
              табулатуры гитары, баса, пианино и барабанов с воспроизведением.
            </li>
            <li>
              <strong>Вокальный тренажёр.</strong> Мелодии из MIDI и акапеллы,
              редактор нот, тренировки с микрофоном и обратная связь по
              интонации.
            </li>
            <li>
              <strong>Аккорды и гриф.</strong> Аппликатуры и музыкальные
              подсказки для разбора песен.
            </li>
          </ul>
          <p>
            Светлая и тёмная темы. Библиотека сохраняется в этом браузере;
            экспорт и импорт позволяют перенести её или сделать резервную копию.
          </p>
        </details>
      </div>
      <button className="btn btn-primary" onClick={onNewSong}>
        <Plus size={18} />
        Добавить песню
      </button>
    </section>
  );
}
