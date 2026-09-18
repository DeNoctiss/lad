# Project conventions

- React 19 + TypeScript + Vite. Interface language: Russian.
- On this Windows workstation, invoke `npm.cmd` and `npx.cmd`; PowerShell blocks the `npm.ps1` shim. Do not change execution policy.
- Install dependencies with `npm.cmd ci`.
- Start with `npm.cmd run dev`. Vite uses port 5174 with strictPort; port 5173 belongs to another local project. Do not stop that project's server.
- `npm.cmd run build` runs TypeScript checking and the production build.
- `npm.cmd test` runs Vitest model tests.
- `npx.cmd playwright install chromium` installs the browser used by `npm.cmd run test:e2e`.
- Playwright can alternatively use installed Edge with the `PLAYWRIGHT_CHANNEL=msedge` process environment variable. Tests use isolated browser contexts and do not modify the user's browser profile.
- `npm.cmd run format` formats source, app configuration, and end-to-end tests with Prettier.

# Layout

- `src/lib/` — domain modules and unit tests: `model.ts` (types, validation, parsing), `seed.ts`, `tabTypes.ts`, `tablature.ts`, `piano.ts`, `scales.ts`, `playback.ts`, `chordDatabase.ts`, `chordsDb.ts` (generated voicing data), `plural.ts`.
- `src/app/App.tsx` — application shell: routing, library state, persistence, modals.
- `src/pages/` — one file per route; `src/components/` — shared UI: `ui/` (Modal, BackLink, PageHeading, EmptyState), `layout/` (Sidebar, Topbar, Footer), `catalog/` (BandGrid, SongList), `chords/` (ChordDiagram, ChordEditor, chordUtils), `song/` (LyricsView, PartsPanel, PartCard, ChordSidebar), `tabs/` (TabScoreView, VisualTabEditor, TabGuide, PianoNotation), `editors/` (BandEditor, SongEditor, PartEditor), `fretboard/` (FretboardView + tab components).
- `src/styles/` — all CSS.

# Data and UI

- No backend or account system. The library is stored under localStorage key `lad-library-v1`; storage is specific to the browser and origin. JSON export/import is the backup and transfer mechanism.
- `src/lib/model.ts` owns types, input validation, chord/lyrics parsing, and tab templates. Validate imported JSON before changing persisted state. Never silently overwrite corrupted saved data.
- Deleting a band also deletes its songs. User chords live in `library.chords`; built-in voicings deleted by the user are remembered in `library.hiddenChords` (db-* ids) and can be restored from the chord detail page. A user chord with a `db-*` id shadows the built-in voicing.
- `src/lib/seed.ts` contains fictional demonstration artists performing public-domain songs (folk, gospel, classical) so lyrics stay copyright-free; each demo song covers different instruments, meters, and part formats. Built-in guitar voicings are generated at runtime by chordDatabase.ts. Keep demonstration content explicitly labeled as such.
- Chords are marked as `[Am]` before a lyric syllable/word; section headings use `{Припев}` on their own line.
- Guitar voicings list six absolute frets from low E to high e; -1 is muted, 0 is open, and positive frets must fit in `baseFret..baseFret+4`.
- Parts support independent plain-text `content` and optional structured `score`; `format` selects `text` or `visual`. Missing format means legacy plain text. Preserve old content, whitespace, and line breaks; never infer rhythm from ASCII spacing or migrate it silently.
- `src/lib/tabTypes.ts` defines visual scores; `src/lib/tablature.ts` validates, parses and serializes them. Quarter = 480 ticks. Events are sequential within bars; simultaneous notes share an event duration. Underfilled bars remain unfilled, overflowing bars cannot be saved.
- Structured notation uses `1:5~h@8`, `[1:0,2:1]@4`, `r@4`, `HH:x@8`, and `|` bar separators. Durations 1/2/4/8/16 may use a dot or `t` (triplet). Links belong to the source note and target the same lane in the immediately following event; cross-bar links require a full source bar.
- Numbered tab lanes run from the highest string downward (guitar 1=e through 6=E; bass 1=G through 4=E), unlike chord voicing arrays. Drum lanes are HH, SD, BD, HT, MT, LT, CC, SP, RD (display order puts cymbals on top: CC, SP, RD, HH, HT, MT, SD, LT, BD).
- `TabScoreView` renders SVG guitar/bass and HTML drum bars wrapped in rows of three inside a vertically resizable, scrollable area per part. `VisualTabEditor` edits a draft; `TabGuide` is the in-app syntax tutorial. Invalid drafts or unapplied notation cannot be saved. `src/lib/playback.ts` plays scores via Web Audio: `buildTimeline` resolves ties, slides, bends, legato and muted hits into scheduled notes; `TabPlayer` schedules them. Guitar, bass and piano use sampled SoundFonts (smplr + FluidR3 GM single-note MP3s in `public/soundfonts/`); drums and muted string clicks stay synthesized. Effects map to sample parameters: palm mute shortens duration and lowers the filter cutoff, ghost/accent scale velocity, slides and bends split into legato segments. String labels on the tablature reflect the part's custom tuning via `laneLabels()`.
- Piano uses `kind: "piano"`; note lanes are canonical scientific pitch names A0–C8 (88 keys, C4 = middle C), with `fret: 0`. `src/lib/piano.ts` maps pitches; `PianoNotation` switches between a key-group strip with keyboard highlighting and piano roll, without changing the score. Piano input is `C4@4`, `[C4,E4,G4]@2`, optional `~accent`, `~ghost`, and `~tie`. Flats are normalized to sharps by the parser. Up to ten distinct keys can share an event duration.
- Piano and joined-bar browser scenarios are in `e2e/pianoCompact.e2e.ts`; pitch mapping and validation tests are in `src/lib/piano.test.ts`.
- Visual regression and persistence scenarios live in `e2e/tablature.e2e.ts`; parser/unit coverage is in `src/lib/tablature.test.ts` and backward-compatible import coverage in `src/lib/tabPersistence.test.ts`.
- Google Fonts enhance typography; local serif/sans-serif fallbacks remain available if the font request fails.
