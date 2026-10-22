import { useEffect, useRef, useState } from "react";
import type {
  VocalProject,
  PitchPoint,
  AudioTrackMeta,
} from "../../lib/vocal/model";
import { VocalTransport } from "../../lib/vocal/transport";
import type { TrackKind } from "../../lib/vocal/transport";
import type { MicrophoneTiming } from "../../lib/vocal/liveAnalysis";
import { VocalMicrophone } from "../../lib/vocal/microphone";
import type { PitchRange } from "../../lib/vocal/yin";
import type { Pitch } from "../../lib/vocal/pitch";
import {
  analysisSamples,
  audioJob,
  decodeFile,
  waveform,
} from "../../lib/vocal/jobs";
import type { Transcription } from "../../lib/vocal/jobs";
export type LoadedAudio = {
  file: File;
  buffer: AudioBuffer;
  peaks: number[];
  meta: AudioTrackMeta;
};
export function useVocalSession(
  project: VocalProject,
  training: boolean,
  active: boolean,
) {
  const [transport] = useState(() => new VocalTransport());
  const [microphone] = useState(() => new VocalMicrophone());
  const [playing, setPlaying] = useState(false),
    [position, setPosition] = useState(0),
    [counting, setCounting] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [micOn, setMicOn] = useState(false),
    [micPending, setMicPending] = useState(false),
    [deviceId, setDeviceId] = useState("");
  const [micTiming, setMicTiming] = useState<MicrophoneTiming | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [pitch, setPitch] = useState<Pitch>({
    midi: null,
    frequency: null,
    confidence: 0,
    rms: 0,
  });
  const [trace, setTrace] = useState<PitchPoint[]>([]),
    [detected, setDetected] = useState<PitchPoint[]>([]);
  const [audio, setAudio] = useState<Partial<Record<TrackKind, LoadedAudio>>>(
    {},
  );
  const traceRef = useRef<PitchPoint[]>([]),
    lastBeat = useRef(-1);
  const current = useRef({ project, training, active });
  current.current = { project, training, active };
  const alive = useRef(true),
    job = useRef<{ cancel(): void } | null>(null),
    operation = useRef(0),
    playOperation = useRef(0),
    activity = useRef<"import" | "play" | null>(null);
  const resetTake = () => {
    traceRef.current = [];
    lastBeat.current = -1;
    setTrace([]);
  };
  const stopMic = () => {
    microphone.stop();
    setMicOn(false);
    setMicTiming(null);
    setMicPending(false);
    setPitch({ midi: null, frequency: null, confidence: 0, rms: 0 });
  };
  const pause = () => {
    setPosition(transport.pause());
    setPlaying(false);
    setCounting(false);
  };
  const cancel = () => {
    operation.current++;
    playOperation.current++;
    activity.current = null;
    job.current?.cancel();
    job.current = null;
    pause();
    setBusy("");
  };
  useEffect(() => {
    alive.current = true;
    const hidden = () => {
      if (document.hidden) {
        playOperation.current++;
        if (activity.current === "play") {
          activity.current = null;
          setBusy("");
        }
        setPosition(transport.pause());
        microphone.stop();
        setPlaying(false);
        setCounting(false);
        setMicOn(false);
        setMicTiming(null);
        setMicPending(false);
        setPitch({ midi: null, frequency: null, confidence: 0, rms: 0 });
      }
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      alive.current = false;
      operation.current++;
      playOperation.current++;
      job.current?.cancel();
      microphone.stop();
      transport.dispose();
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [transport, microphone]);
  // Keep decoded tracks in memory while another song tab is shown. Capture and
  // playback must still stop, including in-flight permission/worker requests.
  useEffect(() => {
    if (active) return;
    playOperation.current++;
    if (activity.current === "play") {
      activity.current = null;
      setBusy("");
    }
    setPosition(transport.pause());
    microphone.stop();
    setPlaying(false);
    setCounting(false);
    setMicOn(false);
    setMicTiming(null);
    setMicPending(false);
    setPitch({ midi: null, frequency: null, confidence: 0, rms: 0 });
  }, [active, transport, microphone]);
  useEffect(() => {
    transport.volume(project.settings);
    microphone.setMonitor(project.settings.monitorVolume);
  }, [
    transport,
    microphone,
    project.settings.referenceVolume,
    project.settings.acapellaVolume,
    project.settings.backingVolume,
    project.settings.monitorVolume,
  ]);
  useEffect(() => {
    if (!playing) return;
    let frame = 0,
      last = 0;
    const tick = (time: number) => {
      if (time - last > 32) {
        setPosition(Math.max(0, transport.position));
        setCounting(transport.countingIn);
        setPlaying(transport.playing);
        last = time;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, transport]);
  async function start() {
    if (!active || busy || !project.notes.length) return;
    setError("");
    setBusy("Подготовка звука…");
    resetTake();
    const op = ++playOperation.current;
    activity.current = "play";
    try {
      await transport.prepare(project);
      if (
        !alive.current ||
        op !== playOperation.current ||
        !current.current.active ||
        document.hidden
      )
        return;
      transport.start(
        {
          ...project,
          notes: [...project.notes].sort((a, b) => a.start - b.start),
        },
        position >= project.length - 0.01 ? 0 : position,
        project.settings.countIn,
      );
      setPlaying(true);
      setCounting(project.settings.countIn);
    } catch (e) {
      if (
        alive.current &&
        op === playOperation.current &&
        e instanceof Error &&
        e.name !== "AbortError"
      )
        setError(e.message);
    } finally {
      if (alive.current && op === playOperation.current) {
        activity.current = null;
        setBusy("");
      }
    }
  }
  const seek = (beat: number, length = project.length) => {
    transport.seek(Math.max(0, Math.min(length, beat)));
    setPosition(transport.position);
    setPlaying(false);
    setCounting(false);
    resetTake();
  };
  const refreshDevices = async () => {
    if (navigator.mediaDevices?.enumerateDevices) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      if (alive.current)
        setDevices(devices.filter((d) => d.kind === "audioinput"));
    }
  };
  async function toggleMic() {
    if (!active) return;
    if (micOn || micPending) {
      stopMic();
      return;
    }
    setError("");
    setMicPending(true);
    try {
      const started = await microphone.start(
        transport.context,
        deviceId,
        (value) => {
          if (!alive.current || !current.current.active) return;
          setPitch(value);
          const { project: p, training: t } = current.current;
          if (!t || !transport.playing || transport.countingIn) return;
          const beat =
            transport.position -
            ((p.settings.latencyMs / 1000) * p.bpm * p.settings.speed) / 60;
          if (beat < 0 || (p.settings.loop && beat < p.settings.loopStart))
            return;
          if (beat < lastBeat.current - 0.1) traceRef.current = [];
          lastBeat.current = beat;
          const point: PitchPoint = {
            beat,
            midi: value.midi,
            confidence: value.confidence,
          };
          traceRef.current = [...traceRef.current.slice(-11999), point];
          setTrace(traceRef.current);
        },
        () => {
          if (alive.current) {
            setMicOn(false);
            setMicTiming(null);
            setError(
              "Микрофон отключён. Подключите устройство и включите снова.",
            );
          }
        },
        current.current.project.settings.analysisMode ?? "fast",
      );
      if (alive.current) {
        setMicOn(started);
        if (started) {
          setMicTiming(microphone.timing);
          microphone.setMonitor(current.current.project.settings.monitorVolume);
          await refreshDevices();
        }
      }
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "Ошибка микрофона");
    } finally {
      if (alive.current) setMicPending(false);
    }
  }
  async function loadAudio(
    kind: TrackKind,
    file: File,
    transcribe: boolean,
    range: PitchRange = "auto",
  ): Promise<{ audio: LoadedAudio; transcription?: Transcription } | null> {
    cancel();
    setError("");
    const op = ++operation.current;
    activity.current = "import";
    setBusy("Читаю аудио…");
    try {
      const buffer = await decodeFile(file, transport.context);
      if (!alive.current || op !== operation.current) return null;
      const meta = {
        name: file.name,
        duration: buffer.duration,
        originalBpm: project.bpm,
        offset: 0,
      };
      const loaded = { file, buffer, peaks: waveform(buffer), meta };
      let transcription: Transcription | undefined;
      if (transcribe) {
        setBusy("Распознаю ноты: 0%");
        const samples = await analysisSamples(buffer);
        if (!alive.current || op !== operation.current) return null;
        const task = audioJob<Transcription>(
          {
            task: "transcribe",
            samples,
            sampleRate: 11025,
            bpm: project.bpm,
            range,
          },
          [samples.buffer],
          (value) => {
            if (alive.current && op === operation.current)
              setBusy("Распознаю ноты: " + Math.round(value * 100) + "%");
          },
        );
        job.current = task;
        transcription = await task.promise;
        if (job.current === task) job.current = null;
      }
      if (!alive.current || op !== operation.current) return null;
      transport.setAudio(kind, buffer);
      setAudio((a) => ({ ...a, [kind]: loaded }));
      if (transcription) setDetected(transcription.points);
      return { audio: loaded, transcription };
    } catch (e) {
      if (
        alive.current &&
        op === operation.current &&
        e instanceof Error &&
        e.name !== "AbortError"
      )
        setError(e.message);
      return null;
    } finally {
      if (alive.current && op === operation.current) {
        activity.current = null;
        setBusy("");
      }
    }
  }
  const removeAudio = (kind: TrackKind) => {
    pause();
    transport.setAudio(kind);
    setAudio((a) => ({ ...a, [kind]: undefined }));
    if (kind === "acapella") setDetected([]);
  };
  return {
    transport,
    playing,
    position,
    counting,
    busy,
    error,
    setError,
    start,
    pause,
    seek,
    cancel,
    micOn,
    micTiming,
    micPending,
    toggleMic,
    stopMic,
    deviceId,
    devices,
    setDeviceId: (id: string) => {
      stopMic();
      setDeviceId(id);
    },
    refreshDevices,
    pitch,
    trace,
    detected,
    clearDetected: () => setDetected([]),
    resetTake,
    audio,
    loadAudio,
    removeAudio,
  };
}
export type VocalSession = ReturnType<typeof useVocalSession>;
