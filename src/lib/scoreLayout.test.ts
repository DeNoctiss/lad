import { describe, expect, it } from "vitest";
import { scoreLayout } from "./scoreLayout";

describe("score layout in the available workspace", () => {
  it("keeps a single readable bar on narrow viewports", () => {
    expect(scoreLayout(352, 480, 8)).toEqual({ columns: 1, width: 480 });
    expect(scoreLayout(840, 480, 8)).toEqual({ columns: 1, width: 838 });
  });
  it("adds a second column only when both full-size bars fit", () => {
    expect(scoreLayout(963, 480, 8).columns).toBe(1);
    const layout = scoreLayout(964, 480, 8);
    expect(layout).toEqual({ columns: 2, width: 480 });
    expect((layout.width + 2) * layout.columns).toBeLessThanOrEqual(964);
  });
  it("does not scale down dense notation or leave an empty second column", () => {
    expect(scoreLayout(1080, 840, 8)).toEqual({ columns: 1, width: 1078 });
    expect(scoreLayout(720, 840, 8)).toEqual({ columns: 1, width: 840 });
    expect(scoreLayout(1440, 480, 1)).toEqual({ columns: 1, width: 1438 });
    expect(scoreLayout(0, 480, 0)).toEqual({ columns: 1, width: 480 });
  });
});
