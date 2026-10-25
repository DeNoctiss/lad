import { KINDS, type ExerciseKind } from "./exercises";
export const PROGRESS_KEY = "lad-solfege-v1";
export type Attempt = {
  id: string;
  kind: ExerciseKind;
  level: number;
  outcome: "correct" | "incorrect" | "revealed";
  date: string;
};
export type Progress = { version: 1; attempts: Attempt[] };
export const emptyProgress = (): Progress => ({ version: 1, attempts: [] });
export function parseProgress(text: string): Progress {
  const p = JSON.parse(text);
  if (
    !p ||
    p.version !== 1 ||
    !Array.isArray(p.attempts) ||
    p.attempts.length > 5000 ||
    !p.attempts.every(
      (a: Attempt) =>
        a &&
        typeof a.id === "string" &&
        a.id.length < 100 &&
        KINDS.some((k) => k.id === a.kind) &&
        [1, 2, 3].includes(a.level) &&
        ["correct", "incorrect", "revealed"].includes(a.outcome) &&
        typeof a.date === "string" &&
        Number.isFinite(Date.parse(a.date)),
    ) ||
    new Set(p.attempts.map((a: Attempt) => a.id)).size !== p.attempts.length
  )
    throw new Error(
      "Некорректный файл прогресса. Сохранённые данные не изменены.",
    );
  return p;
}
export function addAttempt(p: Progress, a: Attempt): Progress {
  if (p.attempts.some((v) => v.id === a.id)) return p;
  return { version: 1, attempts: [...p.attempts, a].slice(-5000) };
}
export function stats(attempts: Attempt[]) {
  const answered = attempts.filter((a) => a.outcome !== "revealed");
  const correct = answered.filter((a) => a.outcome === "correct").length;
  return {
    total: attempts.length,
    answered: answered.length,
    correct,
    percent: answered.length
      ? Math.round((correct / answered.length) * 100)
      : null,
    revealed: attempts.length - answered.length,
  };
}
