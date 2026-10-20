import { describe, expect, it, vi } from "vitest";
import { mutedStringVoice } from "./mutedStrings";

describe("dead-note voice", () => {
  it("schedules a short noise attack and returns a transport cancellation handle", () => {
    const source = {
      buffer: null,
      connect: vi.fn((n) => n),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
      onended: null,
    };
    const filter = {
      type: "",
      frequency: { value: 0 },
      Q: { value: 0 },
      connect: vi.fn((n) => n),
      disconnect: vi.fn(),
    };
    const envelope = {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    };
    const gain = {
      gain: envelope,
      connect: vi.fn((n) => n),
      disconnect: vi.fn(),
    };
    const ctx = {
      createBufferSource: () => source,
      createBiquadFilter: () => filter,
      createGain: () => gain,
    } as unknown as AudioContext;
    const noise = {} as AudioBuffer;
    const cancel = mutedStringVoice(
      ctx,
      {} as AudioNode,
      noise,
      3,
      "guitar",
      64,
      1,
    );
    expect(source.buffer).toBe(noise);
    expect(source.start).toHaveBeenCalledWith(3);
    expect(source.stop.mock.calls[0][0]).toBeGreaterThan(3);
    expect(source.stop.mock.calls[0][0]).toBeLessThan(3.15);
    expect(
      envelope.exponentialRampToValueAtTime.mock.calls[0][0],
    ).toBeGreaterThan(0.1);
    expect(filter.type).toBe("bandpass");
    cancel();
    expect(source.stop).toHaveBeenLastCalledWith();
  });
});
