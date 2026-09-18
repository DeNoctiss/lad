import {
  BookOpenText,
  CircleAlert,
  Download,
  Drum,
  FileText,
  Guitar,
  HardDrive,
  Heart,
  LayoutGrid,
  Music2,
  Piano,
  Play,
  Printer,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { BackLink } from "../components/ui/BackLink";

const steps = [
  {
    title: "Создайте группу",
    text: "На главной странице нажмите «Добавить группу» — это исполнитель или подборка. Внутри группы живут её песни.",
  },
  {
    title: "Добавьте песню",
    text: "Название, тональность, темп и текст. Каподастр и BPM по желанию — темп влияет на прослушивание партий.",
  },
  {
    title: "Расставьте аккорды",
    text: "Пишите аккорд в квадратных скобках перед словом: [Am]Слова [F]песни. Части песни помечайте строкой {Припев}.",
  },
  {
    title: "Запишите партии",
    text: "На вкладке «Табулатуры» — визуальная партия с нотами и длительностями или обычный текстовый таб.",
  },
  {
    title: "Послушайте результат",
    text: "Кнопка воспроизведения на визуальной партии играет её сэмплами гитары, баса или пианино; барабаны синтезируются.",
  },
];

const features = [
  {
    icon: Search,
    title: "Библиотека и навигация",
    points: [
      "Поиск по группам и песням — поле в шапке сайта",
      "Избранное — сердечко на странице песни",
      "Фильтр групп по жанрам, сортировка «недавно обновлены» в боковой панели",
      "Редактирование и удаление — кнопки «Редактировать» на страницах группы и песни",
    ],
  },
  {
    icon: FileText,
    title: "Текст и аккорды",
    points: [
      "[Am] ставится перед слогом — аккорд появится над текстом",
      "{Куплет}, {Припев} на отдельной строке — названия частей",
      "Размер шрифта меняется кнопками А−/А+ на вкладке «Текст и аккорды»",
      "Кнопка печати выводит текст с аккордами на принтер",
    ],
  },
  {
    icon: Guitar,
    title: "Справочник аккордов",
    points: [
      "Полная база типов и тональностей с поиском по названию",
      "На странице аккорда — все аппликатуры, можно добавить свою",
      "Стрелки рядом с диаграммой на странице песни выбирают вариант и запоминают его",
      "Свои аппликатуры удаляются совсем; встроенные скрываются и возвращаются кнопкой «Вернуть скрытые»",
    ],
  },
  {
    icon: LayoutGrid,
    title: "CAGED и гриф",
    points: [
      "Страница CAGED объясняет пять подвижных форм мажорных и минорных аккордов",
      "Интерактивный «Гриф» показывает ноты и гаммы по всему грифу",
      "Полезно для поиска аппликатур в разных позициях",
    ],
  },
  {
    icon: Drum,
    title: "Табулатуры и партии",
    points: [
      "Инструменты: ритм- и соло-гитара, бас, барабаны, пианино",
      "Визуальная партия — события с длительностями, аккорды, паузы и приёмы",
      "Текстовая партия хранит ASCII-таб как есть — удобно для готовых табов",
      "В редакторе есть раздел «Как писать и читать табулатуру» с примерами",
    ],
  },
  {
    icon: Play,
    title: "Прослушивание",
    points: [
      "Кнопка воспроизведения появляется на визуальных партиях",
      "Гитара, бас и пианино звучат сэмплами; ударные синтезируются",
      "Темп берётся из поля BPM песни",
    ],
  },
];

export function HelpPage({
  navigate,
  onExport,
  onImport,
}: {
  navigate: (route: string) => void;
  onExport: () => void;
  onImport: () => void;
}) {
  return (
    <section className="chord-library guide-page" aria-label="Как это работает">
      <BackLink onClick={() => navigate("bands")}>К библиотеке</BackLink>
      <div className="page-heading chord-page-heading">
        <div>
          <p className="eyebrow">РУКОВОДСТВО ПО САЙТУ</p>
          <h1>Как это работает</h1>
          <p className="chord-page-description">
            Лад — локальный блокнот песен, аккордов и табулатур. Он работает
            прямо в браузере: без регистрации, сервера и интернета после первой
            загрузки.
          </p>
        </div>
      </div>

      <h2 className="subheading caged-section-title">С чего начать</h2>
      <ol className="guide-steps">
        {steps.map((step, index) => (
          <li key={step.title} className="guide-step">
            <span className="guide-step-number">{index + 1}</span>
            <span>
              <strong>{step.title}</strong>
              {step.text}
            </span>
          </li>
        ))}
      </ol>

      <h2 className="subheading caged-section-title">Что умеет сайт</h2>
      <div className="guide-grid">
        {features.map((feature) => (
          <article key={feature.title} className="guide-card">
            <div className="guide-card-head">
              <span className="guide-card-icon">
                <feature.icon size={18} />
              </span>
              <h3>{feature.title}</h3>
            </div>
            <ul>
              {feature.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <h2 className="subheading caged-section-title">
        Где хранятся данные и как их не потерять
      </h2>
      <div className="guide-storage">
        <div className="guide-storage-block">
          <span className="guide-card-icon">
            <HardDrive size={18} />
          </span>
          <div>
            <h3>Всё сохраняется автоматически</h3>
            <p>
              Каждое изменение — новая группа, правка текста, партия или
              аппликатура — сразу записывается в хранилище этого браузера
              (localStorage). Закрывайте вкладку спокойно: при следующем визите
              библиотека будет на месте.
            </p>
          </div>
        </div>
        <div className="guide-storage-block warning">
          <span className="guide-card-icon">
            <CircleAlert size={18} />
          </span>
          <div>
            <h3>Но библиотека привязана к этому браузеру</h3>
            <p>
              Другой браузер, устройство или очистка данных сайта — и библиотека
              будет пустой. Облачной синхронизации нет: сайт не отправляет ваши
              данные никуда. Поэтому после важных изменений делайте резервную
              копию — это один JSON-файл.
            </p>
          </div>
        </div>
        <div className="guide-storage-actions">
          <button className="btn btn-primary" onClick={onExport}>
            <Download size={16} />
            Экспорт библиотеки
          </button>
          <button className="btn" onClick={onImport}>
            <Upload size={16} />
            Импорт библиотеки
          </button>
          <p className="guide-storage-note">
            Экспорт скачивает файл <code>lad-backup-…json</code> — храните его
            где удобно и открывайте через «Импорт» на любом устройстве. Битый
            файл не навредит: импорт проверяет данные и при ошибке оставляет
            библиотеку как есть.
          </p>
        </div>
      </div>

      <h2 className="subheading caged-section-title">Полезные мелочи</h2>
      <div className="guide-tips">
        <p>
          <span className="guide-tip-icon">
            <Heart size={16} />
          </span>
          Избранные песни собираются в отдельном списке «Избранное».
        </p>
        <p>
          <span className="guide-tip-icon">
            <Trash2 size={16} />
          </span>
          Удаление группы удаляет и её песни; удаление песни — её партии. Сайт
          всегда спрашивает подтверждение.
        </p>
        <p>
          <span className="guide-tip-icon">
            <Printer size={16} />
          </span>
          Текст песни с аккордами можно распечатать одной кнопкой.
        </p>
        <p>
          <span className="guide-tip-icon">
            <Piano size={16} />
          </span>
          У пианино два вида партии: клавиши и пиано-ролл — переключаются на
          самой карточке.
        </p>
        <p>
          <span className="guide-tip-icon">
            <BookOpenText size={16} />
          </span>
          Подробный синтаксис табулатуры — в разделе «Как писать и читать
          табулатуру» внутри редактора партии и на вкладке «Табулатуры» песни.
        </p>
      </div>

      <div className="guide-footer">
        <Music2 size={18} />
        <p>Готово к первой песне?</p>
        <button className="btn btn-primary" onClick={() => navigate("bands")}>
          Открыть библиотеку
        </button>
      </div>
    </section>
  );
}
