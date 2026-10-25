/** Coverage of the candidate, not of the selected notes. */
export function matchPercent(matches: number, total: number): number {
  return total > 0 ? Math.round((matches / total) * 100) : 0;
}
export function compareNoteMatches(
  a: { matches: number; total: number; extra: number[] },
  b: { matches: number; total: number; extra: number[] },
): number {
  return (
    (b.total ? b.matches / b.total : 0) - (a.total ? a.matches / a.total : 0) ||
    a.extra.length - b.extra.length ||
    b.matches - a.matches
  );
}
