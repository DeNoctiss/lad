import { useEffect, useState } from "react";
import type { RefObject } from "react";
import { scoreLayout } from "../../../lib/scoreLayout";

/** Measure the actual score container, including changes to drawers and panels. */
export function useScoreLayout(
  ref: RefObject<HTMLElement | null>,
  minimum: number,
  count: number,
) {
  const [available, setAvailable] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setAvailable(Math.max(0, Math.floor(entry.contentRect.width) - 2));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return scoreLayout(available, minimum, count);
}
