import {
  CHORDS,
  INTERVALS,
  keyFor,
  signLabel,
  SOLFEGE,
  pitchLabel,
} from "./theory";
export type ExerciseKind =
  | "notes"
  | "intervals"
  | "chords"
  | "rhythm"
  | "melody"
  | "keys"
  | "scales"
  | "direction"
  | "degrees"
  | "inversions"
  | "cadences"
  | "intervalBuild"
  | "chordBuild"
  | "noteNames";
export const KINDS: {
  id: ExerciseKind;
  title: string;
  description: string;
  group: string;
}[] = [
  {
    id: "notes",
    title: "Чтение нот",
    description: "Найдите ноту на нотном стане.",
    group: "Ноты и запись",
  },
  {
    id: "noteNames",
    title: "Названия нот",
    description: "Свяжите буквы, слоги и знаки альтерации.",
    group: "Ноты и запись",
  },
  {
    id: "direction",
    title: "Выше или ниже",
    description: "Услышьте направление движения звука.",
    group: "Слух",
  },
  {
    id: "intervals",
    title: "Интервалы на слух",
    description: "Определите расстояние между звуками.",
    group: "Слух",
  },
  {
    id: "scales",
    title: "Гаммы и лады",
    description: "Узнайте мажор, виды минора и пентатонику.",
    group: "Слух",
  },
  {
    id: "degrees",
    title: "Ступени на слух",
    description: "Найдите ступень относительно тоники.",
    group: "Слух",
  },
  {
    id: "chords",
    title: "Трезвучия",
    description: "Узнайте тип аккорда по звучанию.",
    group: "Гармония",
  },
  {
    id: "inversions",
    title: "Обращения аккордов",
    description: "Услышьте, какой звук оказался в басу.",
    group: "Гармония",
  },
  {
    id: "cadences",
    title: "Каденции",
    description: "Различайте завершения гармонических оборотов.",
    group: "Гармония",
  },
  {
    id: "intervalBuild",
    title: "Построение интервалов",
    description: "Найдите верхнюю ноту заданного интервала.",
    group: "Построение",
  },
  {
    id: "chordBuild",
    title: "Построение аккордов",
    description: "Выберите звуки мажорного или минорного трезвучия.",
    group: "Построение",
  },
  {
    id: "keys",
    title: "Ключевые знаки",
    description: "Определите знаки мажора и параллельного минора.",
    group: "Построение",
  },
  {
    id: "rhythm",
    title: "Ритмический диктант",
    description: "Запишите длительности и паузы в такте.",
    group: "Диктанты",
  },
  {
    id: "melody",
    title: "Мелодический диктант",
    description: "Восстановите мелодию по ступеням гаммы.",
    group: "Диктанты",
  },
];
export type SoundNote = {
  midi: number;
  beat: number;
  duration: number;
  click?: boolean;
  rest?: boolean;
};
export type Exercise = {
  id: string;
  kind: ExerciseKind;
  level: number;
  prompt: string;
  hint: string;
  explanation: string;
  answer: string[];
  options: string[];
  notes: SoundNote[];
  staff?: number[];
  tonic?: number;
  fifths?: number;
  auditory?: boolean;
  beats?: number;
  keyboardAnswer?: number[];
  keyboardRoot?: number;
};
export const SCALE_TYPES = [
  {
    name: "Мажор",
    steps: [0, 2, 4, 5, 7, 9, 11, 12],
    why: "Т–Т–П–Т–Т–Т–П: большая III ступень и полутон VII–I.",
  },
  {
    name: "Натуральный минор",
    steps: [0, 2, 3, 5, 7, 8, 10, 12],
    why: "Т–П–Т–Т–П–Т–Т: по сравнению с одноимённым мажором понижены III, VI и VII.",
  },
  {
    name: "Гармонический минор",
    steps: [0, 2, 3, 5, 7, 8, 11, 12],
    why: "VII ступень натурального минора повышена: между VI и VII возникает увеличенная секунда (3 полутона).",
  },
  {
    name: "Мелодический минор вверх",
    steps: [0, 2, 3, 5, 7, 9, 11, 12],
    why: "При движении вверх в классической форме повышены VI и VII ступени натурального минора.",
  },
  {
    name: "Мажорная пентатоника",
    steps: [0, 2, 4, 7, 9, 12],
    why: "Пять ступеней: I, II, III, V, VI мажора; полутоновых шагов нет.",
  },
  {
    name: "Минорная пентатоника",
    steps: [0, 3, 5, 7, 10, 12],
    why: "Пять ступеней: I, III, IV, V, VII натурального минора.",
  },
];
export const RHYTHM_VALUES: Record<string, number> = {
  "♩ 1": 1,
  "♪ ½": 0.5,
  "♩· 1½": 1.5,
  "Пауза 1": 1,
  "Пауза ½": 0.5,
  "Половинная 2": 2,
};
let sequence = 0;
export function generateExercise(
  kind: ExerciseKind,
  level: number,
  random: () => number = Math.random,
): Exercise {
  const pick = <T>(a: T[]) =>
    a[Math.min(a.length - 1, Math.floor(random() * a.length))];
  const q: Exercise = {
    id: `sf-${Date.now()}-${++sequence}`,
    kind,
    level,
    prompt: "",
    hint: "",
    explanation: "",
    answer: [],
    options: [],
    notes: [],
  };
  const root = pick([48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 65]);
  const sound = (midi: number, beat: number, duration = 0.8): SoundNote => ({
    midi,
    beat,
    duration,
  });
  const single = (
    prompt: string,
    answer: string,
    options: string[],
    explanation: string,
    notes: SoundNote[] = [],
    hint = "Сначала послушайте пример целиком, затем выберите ответ.",
  ) =>
    Object.assign(q, {
      prompt,
      answer: [answer],
      options,
      explanation,
      notes,
      hint,
    });
  if (kind === "notes") {
    const range =
      level === 1
        ? [0, 1, 2, 3, 4, 5, 6]
        : level === 2
          ? [-2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
          : Array.from({ length: 17 }, (_, i) => i - 4);
    const index = pick(range),
      pc = ((index % 7) + 7) % 7,
      midi = 60 + [0, 2, 4, 5, 7, 9, 11][pc] + Math.floor(index / 7) * 12;
    single(
      "Какая нота записана в скрипичном ключе?",
      SOLFEGE[pc],
      SOLFEGE,
      `Это ${SOLFEGE[pc]} (${pitchLabel(midi)}). Снизу вверх линейки скрипичного ключа: ми, соль, си, ре, фа.`,
      [sound(midi, 0)],
      "Вторая линейка снизу — соль первой октавы (G4). Соседняя линейка или промежуток — следующая ступень.",
    );
    q.staff = [midi];
  } else if (kind === "noteNames") {
    const index = pick([0, 1, 2, 3, 4, 5, 6]),
      acc = level === 1 ? "" : pick(["", "♯", "♭"]),
      letters = ["C", "D", "E", "F", "G", "A", "B"],
      suffix = acc === "♯" ? " диез" : acc === "♭" ? " бемоль" : "";
    single(
      `Как называется нота ${letters[index]}${acc}?`,
      SOLFEGE[index] + suffix,
      SOLFEGE.map((n) => n + suffix),
      `${letters[index]}${acc} — ${SOLFEGE[index]}${suffix}. ${acc === "♯" ? "Диез повышает исходную ноту на полутон." : acc === "♭" ? "Бемоль понижает исходную ноту на полутон." : "В этой системе B означает си."}`,
      [],
      "C–D–E–F–G–A–B соответствуют до–ре–ми–фа–соль–ля–си. Знак меняет высоту, но не название основной ступени.",
    );
  } else if (kind === "intervals") {
    const steps =
      level === 1
        ? [2, 3, 4, 5, 7, 12]
        : level === 2
          ? [0, 1, 2, 3, 4, 5, 7, 8, 9, 12]
          : Array.from({ length: 13 }, (_, i) => i);
    const n = pick(steps),
      down = level > 1 && random() > 0.5;
    single(
      `Какой интервал звучит ${down ? "вниз" : "вверх"}?`,
      INTERVALS[n],
      steps.map((i) => INTERVALS[i]),
      `${INTERVALS[n]}: ${n} полутонов. Направление не меняет величину интервала.`,
      [sound(root, 0), sound(root + (down ? -n : n), 1.2)],
      "Сравнивайте расстояние между звуками, а не высоту первого. Октава сохраняет название ноты.",
    );
    q.auditory = true;
  } else if (kind === "direction") {
    const direction = pick([-1, 0, 1]),
      distance = pick(
        level === 1 ? [5, 7, 12] : level === 2 ? [2, 3, 4] : [1, 2],
      );
    single(
      "Куда движется второй звук?",
      ["Ниже", "Та же высота", "Выше"][direction + 1],
      ["Ниже", "Та же высота", "Выше"],
      `Второй звук ${direction === 0 ? "повторяет первый" : direction > 0 ? "выше первого" : "ниже первого"}${direction === 0 ? "" : ` на ${distance} полутонов`}.`,
      [sound(root, 0), sound(root + direction * distance, 1.2)],
    );
    q.auditory = true;
  } else if (kind === "scales") {
    const choices = SCALE_TYPES.slice(0, level === 1 ? 2 : level === 2 ? 4 : 6),
      scale = pick(choices);
    single(
      "Какая гамма прозвучала?",
      scale.name,
      choices.map((s) => s.name),
      `${scale.name}. ${scale.why}`,
      scale.steps.map((n, i) => sound(root + n, i * 0.6, 0.5)),
      "Все гаммы звучат вверх от тоники до её октавы. Слушайте III ступень и шаги в верхней части гаммы.",
    );
    q.auditory = true;
  } else if (kind === "degrees") {
    const key = keyFor(
        pick(
          level === 1
            ? [0]
            : level === 2
              ? [-1, 0, 1]
              : [-4, -3, -2, -1, 0, 1, 2, 3, 4],
        ),
      ),
      indices = level === 1 ? [0, 2, 4] : [0, 1, 2, 3, 4, 5, 6],
      n = pick(indices);
    single(
      `Какая ступень звучит после тоники ${key.tonic}?`,
      String(n + 1),
      indices.map((i) => String(i + 1)),
      `${n + 1}-я ступень ${key.tonic} мажора — ${key.notes[n]}.`,
      [sound(key.midi[0], 0), sound(key.midi[n], 1.5)],
      "Первый звук — I ступень. Определите место второго звука в мажорной гамме. Можно отдельно повторить тонику.",
    );
    q.tonic = key.midi[0];
    q.auditory = true;
  } else if (kind === "chords") {
    const choices = CHORDS.slice(0, level === 1 ? 2 : level === 2 ? 3 : 4),
      chord = pick(choices);
    single(
      "Какое трезвучие прозвучало?",
      chord.name,
      choices.map((c) => c.name),
      `${chord.name}. ${chord.hint}`,
      [
        ...chord.steps.map((n) => sound(root + n, 0, 1.4)),
        ...chord.steps.map((n, i) => sound(root + n, 2 + i * 0.7, 0.6)),
      ],
      "Сначала аккорд целиком, затем звуки по очереди. Здесь все трезвучия в основном виде.",
    );
    q.auditory = true;
  } else if (kind === "inversions") {
    const chord = pick(CHORDS.slice(0, level === 1 ? 1 : 2)),
      inversion = pick(level === 1 ? [0, 1] : [0, 1, 2]),
      steps = [
        ...chord.steps.slice(inversion),
        ...chord.steps.slice(0, inversion).map((n) => n + 12),
      ],
      names = ["Основной вид", "Первое обращение", "Второе обращение"];
    single(
      `В каком виде звучит ${chord.name.toLowerCase()}?`,
      names[inversion],
      names.slice(0, level === 1 ? 2 : 3),
      `${names[inversion]}: в басу ${["основной тон", "терция", "квинта"][inversion]}. ${["Интервалы от баса — терция и квинта (5/3).", "Интервалы от баса — терция и секста (6/3).", "Интервалы от баса — кварта и секста (6/4)."][inversion]}`,
      [
        ...steps.map((n) => sound(root + n, 0, 1.5)),
        ...steps.map((n, i) => sound(root + n, 2 + i * 0.7, 0.6)),
      ],
      "Вслушайтесь в нижний звук и интервалы от него. Первое обращение — секстаккорд, второе — квартсекстаккорд.",
    );
    q.auditory = true;
  } else if (kind === "cadences") {
    const key = keyFor(pick(level === 1 ? [0] : [-2, -1, 0, 1, 2]));
    const patterns = [
      {
        name: "Автентическая · V–I",
        degrees: [4, 0],
        why: "Доминанта возвращается к тонике.",
      },
      {
        name: "Плагальная · IV–I",
        degrees: [3, 0],
        why: "Субдоминанта возвращается к тонике.",
      },
      {
        name: "Прерванная · V–vi",
        degrees: [4, 5],
        why: "После доминанты ожидается тоника, но звучит VI ступень.",
      },
      {
        name: "Половинная · I–V",
        degrees: [0, 4],
        why: "Оборот заканчивается на доминанте и оставляет ожидание продолжения.",
      },
    ];
    const choices = patterns.slice(0, level === 1 ? 2 : level === 2 ? 3 : 4),
      pattern = pick(choices);
    const triad = (degree: number) =>
      [degree, degree + 2, degree + 4].map(
        (n) => key.midi[n % 7] + (n >= 7 ? 12 : 0) - 12,
      );
    single(
      `Какой оборот завершает фразу в ${key.tonic} мажоре?`,
      pattern.name,
      choices.map((p) => p.name),
      `${pattern.name}. ${pattern.why} Сначала для ориентира прозвучала тоника.`,
      [
        ...triad(0).map((m) => sound(m, 0, 1.4)),
        ...pattern.degrees.flatMap((d, i) =>
          triad(d).map((m) => sound(m, 2 + i * 2, 1.6)),
        ),
      ],
      "Первый аккорд задаёт тонику. Ответ относится к последним двум аккордам; слушайте, куда они приходят.",
    );
    q.auditory = true;
  } else if (kind === "intervalBuild" || kind === "chordBuild") {
    // Diatonic spelling is preserved; no misleading enharmonic substitute in theory tasks.
    const key = keyFor(
      pick(
        level === 1
          ? [0, 1, -1]
          : level === 2
            ? [-2, -1, 0, 1, 2]
            : [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6],
      ),
    );
    if (kind === "intervalBuild") {
      const n = pick(level === 1 ? [1, 2, 3, 4] : [1, 2, 3, 4, 5, 6]);
      single(
        `Какова верхняя нота интервала «${INTERVALS[[0, 2, 4, 5, 7, 9, 11][n]]}» вверх от ${key.tonic}?`,
        key.notes[n],
        key.notes,
        `${key.tonic}–${key.notes[n]}: ${INTERVALS[[0, 2, 4, 5, 7, 9, 11][n]]}, ${[0, 2, 4, 5, 7, 9, 11][n]} полутонов. Считаем названия нот включительно: исходная нота — первая.`,
        [],
        "Сначала отсчитайте число ступеней, включая обе крайние ноты, затем проверьте полутоны.",
      );
      q.keyboardRoot = key.midi[0];
      q.keyboardAnswer = [key.midi[n]];
      q.prompt +=
        " Исходная нота: " +
        pitchLabel(key.midi[0]) +
        ". Выберите только верхнюю ноту.";
    } else {
      const minor = level > 1 && random() > 0.5,
        offset = minor ? 5 : 0;
      const option = (d: number) =>
        [d, d + 2, d + 4].map((n) => key.notes[n % 7]).join(" · ");
      single(
        `Из каких нот состоит ${minor ? key.minor + " минорное" : key.tonic + " мажорное"} трезвучие?`,
        option(offset),
        [0, 1, 2, 3, 4, 5, 6].map(option),
        `${option(offset)}. От основного тона: ${minor ? "0–3–7" : "0–4–7"} полутонов; ноты расположены через ступень.`,
        [],
        "Трезвучие строится по терциям: основной тон, терция, квинта. Не берите три соседние ступени.",
      );
      const base = key.midi[offset];
      q.keyboardRoot = base;
      q.keyboardAnswer = [base, base + (minor ? 3 : 4), base + 7];
      q.prompt += " Постройте основной вид от " + pitchLabel(base) + ".";
    }
  } else if (kind === "rhythm") {
    const beats = level === 3 ? 8 : 4,
      options =
        level === 1
          ? ["♩ 1", "♪ ½"]
          : level === 2
            ? ["♩ 1", "♪ ½", "♩· 1½", "Пауза 1"]
            : Object.keys(RHYTHM_VALUES);
    let remaining = beats,
      position = 0;
    const answer: string[] = [],
      notes: SoundNote[] = [];
    while (remaining > 0) {
      const choices = options.filter(
        (v) =>
          RHYTHM_VALUES[v] <= remaining &&
          !(answer.length === 0 && v.startsWith("Пауза")) &&
          !(answer.at(-1)?.startsWith("Пауза") && v.startsWith("Пауза")),
      );
      const label = pick(choices),
        duration = RHYTHM_VALUES[label];
      answer.push(label);
      notes.push({
        ...sound(72, position, duration),
        rest: label.startsWith("Пауза"),
      });
      position += duration;
      remaining -= duration;
    }
    Object.assign(q, {
      prompt: `Соберите ${beats === 8 ? "два такта" : "такт"} 4/4 по слуху.`,
      answer,
      options,
      notes,
      beats,
      auditory: true,
      hint: "Четыре тихих отсчёта — затем задание на фоне пульса. Четверть = 1 доля, восьмая = ½; пауза занимает время без ноты.",
      explanation: `Ритм: ${answer.join(" → ")}. Всего ${beats} долей. Паузы учитываются наравне с длительностями нот.`,
    });
  } else if (kind === "melody") {
    const fifths = pick(
        level === 1
          ? [0]
          : level === 2
            ? [-1, 0, 1]
            : [-4, -3, -2, -1, 0, 1, 2, 3, 4],
      ),
      key = keyFor(fifths),
      max = level === 1 ? 4 : 6,
      count = level === 1 ? 4 : level === 2 ? 6 : 8,
      degrees = [0];
    for (let i = 1; i < count - 1; i++) {
      const last = degrees.at(-1)!;
      const moves = [-2, -1, 0, 1, 2]
        .map((n) => last + n)
        .filter((n) => n >= 0 && n <= max);
      degrees.push(pick(moves));
    }
    degrees.push(0);
    Object.assign(q, {
      prompt: `Запишите ступени мелодии в ${key.tonic} мажоре.`,
      hint: "Отдельно послушайте тонику. Фраза начинается и заканчивается I ступенью; внутри — повторения, шаги и небольшие скачки.",
      answer: degrees.map((n) => String(n + 1)),
      options: Array.from({ length: max + 1 }, (_, i) => String(i + 1)),
      tonic: key.midi[0],
      fifths,
      auditory: true,
      notes: degrees.map((n, i) => sound(key.midi[n], i, 0.8)),
      explanation: `Ступени: ${degrees.map((n) => n + 1).join(" → ")}. Ноты: ${degrees.map((n) => key.notes[n]).join(" → ")}.`,
    });
  } else {
    const fifths = pick(
        level === 1
          ? [-2, -1, 0, 1, 2]
          : level === 2
            ? [-4, -3, -2, -1, 0, 1, 2, 3, 4]
            : Array.from({ length: 15 }, (_, i) => i - 7),
      ),
      key = keyFor(fifths),
      minor = level > 1 && random() > 0.5;
    single(
      `Какие ключевые знаки в ${minor ? key.minor + " миноре" : key.tonic + " мажоре"}?`,
      signLabel(fifths),
      (level === 1
        ? [-2, -1, 0, 1, 2]
        : level === 2
          ? [-4, -3, -2, -1, 0, 1, 2, 3, 4]
          : Array.from({ length: 15 }, (_, i) => i - 7)
      ).map(signLabel),
      `${key.tonic} мажор / ${key.minor} минор: ${key.signs.join(", ") || "нет ключевых знаков"}. Повышения гармонического минора не входят в ключевую подпись.`,
      [],
      "Параллельные мажор и минор имеют одинаковые знаки. Вправо по кругу добавляется диез, влево — бемоль.",
    );
  }
  return q;
}
export function exerciseSignature(q: Exercise) {
  return JSON.stringify([
    q.kind,
    q.prompt,
    q.answer,
    q.notes.map((n) => [n.midi, n.beat, n.duration, n.rest]),
  ]);
}
export function freshExercise(
  kind: ExerciseKind,
  level: number,
  recent: string[] = [],
  random: () => number = Math.random,
) {
  let q = generateExercise(kind, level, random);
  for (let i = 0; i < 40 && recent.includes(exerciseSignature(q)); i++)
    q = generateExercise(kind, level, random);
  return q;
}
export function isCorrect(q: Exercise, response: string[]) {
  return (
    q.answer.length === response.length &&
    q.answer.every((v, i) => v === response[i])
  );
}
export function rhythmBeats(response: string[]) {
  return response.reduce((n, v) => n + (RHYTHM_VALUES[v] ?? 0), 0);
}
