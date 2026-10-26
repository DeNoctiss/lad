import { useState } from "react";
export function usePreference<T extends string | number>(
  key: string,
  fallback: T,
  allowed: readonly T[],
) {
  const storageKey = `lad-ui-${key}`;
  const [value, update] = useState<T>(() => {
    try {
      const saved: unknown = JSON.parse(
        localStorage.getItem(storageKey) ?? "null",
      );
      return allowed.includes(saved as T) ? (saved as T) : fallback;
    } catch {
      return fallback;
    }
  });
  const set = (next: T) => {
    update(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* Optional UI preference. */
    }
  };
  return [value, set] as const;
}
