import { CircleAlert, Download, HardDrive, Upload } from "lucide-react";

export function StorageSection({
  onExport,
  onImport,
}: {
  onExport: () => void;
  onImport: () => void;
}) {
  return (
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
          Экспорт скачивает файл <code>lad-backup-…json</code> — храните его где
          удобно и открывайте через «Импорт» на любом устройстве. Битый файл не
          навредит: импорт проверяет данные и при ошибке оставляет библиотеку
          как есть.
        </p>
      </div>
    </div>
  );
}
