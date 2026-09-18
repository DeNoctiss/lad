import { describe, expect, it } from "vitest";
import { buildTimeline, laneLabels, laneTunings } from "./playback";
import { parseNotation } from "./tablature";
import type { TabScore } from "./tabTypes";

const GUITAR_TUNING = laneTunings("guitar", "E A D G B e");

function guitarScore(notation: string): TabScore {
  return parseNotation(notation, "guitar", { beats: 4, unit: 4 });
}

describe("laneTunings", () => {
  it("returns standard tuning for guitar", () => {
    const t = laneTunings("guitar", "E A D G B e");
    expect(t.get("6")).toBe(40); // low E
    expect(t.get("5")).toBe(45); // A
    expect(t.get("4")).toBe(50); // D
    expect(t.get("3")).toBe(55); // G
    expect(t.get("2")).toBe(59); // B
    expect(t.get("1")).toBe(64); // high e
  });

  it("handles drop D", () => {
    const t = laneTunings("guitar", "D A D G B e");
    expect(t.get("6")).toBe(38); // low E dropped to D
    expect(t.get("1")).toBe(64);
  });

  it("returns standard tuning for bass", () => {
    const t = laneTunings("bass", "E A D G");
    expect(t.get("4")).toBe(28); // low E
    expect(t.get("1")).toBe(43); // G
  });

  it("returns empty map for drums and piano", () => {
    expect(laneTunings("drums", "HH SD BD").size).toBe(0);
    expect(laneTunings("piano", "").size).toBe(0);
  });
});

describe("laneLabels", () => {
  const guitarFallback = new Map([
    ["1", "e"],
    ["2", "B"],
    ["3", "G"],
    ["4", "D"],
    ["5", "A"],
    ["6", "E"],
  ]);

  it("maps standard tuning tokens to lanes", () => {
    const labels = laneLabels("guitar", "E A D G B e", guitarFallback);
    expect(labels.get("6")).toBe("E");
    expect(labels.get("1")).toBe("e");
  });

  it("reflects drop D on the lowest string", () => {
    const labels = laneLabels("guitar", "D A D G B e", guitarFallback);
    expect(labels.get("6")).toBe("D");
    expect(labels.get("1")).toBe("e");
  });

  it("keeps fallback when tuning text is not parseable", () => {
    const labels = laneLabels("guitar", "стандартный", guitarFallback);
    expect(labels.get("6")).toBe("E");
  });

  it("supports bass tuning", () => {
    const bassFallback = new Map([
      ["1", "G"],
      ["2", "D"],
      ["3", "A"],
      ["4", "E"],
    ]);
    const labels = laneLabels("bass", "D A D G", bassFallback);
    expect(labels.get("4")).toBe("D");
    expect(labels.get("1")).toBe("G");
  });
});

describe("buildTimeline", () => {
  it("schedules single notes at correct ticks", () => {
    const score = guitarScore("| 1:0@4 1:2@4 |");
    const { notes } = buildTimeline(score, GUITAR_TUNING, 120);
    expect(notes).toHaveLength(2);
    expect(notes[0].midi).toBe(64); // e string open
    expect(notes[0].startTick).toBe(0);
    expect(notes[1].midi).toBe(66); // e string fret 2
    expect(notes[1].startTick).toBe(480);
  });

  it("extends duration across tied notes", () => {
    const score = guitarScore("| 1:5~tie@4 1:5@4 |");
    const { notes } = buildTimeline(score, GUITAR_TUNING, 120);
    expect(notes).toHaveLength(1);
    expect(notes[0].endTick).toBe(960); // tied through second event
  });

  it("keeps hammer-on targets as separate notes", () => {
    const score = guitarScore("| 1:5~h@4 1:7@4 |");
    const { notes } = buildTimeline(score, GUITAR_TUNING, 120);
    expect(notes).toHaveLength(2);
    expect(notes[0].midi).toBe(69); // e string fret 5 = A4
    expect(notes[1].midi).toBe(71); // fret 7
    expect(notes[1].legato).toBe(true);
  });

  it("converts slides into waypoints", () => {
    const score = guitarScore("| 1:5~/@4 1:7@4 |");
    const { notes } = buildTimeline(score, GUITAR_TUNING, 120);
    expect(notes).toHaveLength(1);
    expect(notes[0].midi).toBe(69);
    expect(notes[0].waypoints).toHaveLength(1);
    expect(notes[0].waypoints[0].midi).toBe(71);
    expect(notes[0].waypoints[0].tick).toBe(480);
    expect(notes[0].endTick).toBe(960);
  });

  it("merges simultaneous notes into one event mark", () => {
    const score = guitarScore("| [1:0,2:1,3:2]@4 1:0@4 |");
    const { notes, marks } = buildTimeline(score, GUITAR_TUNING, 120);
    expect(notes).toHaveLength(4);
    expect(marks).toHaveLength(2);
    expect(marks[0].tick).toBe(0);
    expect(marks[1].tick).toBe(480);
  });

  it("computes correct timing for BPM", () => {
    const score = guitarScore("| 1:0@4 1:0@4 |");
    const { totalSeconds, secPerTick } = buildTimeline(
      score,
      GUITAR_TUNING,
      120,
    );
    // One 4/4 measure at 120 BPM = 2 seconds (4 beats × 0.5s)
    expect(totalSeconds).toBeCloseTo(2, 2);
    expect(secPerTick).toBeCloseTo(60 / 120 / 480, 5);
  });

  it("handles muted strings", () => {
    const score = guitarScore("| 6:x@4 1:0@4 |");
    const { notes } = buildTimeline(score, GUITAR_TUNING, 120);
    expect(notes).toHaveLength(2);
    expect(notes[0].muted).toBe(true);
    expect(notes[1].muted).toBe(false);
  });

  it("handles bends", () => {
    const score = guitarScore("| 1:5~b1@2 |");
    const { notes } = buildTimeline(score, GUITAR_TUNING, 120);
    expect(notes).toHaveLength(1);
    expect(notes[0].bend).toBe(2);
  });

  it("handles ghost and accent velocities", () => {
    const score = guitarScore("| 1:5~ghost@4 1:7~accent@4 |");
    const { notes } = buildTimeline(score, GUITAR_TUNING, 120);
    expect(notes[0].velocity).toBeCloseTo(0.35);
    expect(notes[1].velocity).toBeCloseTo(1.35);
  });

  it("marks each event with measure and index", () => {
    const score = guitarScore("| 1:0@4 1:0@4 | 1:0@4 |");
    const { marks } = buildTimeline(score, GUITAR_TUNING, 120);
    expect(marks).toHaveLength(3);
    expect(marks[0]).toEqual({ tick: 0, measure: 0, event: 0 });
    expect(marks[1]).toEqual({ tick: 480, measure: 0, event: 1 });
    expect(marks[2]).toEqual({ tick: 1920, measure: 1, event: 0 });
  });

  it("handles underfilled measures", () => {
    const score = guitarScore("| 1:0@4 | 1:0@4 |");
    const { marks, totalTicks } = buildTimeline(score, GUITAR_TUNING, 120);
    // Each measure gets full capacity (1920 ticks) even if underfilled
    expect(totalTicks).toBe(3840);
    expect(marks[1].tick).toBe(1920);
  });
});
