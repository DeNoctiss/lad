import type { Band, Song } from "../model";
import { validateVocalProject } from "./model";
import raw from "./templates/osen-chorus.json";
export function osenTemplate(): { band: Band; song: Song } {
  const vocal = validateVocalProject(raw);
  return {
    band: {
      id: "wildways-tritia",
      name: "Wildways, TRITIA",
      genre: "Рок",
      color: "ocean",
      initials: "WT",
    },
    song: {
      id: "wildways-tritia-osen-chorus",
      bandId: "wildways-tritia",
      title: "Осень · припев",
      key: "—",
      bpm: vocal.bpm,
      capo: 0,
      favorite: false,
      chords: [],
      parts: [],
      vocal,
      updatedAt: new Date().toISOString(),
      lyrics:
        "{Рабочий шаблон припева}\n58 нот по предоставленной акапелле, фрагмент 0:57.45–1:27.15. Темп сетки 135 BPM оценочный. Это рабочая транскрипция, а не официальная партитура.\n\n{Как слушать с оригиналом}\nВо вкладке тренажёра загрузите исходную полную акапеллу через дорожку «Акапелла» слева. Сохраните исходное имя файла: сдвиг к припеву восстановится автоматически. Верхняя кнопка «Акапелла» распознаёт новые ноты и заменяет шаблон.\n\n{Высота нот}\nОсновная мелодия D4–F♯4, встречаются G4 и A4. В записи есть обработка и бэк-вокал, поэтому отдельные ноты и границы могут требовать правки. Кнопка «На октаву ниже» изменяет только ноты; транспонирование меняет также звучание аудио.",
    },
  };
}
