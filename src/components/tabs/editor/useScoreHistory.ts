import { useRef, useState } from "react";
import type { TabScore } from "../../../lib/tabTypes";

export function useScoreHistory(
  score: TabScore,
  onChange: (score: TabScore) => void,
) {
  const undoStack = useRef<TabScore[]>([]);
  const redoStack = useRef<TabScore[]>([]);
  const [, refresh] = useState(0);
  function commit(next: TabScore) {
    if (next === score) return;
    undoStack.current = [...undoStack.current.slice(-99), score];
    redoStack.current = [];
    onChange(next);
    refresh((n) => n + 1);
  }
  function travel(from: typeof undoStack, to: typeof undoStack) {
    const next = from.current.pop();
    if (!next) return;
    to.current.push(score);
    onChange(next);
    refresh((n) => n + 1);
  }
  return {
    commit,
    undo: () => travel(undoStack, redoStack),
    redo: () => travel(redoStack, undoStack),
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
  };
}
