import { OPEN, type LickNote } from "./model";
import type { Pitch } from "../vocal/pitch";
export type PracticeStep = { midi: number; noteIndex: number; label: string };
export function practiceSteps(notes: LickNote[]): PracticeStep[] {
  return notes.flatMap((n, noteIndex) => {
    const base = OPEN[n.string] + n.fret,
      s = (midi: number, label: string) => ({ midi, noteIndex, label });
    if (
      ["slide", "hammer", "pull"].includes(n.technique) &&
      n.target !== undefined
    )
      return [
        s(base, "Начальная нота"),
        s(OPEN[n.string] + n.target, "Целевая нота перехода"),
      ];
    if (n.technique === "bend")
      return [s(base, "До бенда"), s(base + 2, "Бенд на тон")];
    if (n.technique === "release")
      return [s(base + 2, "Подтянутая нота"), s(base, "Возврат бенда")];
    if (n.technique === "prebend")
      return [s(base + 2, "Предварительный бенд на тон")];
    return [
      s(base, n.technique === "vibrato" ? "Основная высота вибрато" : "Нота"),
    ];
  });
}
export type FollowStatus =
  | "listening"
  | "uncertain"
  | "low"
  | "high"
  | "holding"
  | "repeat"
  | "complete";
export type FollowResult = {
  index: number;
  status: FollowStatus;
  cents: number | null;
  accepted: boolean;
};
export class LickFollower {
  index = 0;
  private stableAt: number | null = null;
  private quietAt: number | null = null;
  private armed = true;
  private lastAccepted = -Infinity;
  private previousRms = 0;
  constructor(
    readonly steps: PracticeStep[],
    readonly tolerance = 45,
  ) {}
  seek(index = 0) {
    this.index = Math.max(0, Math.min(index, this.steps.length));
    this.stableAt = this.quietAt = null;
    this.armed = true;
    this.previousRms = 0;
    this.lastAccepted = -Infinity;
  }
  update(p: Pitch, now: number): FollowResult {
    const result = (
      status: FollowStatus,
      cents: number | null = null,
      accepted = false,
    ): FollowResult => ({ index: this.index, status, cents, accepted });
    if (this.index >= this.steps.length) return result("complete");
    const attack =
      p.rms > Math.max(0.012, this.previousRms * 1.8) &&
      now - this.lastAccepted > 180;
    this.previousRms = p.rms;
    if (p.rms < 0.006) {
      this.quietAt ??= now;
      if (now - this.quietAt >= 80) this.armed = true;
      this.stableAt = null;
      return result("listening");
    }
    this.quietAt = null;
    if (attack) this.armed = true;
    if (p.midi === null || p.confidence < 0.85) {
      this.stableAt = null;
      return result("uncertain");
    }
    const cents = (p.midi - this.steps[this.index].midi) * 100;
    if (Math.abs(cents) > this.tolerance) {
      this.stableAt = null;
      return result(cents < 0 ? "low" : "high", cents);
    }
    if (!this.armed) return result("repeat", cents);
    this.stableAt ??= now;
    if (now - this.stableAt < 150) return result("holding", cents);
    const previous = this.steps[this.index].midi;
    this.index++;
    this.lastAccepted = now;
    this.stableAt = null;
    this.armed = this.steps[this.index]?.midi !== previous;
    return result(
      this.index === this.steps.length ? "complete" : "listening",
      cents,
      true,
    );
  }
}
