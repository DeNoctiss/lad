import { describe, expect, it, vi } from "vitest";
import {
  emptyTab,
  extractChords,
  parseLyricLine,
  uid,
  validateLibrary,
} from "./model";
import { initialLibrary } from "./seed";

const freshLibrary = () => {
  const library = structuredClone(initialLibrary);
  if (library.chords.length < 2) {
    library.chords = [
      {
        id: "test-chord-0",
        name: "Test",
        frets: [-1, 3, 2, 0, 1, 0],
        baseFret: 1,
      },
      {
        id: "test-chord-1",
        name: "Test2",
        frets: [0, 2, 2, 1, 0, 0],
        baseFret: 1,
      },
    ];
  }
  return library;
};

const invalidFields = (fields: string[]) =>
  fields.flatMap((field) =>
    [undefined, null, 42, false, [], {}].map((value) => ({ field, value })),
  );

describe("uid", () => {
  it("generates unique IDs in a secure context", () => {
    const ids = Array.from({ length: 100 }, uid);
    expect(new Set(ids).size).toBe(100);
    expect(ids.every((id) => /^[0-9a-f-]{36}$/.test(id))).toBe(true);
  });

  it("supports HTTP tablet access when randomUUID is unavailable", () => {
    const getRandomValues = crypto.getRandomValues.bind(crypto);
    vi.stubGlobal("crypto", { getRandomValues });
    try {
      const ids = Array.from({ length: 100 }, uid);
      expect(new Set(ids).size).toBe(100);
      expect(
        ids.every((id) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
            id,
          ),
        ),
      ).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("extractChords", () => {
  it("trims chord names and deduplicates in first-appearance order across lines", () => {
    expect(
      extractChords("[ Am ]one [F]two [Am]\n[ C/G\t]three [F] [C/G] [G7]"),
    ).toEqual(["Am", "F", "C/G", "G7"]);
  });

  it.each(["", "Plain lyrics", "[] [ ] [\t]", "[Am\nF]", "[Am unfinished"])(
    "ignores missing or empty chord markers in %j",
    (lyrics) => {
      expect(extractChords(lyrics)).toEqual([]);
    },
  );

  it("preserves spelling, case, accidentals, and chord suffixes", () => {
    expect(extractChords("[C#maj7] [Bb/D] [Am] [am] [C#maj7]")).toEqual([
      "C#maj7",
      "Bb/D",
      "Am",
      "am",
    ]);
  });

  it("extracts the seeded song chord list", () => {
    for (const song of initialLibrary.songs) {
      expect(extractChords(song.lyrics)).toEqual(song.chords);
    }
  });
});

describe("parseLyricLine", () => {
  it("positions trimmed chords before their following text and preserves leading text", () => {
    expect(parseLyricLine("Intro  [ Am ]hello [F]world [ G7 ]")).toEqual([
      { chord: "", text: "Intro  " },
      { chord: "Am", text: "hello " },
      { chord: "F", text: "world " },
      { chord: "G7", text: "" },
    ]);
  });

  it("preserves adjacent chords with no intervening lyrics", () => {
    expect(parseLyricLine("[Am][F]word[C]")).toEqual([
      { chord: "Am", text: "" },
      { chord: "F", text: "word" },
      { chord: "C", text: "" },
    ]);
  });

  it.each([
    { line: "[Am]", chunks: [{ chord: "Am", text: "" }] },
    {
      line: "[Am] [F]",
      chunks: [
        { chord: "Am", text: " " },
        { chord: "F", text: "" },
      ],
    },
    { line: "", chunks: [{ chord: "", text: "" }] },
    { line: "  \t", chunks: [{ chord: "", text: "  \t" }] },
    { line: "{Куплет 1}", chunks: [{ chord: "", text: "{Куплет 1}" }] },
    {
      line: "text [] [unfinished",
      chunks: [{ chord: "", text: "text [] [unfinished" }],
    },
  ])(
    "handles chord-only, empty, or unmarked line $line",
    ({ line, chunks }) => {
      expect(parseLyricLine(line)).toEqual(chunks);
    },
  );

  it.each([
    { line: "До [ Am ]слова [F]после", text: "До слова после" },
    { line: "[C]  Hello, [G]world!  ", text: "  Hello, world!  " },
    { line: "a[ ]b[Am]c", text: "abc" },
  ])(
    "reconstructs lyric text without losing whitespace in $line",
    ({ line, text }) => {
      expect(
        parseLyricLine(line)
          .map((chunk) => chunk.text)
          .join(""),
      ).toBe(text);
    },
  );

  it("round-trips every seeded lyric line including chord positions", () => {
    for (const song of initialLibrary.songs) {
      for (const line of song.lyrics.split("\n")) {
        const reconstructed = parseLyricLine(line)
          .map(({ chord, text }) => `${chord ? `[${chord}]` : ""}${text}`)
          .join("");
        expect(reconstructed).toBe(line);
      }
    }
  });
});

describe("validateLibrary", () => {
  it("accepts the complete seed without mutating or replacing it", () => {
    const library = freshLibrary();
    const before = structuredClone(library);
    expect(validateLibrary(library)).toBe(library);
    expect(library).toEqual(before);
  });

  it("accepts empty collections", () => {
    const library = { version: 1, bands: [], songs: [], chords: [] };
    expect(validateLibrary(library)).toBe(library);
  });

  it.each(
    [
      undefined,
      null,
      false,
      1,
      "library",
      [],
      {},
      { version: 2, bands: [], songs: [], chords: [] },
    ].map((value) => ({ value })),
  )("rejects malformed library $value", ({ value }) => {
    expect(() => validateLibrary(value)).toThrow(
      "Неверный формат резервной копии",
    );
  });

  for (const collection of ["bands", "songs", "chords"] as const) {
    it.each([undefined, null, {}, "not an array"])(
      `rejects malformed ${collection} collection %j`,
      (value) => {
        const library = freshLibrary();
        Object.assign(library, { [collection]: value });
        expect(() => validateLibrary(library)).toThrow(
          "Неверный формат резервной копии",
        );
      },
    );

    it.each([undefined, null, [], {}, "entry", 42].map((value) => ({ value })))(
      `rejects malformed nested ${collection} entry $value`,
      ({ value }) => {
        const library = freshLibrary();
        Object.assign(library, { [collection]: [value] });
        expect(() => validateLibrary(library)).toThrow();
      },
    );

    it(`rejects duplicate ${collection} identifiers`, () => {
      const library = freshLibrary();
      if (collection === "bands") library.songs = [];
      library[collection][1].id = library[collection][0].id;
      expect(() => validateLibrary(library)).toThrow(
        "Повторяющиеся идентификаторы",
      );
    });

    it(`rejects empty ${collection} identifiers`, () => {
      const library = freshLibrary();
      if (collection === "bands") library.songs = [];
      library[collection][0].id = "";
      expect(() => validateLibrary(library)).toThrow(
        "Повторяющиеся идентификаторы",
      );
    });
  }

  it("rejects an orphan song bandId", () => {
    const library = freshLibrary();
    library.songs[0].bandId = "missing-band";
    expect(() => validateLibrary(library)).toThrow("Некорректные данные песни");
  });

  it.each(invalidFields(["id", "name", "genre", "color", "initials"]))(
    "rejects band field $field = $value",
    ({ field, value }) => {
      const library = freshLibrary();
      Object.assign(library.bands[0], { [field]: value });
      expect(() => validateLibrary(library)).toThrow(
        "Некорректные данные группы",
      );
    },
  );

  it.each(
    invalidFields(["id", "bandId", "title", "key", "lyrics", "updatedAt"]),
  )("rejects song field $field = $value", ({ field, value }) => {
    const library = freshLibrary();
    Object.assign(library.songs[0], { [field]: value });
    expect(() => validateLibrary(library)).toThrow("Некорректные данные песни");
  });

  it.each([
    ...[19, 301, 92.5, NaN, Infinity, "92", null, undefined].map((value) => ({
      field: "bpm",
      value,
    })),
    ...[-1, 13, 1.5, NaN, Infinity, "2", null, undefined].map((value) => ({
      field: "capo",
      value,
    })),
    ...[0, 1, "true", null, undefined].map((value) => ({
      field: "favorite",
      value,
    })),
    ...[null, {}, "Am", [1], [null], ["Am", false]].map((value) => ({
      field: "chords",
      value,
    })),
    ...[undefined, null, {}, "part"].map((value) => ({
      field: "parts",
      value,
    })),
  ])("rejects invalid song $field = $value", ({ field, value }) => {
    const library = freshLibrary();
    Object.assign(library.songs[0], { [field]: value });
    expect(() => validateLibrary(library)).toThrow("Некорректные данные песни");
  });

  it.each([undefined, null, [], {}, "part", 42].map((value) => ({ value })))(
    "rejects malformed nested tab part $value",
    ({ value }) => {
      const library = freshLibrary();
      Object.assign(library.songs[0], { parts: [value] });
      expect(() => validateLibrary(library)).toThrow("Некорректная партия");
    },
  );

  it.each(invalidFields(["id", "name", "instrument", "tuning", "content"]))(
    "rejects part field $field = $value",
    ({ field, value }) => {
      const library = freshLibrary();
      Object.assign(library.songs[0].parts[0], { [field]: value });
      expect(() => validateLibrary(library)).toThrow("Некорректная партия");
    },
  );

  it.each(["", " ", "\t\n"])("rejects blank part name %j", (name) => {
    const library = freshLibrary();
    library.songs[0].parts[0].name = name;
    expect(() => validateLibrary(library)).toThrow("Некорректная партия");
  });

  it("accepts a part name with surrounding whitespace without changing it", () => {
    const library = freshLibrary();
    library.songs[0].parts[0].name = "  Куплет  ";
    expect(validateLibrary(library).songs[0].parts[0].name).toBe("  Куплет  ");
  });

  it.each(["", "rhythm"])(
    "rejects empty or duplicate part identifier %j",
    (id) => {
      const library = freshLibrary();
      library.songs[0].parts[1].id = id;
      expect(() => validateLibrary(library)).toThrow("Повторяющиеся партии");
    },
  );

  it.each(invalidFields(["id", "name"]))(
    "rejects chord field $field = $value",
    ({ field, value }) => {
      const library = freshLibrary();
      Object.assign(library.chords[0], { [field]: value });
      expect(() => validateLibrary(library)).toThrow(
        "Некорректная аппликатура",
      );
    },
  );

  it.each([
    ...[undefined, null, "1", 0, 21, 1.5, NaN, Infinity].map((value) => ({
      field: "baseFret",
      value,
    })),
    ...[
      undefined,
      null,
      {},
      "000000",
      [],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [-2, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 25],
      [0, 0, 1.5, 0, 0, 0],
      [0, 0, 0, "0", 0, 0],
      [0, 0, 0, null, 0, 0],
      [NaN, 0, 0, 0, 0, 0],
      [0, Infinity, 0, 0, 0, 0],
    ].map((value) => ({ field: "frets", value })),
  ])("rejects invalid chord $field = $value", ({ field, value }) => {
    const library = freshLibrary();
    Object.assign(library.chords[0], { [field]: value });
    expect(() => validateLibrary(library)).toThrow("Некорректная аппликатура");
  });

  it.each([
    { baseFret: 1, frets: [-1, 0, 1, 3, 5, 6] },
    { baseFret: 5, frets: [-1, 0, 4, 5, 7, 9] },
    { baseFret: 5, frets: [-1, 0, 5, 7, 9, 10] },
    { baseFret: 20, frets: [-1, 0, 19, 20, 23, 24] },
  ])(
    "rejects positive frets outside the five displayed frets at base $baseFret: $frets",
    ({ baseFret, frets }) => {
      const library = freshLibrary();
      Object.assign(library.chords[0], { baseFret, frets });
      expect(() => validateLibrary(library)).toThrow(
        "Некорректная аппликатура",
      );
    },
  );

  it.each([1, 5, 20])(
    "accepts open and muted strings with both displayed boundaries at base %i",
    (baseFret) => {
      const library = freshLibrary();
      Object.assign(library.chords[0], {
        baseFret,
        frets: [-1, 0, baseFret, baseFret + 1, baseFret + 3, baseFret + 4],
      });
      expect(validateLibrary(library)).toBe(library);
    },
  );

  it.each(["", "  \t\n"])(
    "rejects blank band, song, and chord names %j",
    (name) => {
      const bandLibrary = freshLibrary();
      bandLibrary.bands[0].name = name;
      expect(() => validateLibrary(bandLibrary)).toThrow(
        "Некорректные данные группы",
      );
      const songLibrary = freshLibrary();
      songLibrary.songs[0].title = name;
      expect(() => validateLibrary(songLibrary)).toThrow(
        "Некорректные данные песни",
      );
      const chordLibrary = freshLibrary();
      chordLibrary.chords[0].name = name;
      expect(() => validateLibrary(chordLibrary)).toThrow(
        "Некорректная аппликатура",
      );
    },
  );

  it.each([
    { bpm: 20, capo: 0, baseFret: 1 },
    { bpm: 300, capo: 12, baseFret: 20 },
  ])(
    "accepts inclusive numeric boundaries $bpm/$capo/$baseFret",
    ({ bpm, capo, baseFret }) => {
      const library = freshLibrary();
      Object.assign(library.songs[0], { bpm, capo, chords: [], parts: [] });
      Object.assign(library.chords[0], {
        baseFret,
        frets: [-1, 0, baseFret, baseFret + 2, baseFret + 3, baseFret + 4],
      });
      expect(validateLibrary(library)).toBe(library);
    },
  );
});

describe("emptyTab", () => {
  it("returns a full drum-kit pattern", () => {
    expect(emptyTab("Барабаны")).toBe(
      "CC |----------------|\nSP |----------------|\nRD |----------------|\nHH |x-x-x-x-x-x-x-x-|\nHT |----------------|\nMT |----------------|\nSD |----o-------o---|\nLT |----------------|\nBD |o-------o-------|",
    );
  });

  it("returns four bass strings in tuning order", () => {
    expect(emptyTab("Бас-гитара")).toBe(
      "G |----------------|\nD |----------------|\nA |----------------|\nE |----------------|",
    );
  });

  it.each(["Ритм-гитара", "Соло-гитара", "Гитара", "unknown", ""])(
    "returns six guitar strings for %j",
    (instrument) => {
      expect(emptyTab(instrument)).toBe(
        "e |----------------|\nB |----------------|\nG |----------------|\nD |----------------|\nA |----------------|\nE |----------------|",
      );
    },
  );
});
