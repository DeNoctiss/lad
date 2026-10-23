import { describe, expect, it } from "vitest";
import { dragVocalNote, sameVocalNote } from "./rollEditing";
import { placeNote } from "./model";
const n = { id: "main", start: 2, duration: 2, midi: 60 };
describe("piano roll gestures", () => {
  it("resizes either edge in either direction, keeping the opposite edge and pitch", () => {
    for (const delta of [-0.5, 0.5]) {
      const left = dragVocalNote(n, "resize-start", delta, 4, 0.25, 16);
      expect(left.start).toBe(2 + delta);
      expect(left.start + left.duration).toBe(4);
      expect(left.midi).toBe(60);
      const right = dragVocalNote(n, "resize-end", delta, 4, 0.25, 16);
      expect(right.start).toBe(2);
      expect(right.duration).toBe(2 + delta);
      expect(right.midi).toBe(60);
    }
  });
  it("clamps both edges without crossing or leaving the timeline", () => {
    expect(dragVocalNote(n, "resize-start", -999, 0, 0.25, 16)).toMatchObject({
      start: 0,
      duration: 4,
    });
    expect(dragVocalNote(n, "resize-start", 999, 0, 0.25, 16)).toMatchObject({
      start: 3.75,
      duration: 0.25,
    });
    expect(dragVocalNote(n, "resize-end", -999, 0, 0.25, 16)).toMatchObject({
      start: 2,
      duration: 0.25,
    });
    expect(dragVocalNote(n, "resize-end", 999, 0, 0.25, 16)).toMatchObject({
      start: 2,
      duration: 14,
    });
  });
  it("moves without changing duration and clamps pitch and time", () => {
    expect(dragVocalNote(n, "move", 0.4, 2, 0.25, 16)).toMatchObject({
      start: 2.5,
      duration: 2,
      midi: 62,
    });
    expect(dragVocalNote(n, "move", -999, -999, 0.25, 16)).toMatchObject({
      start: 0,
      midi: 21,
    });
    expect(dragVocalNote(n, "move", 999, 999, 0.25, 16)).toMatchObject({
      start: 14,
      midi: 108,
    });
  });
  it("preserves off-grid timing on vertical-only moves and short imported notes", () => {
    const short = { ...n, start: 2.137, duration: 0.087 };
    expect(dragVocalNote(short, "move", 0, 1, 1, 16)).toEqual({
      ...short,
      midi: 61,
    });
    const result = dragVocalNote(short, "resize-start", 999, 0, 1, 16);
    expect(result.duration).toBeCloseTo(0.087);
    expect(result.start + result.duration).toBeCloseTo(2.224);
  });
  it("snaps a resized edge to triplets, preserving its opposite edge", () => {
    const result = dragVocalNote(
      { ...n, start: 2.11, duration: 1.89 },
      "resize-start",
      -0.4,
      0,
      1 / 3,
      16,
    );
    expect(result.start).toBeCloseTo(5 / 3);
    expect(result.start + result.duration).toBeCloseTo(4);
  });
  it("resolves overlaps without mutating originals, so undo can restore them", () => {
    const earlier = { ...n, id: "earlier", start: 0 };
    const notes = [earlier, n];
    const resized = dragVocalNote(n, "resize-start", -1, 0, 0.25, 16);
    expect(
      placeNote(notes, resized).find((x) => x.id === "earlier")?.duration,
    ).toBe(1);
    expect(earlier.duration).toBe(2);
    expect(sameVocalNote(n, { ...n })).toBe(true);
    expect(sameVocalNote(n, resized)).toBe(false);
  });
});
