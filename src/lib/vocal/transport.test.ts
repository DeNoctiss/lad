import { beforeEach, afterEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  create: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  load: () => Promise.resolve(),
}));
vi.mock("smplr", () => ({
  Soundfont: class {
    load: Promise<unknown>;
    constructor(_ctx: unknown, config: unknown) {
      mock.create(config);
      this.load = mock.load();
    }
    stop() {
      mock.stop();
    }
    start(args: unknown) {
      mock.start(args);
      return mock.stop;
    }
  },
}));
import { VocalTransport } from "./transport";
import { createVocalProject } from "./model";
const param = () => ({
  value: 0,
  setValueAtTime: vi.fn(),
  setTargetAtTime: vi.fn(),
  exponentialRampToValueAtTime: vi.fn(),
});
class Context {
  state = "running";
  currentTime = 10;
  destination = {};
  resume = vi.fn(async () => {});
  close = vi.fn(async () => {
    this.state = "closed";
  });
  createGain() {
    return { gain: param(), connect: () => ({ connect: () => {} }) };
  }
  createDynamicsCompressor() {
    return {};
  }
}
beforeEach(() => {
  vi.stubGlobal("AudioContext", Context);
  vi.useFakeTimers();
  mock.create.mockClear();
  mock.start.mockClear();
  mock.stop.mockClear();
  mock.load = () => Promise.resolve();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("plays reference notes with local piano and retains pitch, tempo and stop", async () => {
  const audio = new VocalTransport();
  const p = createVocalProject(120);
  p.settings.countIn = false;
  p.settings.metronome = false;
  p.settings.loop = false;
  p.settings.transpose = 2;
  p.settings.speed = 0.5;
  p.notes = [{ id: "a", midi: 60, start: 0, duration: 1 }];
  await audio.prepare(p);
  audio.start(p, 0, false);
  expect(mock.create.mock.calls[0][0].instrumentUrl).toMatch(
    /soundfonts\/acoustic_grand_piano-mp3.js$/,
  );
  expect(mock.start).toHaveBeenCalledWith(
    expect.objectContaining({ note: 62, duration: 1, velocity: 76 }),
  );
  audio.pause();
  expect(mock.stop).toHaveBeenCalled();
  audio.dispose();
});
it("previews piano notes without changing the MIDI octave", async () => {
  const audio = new VocalTransport();
  await audio.preview(69);
  expect(mock.start).toHaveBeenCalledWith(
    expect.objectContaining({ note: 69, duration: 0.35 }),
  );
  audio.dispose();
});
it("does not preview after stopping during loading", async () => {
  let resolve!: () => void;
  mock.load = () => new Promise<void>((r) => (resolve = r));
  const audio = new VocalTransport();
  const pending = audio.preview(60);
  await vi.waitFor(() => expect(mock.create).toHaveBeenCalled());
  audio.pause();
  resolve();
  await pending;
  expect(mock.start).not.toHaveBeenCalled();
  audio.dispose();
});
it("retries failed sample loads without falling back to a synth", async () => {
  const audio = new VocalTransport();
  mock.load = () => Promise.reject(new Error("network"));
  await expect(audio.preview(60)).rejects.toThrow("пианино");
  mock.load = () => Promise.resolve();
  await audio.preview(60);
  expect(mock.create).toHaveBeenCalledTimes(2);
  expect(mock.start).toHaveBeenCalledTimes(1);
  audio.dispose();
});
