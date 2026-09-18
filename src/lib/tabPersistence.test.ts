import { describe, expect, it } from "vitest";
import { validateLibrary } from "./model";
import { initialLibrary } from "./seed";

const libraryWithPart = (extra: Record<string, unknown>) => {
  const library = structuredClone(initialLibrary);
  Object.assign(library.songs[0].parts[0], extra);
  return library;
};
const score = {
  version: 1,
  kind: "guitar",
  meter: { beats: 4, unit: 4 },
  measures: [
    {
      id: "bar-1",
      events: [
        {
          id: "event-1",
          duration: 4,
          dotted: false,
          triplet: false,
          notes: [{ lane: "1", fret: 5, effects: [] }],
        },
      ],
    },
  ],
};

describe("visual part persistence", () => {
  it("preserves all legacy ASCII content unchanged", () => {
    const library = structuredClone(initialLibrary);
    expect(validateLibrary(JSON.parse(JSON.stringify(library)))).toEqual(
      library,
    );
  });
  it("round-trips structured notes alongside the original text", () => {
    const library = libraryWithPart({ format: "visual", score });
    expect(validateLibrary(JSON.parse(JSON.stringify(library)))).toEqual(
      library,
    );
    expect(library.songs[0].parts[0].content).toContain("e |");
  });
  it("retains both representations when plain text is selected", () => {
    const library = libraryWithPart({ format: "text", score });
    expect(validateLibrary(library)).toEqual(library);
  });
  it.each(["canvas", null, 4])(
    "rejects unsupported part format %j",
    (format) => {
      expect(() => validateLibrary(libraryWithPart({ format }))).toThrow();
    },
  );
  it("requires a score when the visual format is active", () => {
    expect(() =>
      validateLibrary(libraryWithPart({ format: "visual" })),
    ).toThrow();
  });
  it.each([null, {}, { ...score, kind: "drums" }, { ...score, measures: [] }])(
    "validates optional structured data %j",
    (invalid) => {
      expect(() =>
        validateLibrary(libraryWithPart({ score: invalid })),
      ).toThrow();
    },
  );
  it("rejects overflowing bars during backup import", () => {
    const invalid = structuredClone(score);
    invalid.measures[0].events = Array.from({ length: 5 }, (_, i) => ({
      ...invalid.measures[0].events[0],
      id: `note-${i}`,
    }));
    expect(() =>
      validateLibrary(libraryWithPart({ format: "visual", score: invalid })),
    ).toThrow();
  });
});
