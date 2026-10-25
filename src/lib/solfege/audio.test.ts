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
    start(args: unknown) {
      mock.start(args);
      return mock.stop;
    }
  },
}));
import { SolfegeAudio } from "./audio";
const param = () => ({
  value: 0,
  setValueAtTime: vi.fn(),
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
it("loads the exact tablature grand-piano asset and schedules samples, not pitched oscillators", async () => {
  const audio = new SolfegeAudio();
  expect(await audio.play([{ midi: 60, beat: 0, duration: 1 }])).toBe(true);
  expect(mock.create.mock.calls[0][0].instrumentUrl).toMatch(
    /soundfonts\/acoustic_grand_piano-mp3.js$/,
  );
  expect(mock.start).toHaveBeenCalledWith(
    expect.objectContaining({ note: 60, duration: 0.75, velocity: 76 }),
  );
  audio.stop();
  expect(mock.stop).toHaveBeenCalled();
  audio.dispose();
});
it("does not play stale notes after stopping during loading", async () => {
  let resolve!: () => void;
  mock.load = () => new Promise<void>((r) => (resolve = r));
  const audio = new SolfegeAudio();
  const pending = audio.play([{ midi: 60, beat: 0, duration: 1 }]);
  await vi.waitFor(() => expect(mock.create).toHaveBeenCalled());
  audio.stop();
  resolve();
  expect(await pending).toBe(false);
  expect(mock.start).not.toHaveBeenCalled();
  audio.dispose();
});
it("failed sample loads are retryable and never replaced by a synth tone", async () => {
  mock.load = () => Promise.reject(new Error("network"));
  const audio = new SolfegeAudio();
  await expect(
    audio.play([{ midi: 60, beat: 0, duration: 1 }]),
  ).rejects.toThrow("пианино");
  expect(audio.state).toBe("idle");
  mock.load = () => Promise.resolve();
  await audio.play([{ midi: 60, beat: 0, duration: 1 }]);
  expect(mock.create).toHaveBeenCalledTimes(2);
  expect(mock.start).toHaveBeenCalledTimes(1);
  audio.dispose();
});
it("rests preserve timing but never create a sounding piano voice", async () => {
  const audio = new SolfegeAudio();
  await audio.play([
    { midi: 60, beat: 0, duration: 1, rest: true },
    { midi: 62, beat: 1, duration: 1 },
  ]);
  expect(mock.start).toHaveBeenCalledTimes(1);
  expect(mock.start).toHaveBeenCalledWith(
    expect.objectContaining({ note: 62, time: 10 + 0.07 + 0.75 }),
  );
  audio.dispose();
});
