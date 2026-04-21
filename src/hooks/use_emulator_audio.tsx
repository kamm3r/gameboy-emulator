import { useEffect, useRef, useCallback } from "react";
import {
  audio_clear_samples,
  audio_consume_samples,
  audio_get_queued_sample_count,
  audio_set_max_buffered_samples,
  audio_set_sample_rate,
} from "@/lib/audio";
import { useEmu } from "@/hooks/use_emu";

const CHUNK_SIZE = 256;

export function useEmulatorAudio() {
  const emu = useEmu();

  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const pumpIntervalRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  const pumpSamples = useCallback(() => {
    if (!workletNodeRef.current) {
      return;
    }

    const available = audio_get_queued_sample_count();

    if (available < CHUNK_SIZE) {
      return;
    }

    const { left, right } = audio_consume_samples(available);

    if (left.length === 0) {
      return;
    }

    workletNodeRef.current.port.postMessage(
      {
        type: "samples",
        left,
        right,
      },
      [left.buffer, right.buffer],
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initAudio() {
      const AudioCtx =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AudioCtx) {
        console.warn("Web Audio API not supported");
        return;
      }

      try {
        const audioCtx = new AudioCtx({
          latencyHint: "interactive",
          sampleRate: 48000,
        });

        if (cancelled) {
          void audioCtx.close();
          return;
        }

        await audioCtx.audioWorklet.addModule("/audio-worklet.js");

        if (cancelled) {
          void audioCtx.close();
          return;
        }

        const workletNode = new AudioWorkletNode(audioCtx, "emulator-audio", {
          numberOfInputs: 0,
          numberOfOutputs: 1,
          outputChannelCount: [2],
        });

        const gain = audioCtx.createGain();
        gain.gain.value = 0.3;

        workletNode.connect(gain);
        gain.connect(audioCtx.destination);

        audioCtxRef.current = audioCtx;
        workletNodeRef.current = workletNode;
        gainRef.current = gain;

        audio_set_sample_rate(audioCtx.sampleRate);
        // ~200ms max buffer in the APU queue
        audio_set_max_buffered_samples(Math.floor(audioCtx.sampleRate * 0.2));

        // Pump samples ~250Hz — more frequent than RAF to reduce underruns
        pumpIntervalRef.current = window.setInterval(pumpSamples, 4);

        const resume = async () => {
          if (audioCtx.state === "suspended") {
            try {
              await audioCtx.resume();
            } catch {
              // ignore
            }
          }
        };

        window.addEventListener("pointerdown", resume, { passive: true });
        window.addEventListener("keydown", resume);

        const cleanup = () => {
          window.removeEventListener("pointerdown", resume);
          window.removeEventListener("keydown", resume);
        };

        (workletNode as unknown as { _cleanup: () => void })._cleanup = cleanup;
      } catch (err) {
        console.error("Audio init failed:", err);
      }
    }

    void initAudio();

    return () => {
      cancelled = true;
      runningRef.current = false;

      if (pumpIntervalRef.current !== null) {
        clearInterval(pumpIntervalRef.current);
        pumpIntervalRef.current = null;
      }

      audio_clear_samples();

      const worklet = workletNodeRef.current as
        | (AudioWorkletNode & { _cleanup?: () => void })
        | null;
      if (worklet?._cleanup) {
        worklet._cleanup();
      }

      workletNodeRef.current?.disconnect();
      gainRef.current?.disconnect();

      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        void audioCtxRef.current.close();
      }

      audioCtxRef.current = null;
      workletNodeRef.current = null;
      gainRef.current = null;
    };
  }, [pumpSamples]);

  useEffect(() => {
    runningRef.current = emu.running && !emu.paused;

    if (!runningRef.current && workletNodeRef.current) {
      audio_clear_samples();
      workletNodeRef.current.port.postMessage({ type: "clear" });
    }
  }, [emu.running, emu.paused]);

  return null;
}