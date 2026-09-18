import type {
  NoteEffect,
  NoteLink,
  TabEvent,
  TabIssue,
  TabKind,
  TabNote,
  TabScore,
} from "./tabTypes";

import { pianoKeys, pianoLabel, pianoMidi, pianoName } from "./piano";

const kinds: readonly TabKind[] = ["guitar", "bass", "drums", "piano"];
const durations = [1, 2, 4, 8, 16] as const;
const effects: readonly NoteEffect[] = [
  "pm",
  "v",
  "harm",
  "b0.5",
  "b1",
  "accent",
  "ghost",
  "open",
];
const links: readonly NoteLink[] = ["h", "p", "/", "\\", "tie"];
const drumLanes = ["HH", "SD", "BD", "HT", "MT", "LT", "CC", "SP", "RD"];

export function kindForInstrument(instrument: string): TabKind {
  if (instrument === "Барабаны") return "drums";
  if (instrument === "Бас-гитара") return "bass";
  if (instrument === "Пианино") return "piano";
  return "guitar";
}

export function lanesFor(kind: TabKind): { id: string; label: string }[] {
  if (kind === "drums") return drumLanes.map((id) => ({ id, label: id }));
  if (kind === "piano")
    return pianoKeys.map((key) => ({
      id: key.name,
      label: pianoLabel(key.name),
    }));
  return (
    kind === "bass" ? ["G", "D", "A", "E"] : ["e", "B", "G", "D", "A", "E"]
  ).map((label, i) => ({ id: String(i + 1), label }));
}

export function durationTicks(
  event: Pick<TabEvent, "duration" | "dotted" | "triplet">,
): number {
  return (
    (1920 / event.duration) *
    (event.dotted ? 1.5 : 1) *
    (event.triplet ? 2 / 3 : 1)
  );
}

export function measureTicks(meter: TabScore["meter"]): number {
  return (1920 / meter.unit) * meter.beats;
}

function uid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function createScore(kind: TabKind): TabScore {
  return validateScore({
    version: 1,
    kind,
    meter: { beats: 4, unit: 4 },
    measures: [{ id: uid(), events: [] }],
  });
}

function fail(message: string): never {
  throw new Error(message);
}

function record(value: unknown, context: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(`${context}: ожидается объект.`);
  }
  return value as Record<string, unknown>;
}

function list(value: unknown, limit: number, context: string): unknown[] {
  if (!Array.isArray(value)) fail(`${context}: ожидается массив.`);
  if (value.length > limit) fail(`${context}: допускается не более ${limit}.`);
  return value;
}

function checkedMeter(value: unknown): TabScore["meter"] {
  const meter = record(value, "Размер такта");
  if (
    typeof meter.beats !== "number" ||
    !Number.isInteger(meter.beats) ||
    meter.beats < 1 ||
    meter.beats > 12
  ) {
    fail("Размер такта: число долей должно быть целым от 1 до 12.");
  }
  if (meter.unit !== 4 && meter.unit !== 8)
    fail("Размер такта: знаменатель должен быть 4 или 8.");
  return { beats: meter.beats, unit: meter.unit };
}

function issueText(issue: TabIssue): string {
  return `Такт ${issue.measure}${issue.event === undefined ? "" : `, событие ${issue.event}`}: ${issue.message}`;
}

export function validateScore(
  value: unknown,
  expectedKind?: TabKind,
): TabScore {
  const source = record(value, "Табулатура");
  if (source.version !== 1)
    fail("Неподдерживаемая версия табулатуры: требуется 1.");
  if (!kinds.includes(source.kind as TabKind))
    fail("Неизвестный вид инструмента в табулатуре.");
  const kind = source.kind as TabKind;
  if (expectedKind !== undefined && kind !== expectedKind)
    fail("Вид табулатуры не соответствует инструменту партии.");
  const meter = checkedMeter(source.meter);
  const rawMeasures = list(source.measures, 128, "Такты");
  if (rawMeasures.length === 0)
    fail("Табулатура должна содержать хотя бы один такт.");
  const ids = new Set<string>();
  const checkedId = (value: unknown, context: string): string => {
    if (typeof value !== "string" || value.trim().length === 0)
      fail(`${context}: требуется непустой строковый идентификатор.`);
    if (ids.has(value))
      fail(`${context}: повторяющийся идентификатор «${value}».`);
    ids.add(value);
    return value;
  };
  const measures = Array.from(rawMeasures, (rawMeasure, m) => {
    const context = `Такт ${m + 1}`;
    const measure = record(rawMeasure, context);
    const id = checkedId(measure.id, context);
    const events = Array.from(
      list(measure.events, 64, `${context}, события`),
      (rawEvent, e): TabEvent => {
        const location = `${context}, событие ${e + 1}`;
        const event = record(rawEvent, location);
        const eventId = checkedId(event.id, location);
        if (!durations.includes(event.duration as TabEvent["duration"]))
          fail(`${location}: длительность должна быть 1, 2, 4, 8 или 16.`);
        if (
          typeof event.dotted !== "boolean" ||
          typeof event.triplet !== "boolean"
        )
          fail(
            `${location}: dotted и triplet должны быть логическими значениями.`,
          );
        if (event.dotted && event.triplet)
          fail(`${location}: точку и триоль нельзя совмещать.`);
        const notes = Array.from(
          list(event.notes, kind === "piano" ? 10 : 6, `${location}, ноты`),
          (rawNote, n): TabNote => {
            const noteContext = `${location}, нота ${n + 1}`;
            const note = record(rawNote, noteContext);
            if (typeof note.lane !== "string")
              fail(`${noteContext}: струна или дорожка должна быть строкой.`);
            if (
              note.fret !== "x" &&
              (typeof note.fret !== "number" ||
                !Number.isInteger(note.fret) ||
                note.fret < 0 ||
                note.fret > 24)
            ) {
              fail(`${noteContext}: лад должен быть целым от 0 до 24 или x.`);
            }
            const noteEffects = list(
              note.effects,
              effects.length,
              `${noteContext}, эффекты`,
            );
            const seenEffects = new Set<unknown>();
            for (const effect of noteEffects) {
              if (!effects.includes(effect as NoteEffect))
                fail(`${noteContext}: неизвестный эффект.`);
              if (seenEffects.has(effect))
                fail(`${noteContext}: повторяющийся эффект ${effect}.`);
              seenEffects.add(effect);
            }
            if (
              note.link !== undefined &&
              !links.includes(note.link as NoteLink)
            )
              fail(`${noteContext}: неизвестная связь нот.`);
            return {
              lane: note.lane,
              fret: note.fret as TabNote["fret"],
              effects: [...noteEffects] as NoteEffect[],
              ...(note.link === undefined
                ? {}
                : { link: note.link as NoteLink }),
            };
          },
        );
        return {
          id: eventId,
          duration: event.duration as TabEvent["duration"],
          dotted: event.dotted,
          triplet: event.triplet,
          notes,
        };
      },
    );
    return { id, events };
  });
  const score: TabScore = { version: 1, kind, meter, measures };
  const issues = scoreIssues(score);
  if (issues.length > 0) fail(issues.map(issueText).join("\n"));
  return score;
}

export function scoreIssues(score: TabScore): TabIssue[] {
  const issues: TabIssue[] = [];
  const allowedLanes = new Set(lanesFor(score.kind).map((lane) => lane.id));
  const capacity = measureTicks(score.meter);
  score.measures.forEach((measure, m) => {
    const total = measure.events.reduce(
      (sum, event) => sum + durationTicks(event),
      0,
    );
    if (total > capacity)
      issues.push({
        measure: m + 1,
        message: `Суммарная длительность ${total} превышает размер такта ${capacity} (переполнение).`,
      });
    measure.events.forEach((event, e) => {
      const add = (message: string) => {
        issues.push({ measure: m + 1, event: e + 1, message });
      };
      if (event.dotted && event.triplet)
        add("Точку и триоль нельзя совмещать.");
      if (event.strum !== undefined) {
        if (event.strum !== "down" && event.strum !== "up")
          add("Бой должен быть down или up.");
        else if (score.kind === "drums" || score.kind === "piano")
          add("Бой поддерживается только гитарой и басом.");
        else if (event.notes.length === 0) add("Бой нельзя ставить на паузу.");
      }
      const seenLanes = new Set<string>();
      event.notes.forEach((note) => {
        if (!allowedLanes.has(note.lane))
          add(
            `Неизвестная струна или дорожка «${note.lane}» для этого инструмента.`,
          );
        if (seenLanes.has(note.lane))
          add(`Дорожка или струна ${note.lane} повторяется в одном событии.`);
        seenLanes.add(note.lane);
        if (new Set(note.effects).size !== note.effects.length)
          add(`Нота ${note.lane}: повторяющиеся эффекты.`);
        if (note.effects.includes("b0.5") && note.effects.includes("b1"))
          add(`Нота ${note.lane}: нельзя совмещать два вида бенда.`);
        if (score.kind === "piano") {
          if (note.fret !== 0)
            add("У клавиши пианино значение fret должно быть 0.");
          if (
            note.effects.some(
              (effect) => effect !== "accent" && effect !== "ghost",
            )
          )
            add("Для пианино доступны только акцент и тихая нота.");
          if (note.link !== undefined && note.link !== "tie")
            add("Для пианино поддерживается только лига продления tie.");
        }
        if (score.kind === "drums") {
          if (note.fret !== "x")
            add(`Дорожка ${note.lane}: удар обозначается только x.`);
          if (
            note.effects.some(
              (effect) =>
                effect !== "accent" && effect !== "ghost" && effect !== "open",
            )
          )
            add(
              `Дорожка ${note.lane}: гитарные эффекты недопустимы для барабанов.`,
            );
          if (note.effects.includes("open") && note.lane !== "HH")
            add("Эффект open доступен только дорожке HH.");
          if (note.link !== undefined)
            add("Связи нот недопустимы для барабанов.");
          return;
        }
        if (note.effects.includes("open"))
          add("Эффект open доступен только для барабанов HH.");
        if (note.fret === "x" && note.effects.includes("harm"))
          add("Флажолет недоступен на приглушённой ноте x.");
        if (note.link === undefined) return;
        let next = measure.events[e + 1];
        if (e === measure.events.length - 1 && total === capacity)
          next = score.measures[m + 1]?.events[0];
        const target = next?.notes.find(
          (candidate) => candidate.lane === note.lane,
        );
        if (!target) {
          add(
            `Связь ${note.link} на струне ${note.lane}: нужна нота на той же струне в следующем событии без паузы и незаполненного промежутка.`,
          );
          return;
        }
        if (note.fret === "x" || target.fret === "x") {
          add(
            `Связь ${note.link} на струне ${note.lane}: приглушённые ноты x не могут быть источником или целью.`,
          );
          return;
        }
        if (
          (note.link === "h" || note.link === "/") &&
          target.fret <= note.fret
        )
          add(
            `Связь ${note.link} на струне ${note.lane}: целевой лад должен быть выше исходного.`,
          );
        if (
          (note.link === "p" || note.link === "\\") &&
          target.fret >= note.fret
        )
          add(
            `Связь ${note.link} на струне ${note.lane}: целевой лад должен быть ниже исходного.`,
          );
        if (note.link === "tie" && target.fret !== note.fret)
          add(`Лига tie на струне ${note.lane}: лады должны совпадать.`);
      });
    });
  });
  return issues;
}

function parseNote(text: string, context: string, kind: TabKind): TabNote {
  if (kind === "piano") {
    const [key, ...suffixes] = text.split("~");
    const midi = pianoMidi(key);
    if (midi === null)
      fail(`${context}: укажите клавишу от A0 до C8, например C4 или F#4.`);
    const note: TabNote = { lane: pianoName(midi), fret: 0, effects: [] };
    for (const suffix of suffixes) {
      if (suffix === "tie" && !note.link) note.link = "tie";
      else if (suffix === "accent" || suffix === "ghost")
        note.effects.push(suffix);
      else
        fail(
          `${context}: недопустимый или повторяющийся приём пианино «${suffix}».`,
        );
    }
    return note;
  }
  const match = /^([1-6]|HH|SD|BD|HT|MT|LT|CC|SP|RD):(x|0|[1-9]\d*)(.*)$/.exec(
    text,
  );
  if (!match)
    fail(
      `${context}: неверная нота «${text}», ожидается струна:лад или дорожка:x.`,
    );
  const note: TabNote = {
    lane: match[1],
    fret: match[2] === "x" ? "x" : Number(match[2]),
    effects: [],
  };
  if (match[3] !== "") {
    if (!match[3].startsWith("~"))
      fail(`${context}: неверный суффикс ноты «${text}».`);
    for (const suffix of match[3].slice(1).split("~")) {
      if (effects.includes(suffix as NoteEffect))
        note.effects.push(suffix as NoteEffect);
      else if (links.includes(suffix as NoteLink)) {
        if (note.link !== undefined)
          fail(`${context}: у ноты допускается только одна исходящая связь.`);
        note.link = suffix as NoteLink;
      } else fail(`${context}: неизвестный эффект или связь «${suffix}».`);
    }
  }
  return note;
}

function parseEvent(
  token: string,
  m: number,
  e: number,
  kind: TabKind,
): TabEvent {
  const context = `Такт ${m + 1}, событие ${e + 1}`;
  const match = /^(.+)@(1|2|4|8|16)([.t]?)([du]?)$/.exec(token);
  if (!match)
    fail(
      `${context}: неверное событие «${token}». Укажите ноту, аккорд или r и обязательную длительность @1, @2, @4, @8, @16 с необязательной точкой, t или боем d/u.`,
    );
  const body = match[1];
  let notes: TabNote[];
  if (body === "r") notes = [];
  else if (body.startsWith("[") && body.endsWith("]")) {
    const parts = body.slice(1, -1).split(",");
    const limit = kind === "piano" ? 10 : 6;
    if (parts.length > limit)
      fail(`${context}: допускается не более ${limit} нот в событии.`);
    notes = parts.map((part) => parseNote(part, context, kind));
  } else notes = [parseNote(body, context, kind)];
  const strum = match[4] === "d" ? "down" : match[4] === "u" ? "up" : undefined;
  return {
    id: `tab-event-${m + 1}-${e + 1}`,
    duration: Number(match[2]) as TabEvent["duration"],
    dotted: match[3] === ".",
    triplet: match[3] === "t",
    ...(strum ? { strum } : {}),
    notes,
  };
}

export function parseNotation(
  text: string,
  kind: TabKind,
  meter: TabScore["meter"],
): TabScore {
  if (typeof text !== "string") fail("Запись табулатуры должна быть строкой.");
  if (text.length > 100000)
    fail("Запись табулатуры не должна превышать 100000 символов.");
  const trimmed = text.trim();
  const bars = trimmed.split("|");
  if (trimmed.startsWith("|")) bars.shift();
  if (trimmed.endsWith("|")) bars.pop();
  if (bars.length === 0) bars.push("");
  if (bars.length > 128)
    fail("Табулатура не должна содержать более 128 тактов.");
  const measures = bars.map((bar, m) => {
    const tokens = bar.trim() === "" ? [] : bar.trim().split(/\s+/);
    if (tokens.length > 64)
      fail(`Такт ${m + 1}: допускается не более 64 событий.`);
    return {
      id: `tab-measure-${m + 1}`,
      events: tokens.map((token, e) => parseEvent(token, m, e, kind)),
    };
  });
  return validateScore({ version: 1, kind, meter, measures }, kind);
}

export function serializeNotation(score: TabScore): string {
  return `| ${score.measures
    .map((measure) =>
      measure.events
        .map((event) => {
          const notes = event.notes.map(
            (note) =>
              `${note.lane}${score.kind === "piano" ? "" : `:${note.fret}`}${note.effects.map((effect) => `~${effect}`).join("")}${note.link === undefined ? "" : `~${note.link}`}`,
          );
          const body =
            notes.length === 0
              ? "r"
              : notes.length === 1
                ? notes[0]
                : `[${notes.join(",")}]`;
          return `${body}@${event.duration}${event.dotted ? "." : event.triplet ? "t" : ""}${event.strum === "down" ? "d" : event.strum === "up" ? "u" : ""}`;
        })
        .join(" "),
    )
    .join(" | ")} |`;
}

export function exampleNotation(kind: TabKind): string {
  if (kind === "piano")
    return "| [C4,E4,G4]@2 D4@4 E4@4 | [F3,A3,C4]@2 [G3,B3,D4]@2 | C4~tie@1 | C4@2 r@2 |";
  if (kind === "drums")
    return "| [HH:x~open,BD:x]@4 [HH:x,SD:x~accent]@4 [HH:x,BD:x]@4 [HH:x,SD:x~ghost]@4 | [CC:x~accent,BD:x]@4 HT:x@8 MT:x@8 LT:x@8 SP:x@8 BD:x@4 | [RD:x,BD:x]@8 RD:x@8 [RD:x,SD:x]@8 RD:x@8 [RD:x,BD:x]@8 RD:x@8 [RD:x,SD:x]@8 RD:x@8 |";
  if (kind === "bass")
    return "| 4:0~pm@4 4:3~h@8 4:5@8 3:0~accent@4 r@4 | 2:5~p@8 2:3@8 3:5~v@4 4:0@2 |";
  return "| 1:5~h@8 1:7~p@8 1:5@4 r@2 | [1:0,2:1,3:2]@4. r@8 2:3~/@8 2:5~\\@8 2:3~v@4 | 1:5~b0.5@4 1:5~tie@4 1:5@4 6:x~pm@4 |";
}
