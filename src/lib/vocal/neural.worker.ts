import * as tf from "@tensorflow/tfjs";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";
import {
  BasicPitch,
  outputToNotesPoly,
  noteFramesToTime,
} from "@spotify/basic-pitch";
import { neuralMelody } from "./neuralPostprocess";
import { pitchRanges } from "./yin";
self.onmessage = async (event: MessageEvent) => {
  const d = event.data;
  try {
    setWasmPaths(d.assetBase + "wasm/");
    await tf.setBackend("wasm");
    await tf.ready();
    const basic = new BasicPitch(d.assetBase + "basic-pitch/model.json");
    const model = await basic.model;
    // Spotify's framing constants; allocate one window at a time. Explicit
    // float32 padding avoids tf.signal.frame's unspecified Fill dtype on WASM.
    const samples: Float32Array = d.samples;
    const windowSize = 43844,
      hop = 36164,
      padding = 3840;
    const windows = Math.ceil((samples.length + padding) / hop);
    const frameLimit = Math.floor((samples.length * 86) / 22050);
    const frames: number[][] = [],
      onsets: number[][] = [];
    try {
      for (let i = 0; i < windows && frames.length < frameLimit; i++) {
        self.postMessage({ progress: 0.03 + (0.87 * i) / windows });
        const chunk = new Float32Array(windowSize),
          start = i * hop - padding;
        for (let j = 0; j < windowSize; j++) chunk[j] = samples[start + j] ?? 0;
        // Upstream evaluator retains temporary tensors; scopes bound memory.
        tf.engine().startScope();
        try {
          const input = tf.tensor3d(chunk, [1, windowSize, 1], "float32");
          const [f, o] = await basic.evaluateSingleFrame(input, 0);
          const remaining = frameLimit - frames.length;
          frames.push(
            ...(await basic.unwrapOutput(f).array()).slice(0, remaining),
          );
          onsets.push(
            ...(await basic.unwrapOutput(o).array()).slice(0, remaining),
          );
        } finally {
          tf.engine().endScope();
        }
      }
    } finally {
      model.dispose();
    }
    self.postMessage({ progress: 0.93 });
    const result = neuralMelody(
      { frames, onsets },
      d.bpm,
      samples.length / 22050,
      d.range,
    );
    // Raw polyphonic events are only needed by the developer comparison.
    if (d.benchmark) {
      const [min, max] = pitchRanges[d.range as keyof typeof pitchRanges];
      const raw = noteFramesToTime(
        outputToNotesPoly(
          frames.map((r) => [...r]),
          onsets.map((r) => [...r]),
          0.5,
          0.3,
          8,
          true,
          max,
          min,
        ),
      );
      self.postMessage({ result: { ...result, engine: "basic-pitch", raw } });
    } else self.postMessage({ result });
  } catch (e) {
    self.postMessage({
      error:
        "Basic Pitch: " +
        (e instanceof Error ? e.message : "ошибка модели") +
        ". Попробуйте прежний алгоритм в окне распознавания.",
    });
  }
};
