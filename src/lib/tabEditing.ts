import { uid } from "./model";
import { durationTicks, lanesFor, measureTicks } from "./tablature";
import type { TabEvent, TabNote, TabScore } from "./tabTypes";

export type Rhythm = Pick<TabEvent, "duration" | "dotted" | "triplet">;
export type ScoreCursor = { measure: number; tick: number; lane: string };
export type EmptySlot = { tick: number; ticks: number; rhythm: Rhythm | null };

const rhythms: Rhythm[] = [1, 2, 4, 8, 16]
  .flatMap(
    (duration) =>
      [
        { duration, dotted: false, triplet: false },
        { duration, dotted: true, triplet: false },
        { duration, dotted: false, triplet: true },
      ] as Rhythm[],
  )
  .sort((a, b) => durationTicks(b) - durationTicks(a));

/** Find an exact decomposition, including mixed straight / triplet rhythms. */
function rhythmsForTicks(ticks: number): Rhythm[] | undefined {
  const exact = rhythms.find((rhythm) => durationTicks(rhythm) === ticks);
  if (exact) return [exact];
  const paths = new Map<number, Rhythm[]>([[0, []]]);
  for (let amount = 0; amount <= ticks; amount += 20) {
    const path = paths.get(amount);
    if (!path) continue;
    for (const option of rhythms) {
      const next = amount + durationTicks(option);
      if (next > ticks) continue;
      if (!paths.has(next) || paths.get(next)!.length > path.length + 1)
        paths.set(next, [...path, option]);
    }
  }
  return paths.get(ticks);
}

function fitEntryRhythm(preferred: Rhythm, available: number) {
  if (available <= 0) return undefined;
  if (durationTicks(preferred) <= available) return preferred;
  // Use the longest part first so the next suggested note can only get shorter.
  return rhythmsForTicks(available)?.reduce((longest, rhythm) =>
    durationTicks(rhythm) > durationTicks(longest) ? rhythm : longest,
  );
}

export function barLength(events: TabEvent[]) {
  return events.reduce((sum, event) => sum + durationTicks(event), 0);
}

export function eventPositions(events: TabEvent[]) {
  let tick = 0;
  return events.map((event) => {
    const start = tick;
    tick += durationTicks(event);
    return start;
  });
}

export function eventAtCursor(score: TabScore, cursor: ScoreCursor) {
  const events = score.measures[cursor.measure]?.events ?? [];
  return eventPositions(events).findIndex((tick) => tick === cursor.tick);
}

/** Ghost cells cover the unwritten tail, including a shorter final subdivision. */
export function emptySlots(
  score: TabScore,
  measure: number,
  rhythm: Rhythm,
): EmptySlot[] {
  const bar = score.measures[measure];
  if (!bar) return [];
  const end = measureTicks(score.meter);
  const result: EmptySlot[] = [];
  for (let tick = barLength(bar.events); tick < end && result.length < 64; ) {
    const fitted = fitEntryRhythm(rhythm, end - tick);
    const ticks = fitted ? durationTicks(fitted) : end - tick;
    result.push({ tick, ticks, rhythm: fitted ?? null });
    tick += ticks;
  }
  return result;
}

export function emptyPositions(
  score: TabScore,
  measure: number,
  rhythm: Rhythm,
) {
  return emptySlots(score, measure, rhythm).map((slot) => slot.tick);
}

/** Resolve the same duration for selection and immediate input (e.g. a drum click). */
export function entryRhythmAt(
  score: TabScore,
  cursor: ScoreCursor,
  preferred: Rhythm,
): Rhythm {
  const event =
    score.measures[cursor.measure]?.events[eventAtCursor(score, cursor)];
  const rhythm =
    event ??
    fitEntryRhythm(preferred, measureTicks(score.meter) - cursor.tick) ??
    preferred;
  return {
    duration: rhythm.duration,
    dotted: rhythm.dotted,
    triplet: rhythm.triplet,
  };
}

/** Explicit rests bridge a click in an unwritten part of a bar. No silent retiming. */
function gapRests(ticks: number, preferred: Rhythm): TabEvent[] {
  const step = durationTicks(preferred);
  if (ticks % step === 0)
    return Array.from({ length: ticks / step }, () => ({
      id: uid(),
      ...preferred,
      notes: [],
    }));
  const path = rhythmsForTicks(ticks);
  if (!path)
    throw new Error(
      "Эта позиция не попадает в сетку. Выберите соседнюю ячейку.",
    );
  return path.map((rhythm) => ({ id: uid(), ...rhythm, notes: [] }));
}

export function replaceEvent(
  score: TabScore,
  measure: number,
  index: number,
  change: (event: TabEvent) => TabEvent,
): TabScore {
  return {
    ...score,
    measures: score.measures.map((bar, m) =>
      m === measure
        ? {
            ...bar,
            events: bar.events.map((event, e) =>
              e === index ? change(event) : event,
            ),
          }
        : bar,
    ),
  };
}

/** Write / toggle a note, or a rest (null), preserving the v1 score format. */
export function writeAtCursor(
  score: TabScore,
  cursor: ScoreCursor,
  rhythm: Rhythm,
  note: TabNote | null,
  toggle = false,
): TabScore {
  const bar = score.measures[cursor.measure];
  if (!bar) throw new Error("Сначала добавьте такт.");
  const index = eventAtCursor(score, cursor);
  if (index >= 0) {
    return replaceEvent(score, cursor.measure, index, (event) => {
      let notes = event.notes.filter((n) => n.lane !== cursor.lane);
      if (!note) notes = [];
      else if (!(toggle && event.notes.some((n) => n.lane === cursor.lane))) {
        notes = event.notes.some((n) => n.lane === cursor.lane)
          ? event.notes.map((n) => (n.lane === cursor.lane ? note : n))
          : [...event.notes, note];
      }
      const max =
        score.kind === "piano" ? 10 : Math.min(6, lanesFor(score.kind).length);
      if (notes.length > max)
        throw new Error(`В одном созвучии не больше ${max} нот.`);
      if (notes.some((n) => n.effects.includes("pm")))
        notes = notes.map((n) =>
          n.effects.includes("pm")
            ? n
            : { ...n, effects: [...n.effects, "pm"] },
        );
      const next = { ...event, notes };
      if (!notes.length) delete next.strum;
      return next;
    });
  }
  const used = barLength(bar.events);
  if (cursor.tick < used)
    throw new Error("Выберите начало ноты, чтобы изменить её.");
  if (cursor.tick + durationTicks(rhythm) > measureTicks(score.meter))
    throw new Error(
      "Нота не помещается: уменьшите длительность или перейдите в следующий такт.",
    );
  const events = [
    ...bar.events,
    ...gapRests(cursor.tick - used, rhythm),
    { id: uid(), ...rhythm, notes: note ? [note] : [] },
  ];
  if (events.length > 64)
    throw new Error("В такте может быть не больше 64 событий.");
  return {
    ...score,
    measures: score.measures.map((bar, m) =>
      m === cursor.measure ? { ...bar, events } : bar,
    ),
  };
}

export function readFretDigit(
  previous: string,
  digit: string,
): { text: string; fret: number } {
  const combined = previous + digit;
  const text =
    combined.length <= 2 && Number(combined) <= 24 ? combined : digit;
  return { text, fret: Number(text) };
}
