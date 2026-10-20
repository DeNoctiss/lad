/** Short, unpitched dead-note attacks. These are distinct from palm-muted pitched notes. */
export function mutedStringVoice(
  ctx: AudioContext,
  destination: AudioNode,
  noise: AudioBuffer,
  at: number,
  kind: "guitar" | "bass",
  midi: number,
  velocity: number,
): () => void {
  const source = ctx.createBufferSource();
  source.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  // Low strings have a darker, more substantial scrape than high strings.
  filter.frequency.value =
    kind === "bass" ? 550 + (midi - 28) * 30 : 1450 + (midi - 40) * 42;
  filter.Q.value = 0.8;
  const gain = ctx.createGain();
  const length = kind === "bass" ? 0.105 : 0.075;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(
    0.34 * Math.max(0.05, Math.min(1.4, velocity)),
    at + 0.003,
  );
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  source.connect(filter).connect(gain).connect(destination);
  source.onended = () => {
    source.disconnect();
    filter.disconnect();
    gain.disconnect();
  };
  source.start(at);
  source.stop(at + length + 0.015);
  // Register this stop with the transport: a new playback must not replay old scheduled hits.
  return () => {
    source.stop();
  };
}
