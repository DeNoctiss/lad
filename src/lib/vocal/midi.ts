import { MAX_BEATS, MAX_NOTES, MAX_MIDI, MIN_MIDI, noteId } from "./model";
import type { VocalNote } from "./model";
export type MidiTrack = { name: string; notes: VocalNote[]; channel: number };
export type MidiImport = {
  tracks: MidiTrack[];
  bpm: number;
  meter: { beats: number; unit: 4 | 8 };
  warnings: string[];
};
/** Strict SMF format 0/1 reader. Tempo map is converted to a constant-BPM beat clock. */
export function readMidi(buffer: ArrayBuffer): MidiImport {
  if (buffer.byteLength > 5 * 1024 * 1024) throw new Error("MIDI больше 5 МБ");
  const v = new DataView(buffer);
  let p = 0;
  const ensure = (n: number) => {
    if (p + n > v.byteLength) throw new Error("MIDI обрезан или повреждён");
  };
  const u8 = () => {
    ensure(1);
    return v.getUint8(p++);
  };
  const u16 = () => {
    ensure(2);
    const n = v.getUint16(p);
    p += 2;
    return n;
  };
  const u32 = () => {
    ensure(4);
    const n = v.getUint32(p);
    p += 4;
    return n;
  };
  const tag = () => String.fromCharCode(u8(), u8(), u8(), u8());
  const variable = () => {
    let n = 0;
    for (let i = 0; i < 4; i++) {
      const b = u8();
      n = n * 128 + (b & 127);
      if (!(b & 128)) return n;
    }
    throw new Error("Неверная длина MIDI-события");
  };
  if (tag() !== "MThd") throw new Error("Это не MIDI-файл");
  const headerLength = u32();
  if (headerLength < 6) throw new Error("Повреждён заголовок MIDI");
  const format = u16(),
    count = u16(),
    division = u16();
  if (format > 1 || !division || division & 0x8000 || count > 256 || !count)
    throw new Error("Поддерживаются MIDI 0/1 с PPQ, без SMPTE");
  ensure(headerLength - 6);
  p += headerLength - 6;
  const tempos: { tick: number; micro: number }[] = [
    { tick: 0, micro: 500000 },
  ];
  let meter: MidiImport["meter"] = { beats: 4, unit: 4 };
  const raw: {
    name: string;
    channel: number;
    notes: { midi: number; start: number; duration: number }[];
  }[] = [];
  let noteCount = 0,
    ignored = false;
  for (let t = 0; t < count; t++) {
    if (tag() !== "MTrk") throw new Error("Не найдена MIDI-дорожка");
    const size = u32(),
      end = p + size;
    ensure(size);
    let tick = 0,
      running = 0,
      name = "Дорожка " + (t + 1);
    const active = new Map<string, number[]>();
    const channels = new Map<number, (typeof raw)[number]["notes"]>();
    while (p < end) {
      tick += variable();
      let status = u8();
      if (status < 0x80) {
        p--;
        if (!running) throw new Error("Неверный running status MIDI");
        status = running;
      }
      if (status === 0xff) {
        const type = u8(),
          len = variable();
        ensure(len);
        if (p + len > end) throw new Error("MIDI-событие выходит за дорожку");
        if (type === 3)
          name =
            new TextDecoder()
              .decode(new Uint8Array(buffer, p, len))
              .trim()
              .slice(0, 150) || name;
        if (type === 0x51 && len === 3) {
          const micro =
            v.getUint8(p) * 65536 + v.getUint8(p + 1) * 256 + v.getUint8(p + 2);
          if (micro) tempos.push({ tick, micro });
        }
        if (type === 0x58 && len >= 2 && tick === 0) {
          const b = v.getUint8(p),
            unit = 2 ** v.getUint8(p + 1);
          if (b >= 1 && b <= 12 && (unit === 4 || unit === 8))
            meter = { beats: b, unit };
        }
        p += len;
        if (type === 0x2f) {
          p = end;
          break;
        }
        continue;
      }
      if (status === 0xf0 || status === 0xf7) {
        running = 0;
        const len = variable();
        ensure(len);
        p += len;
        continue;
      }
      if (status >= 0xf0)
        throw new Error("Неподдерживаемое системное MIDI-событие");
      running = status;
      const kind = status & 0xf0,
        channel = status & 15,
        a = u8(),
        b = kind === 0xc0 || kind === 0xd0 ? 0 : u8();
      if (a > 127 || b > 127 || p > end)
        throw new Error("Повреждённые MIDI-данные");
      if (channel === 9) continue; // percussion is not a vocal melody
      const key = channel + ":" + a;
      if (kind === 0x90 && b > 0) {
        const stack = active.get(key) ?? [];
        stack.push(tick);
        active.set(key, stack);
      }
      if (kind === 0x80 || (kind === 0x90 && b === 0)) {
        const start = active.get(key)?.shift();
        if (start !== undefined && tick > start) {
          if (a < MIN_MIDI || a > MAX_MIDI) {
            ignored = true;
            continue;
          }
          if (++noteCount > MAX_NOTES)
            throw new Error(
              "В MIDI больше 10 000 нот; импортируйте один фрагмент",
            );
          const ns = channels.get(channel) ?? [];
          ns.push({ midi: a, start, duration: tick - start });
          channels.set(channel, ns);
        }
      }
    }
    if (p > end) throw new Error("Повреждён размер MIDI-дорожки");
    for (const [channel, notes] of channels)
      raw.push({
        name: name + (channels.size > 1 ? " · канал " + (channel + 1) : ""),
        channel,
        notes,
      });
  }
  const sorted = tempos
    .sort((a, b) => a.tick - b.tick)
    .filter((x, i, a) => i === a.length - 1 || x.tick !== a[i + 1].tick);
  const bpm = Math.max(
    20,
    Math.min(300, Math.round(60000000 / sorted[0].micro)),
  );
  const beatAt = (tick: number) => {
    let seconds = 0;
    for (let i = 0; i < sorted.length; i++) {
      const a = sorted[i],
        end = Math.min(tick, sorted[i + 1]?.tick ?? tick);
      if (end > a.tick)
        seconds += (((end - a.tick) / division) * a.micro) / 1e6;
      if (end === tick) break;
    }
    return (seconds * bpm) / 60;
  };
  const tracks = raw
    .map((t) => ({
      ...t,
      notes: t.notes
        .map((n) => ({
          id: noteId(),
          midi: n.midi,
          start: beatAt(n.start),
          duration: beatAt(n.start + n.duration) - beatAt(n.start),
        }))
        .filter((n) => n.duration >= 1 / 64),
    }))
    .filter((t) => t.notes.length);
  if (!tracks.length)
    throw new Error(
      "В MIDI нет завершённых мелодических нот A0–C8 (ударные пропущены)",
    );
  if (tracks.some((t) => t.notes.some((n) => n.start + n.duration > MAX_BEATS)))
    throw new Error("MIDI длиннее 4096 долей; выберите короткий фрагмент");
  const warnings = [
    "Ударные, sustain-педаль, pitch bend и MIDI-эффекты не переносятся.",
  ];
  if (sorted.length > 1)
    warnings.push(
      "Изменения темпа пересчитаны в сетку " +
        bpm +
        " BPM с сохранением времени звучания.",
    );
  if (ignored) warnings.push("Ноты за пределами A0–C8 пропущены.");
  return { tracks, bpm, meter, warnings };
}
