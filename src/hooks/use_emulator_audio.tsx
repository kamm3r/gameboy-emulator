import { useEffect, useRef, useCallback } from "react";
import { useEmu } from "@/hooks/use_emu";
import {
  audio_clear_samples,
  audio_consume_samples,
  audio_get_queued_sample_count,
} from "@/lib/audio/queue";
import {
  audio_set_sample_rate,
  audio_set_max_buffered_samples,
} from "@/lib/audio/apu";

const CHUNK_SIZE = 256;
const PUMP_INTERVAL_MS = 4;
const GAIN_VALUE = 0.3;
const BUFFER_TIME_MS = 200;

export function useEmulatorAudio() {
  const emu = useEmu();

  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const pumpIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pumpSamples = useCallback(() => {
    const worklet = workletNodeRef.current;
    if (!worklet) {
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

    worklet.port.postMessage(
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
        gain.gain.value = GAIN_VALUE;

        workletNode.connect(gain);
        gain.connect(audioCtx.destination);

        audioCtxRef.current = audioCtx;
        workletNodeRef.current = workletNode;
        gainRef.current = gain;

        audio_set_sample_rate(audioCtx.sampleRate);
        audio_set_max_buffered_samples(
          Math.floor(audioCtx.sampleRate * (BUFFER_TIME_MS / 1000)),
        );

        pumpIntervalRef.current = setInterval(pumpSamples, PUMP_INTERVAL_MS);

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

        const cleanupListeners = () => {
          window.removeEventListener("pointerdown", resume);
          window.removeEventListener("keydown", resume);
        };

        (workletNode as unknown as { _cleanup: () => void })._cleanup =
          cleanupListeners;
      } catch (err) {
        console.error("Audio init failed:", err);
      }
    }

    void initAudio();

    return () => {
      cancelled = true;

      if (pumpIntervalRef.current !== null) {
        clearInterval(pumpIntervalRef.current);
        pumpIntervalRef.current = null;
      }

      audio_clear_samples();

      const worklet = workletNodeRef.current as
        | (AudioWorkletNode & { _cleanup?: () => void })
        | null;

      worklet?._cleanup?.();

      try {
        workletNodeRef.current?.disconnect();
      } catch {
        // ignore
      }

      try {
        gainRef.current?.disconnect();
      } catch {
        // ignore
      }

      const ctx = audioCtxRef.current;
      if (ctx && ctx.state !== "closed") {
        void ctx.close();
      }

      audioCtxRef.current = null;
      workletNodeRef.current = null;
      gainRef.current = null;
    };
  }, [pumpSamples]);

  useEffect(() => {
    const isRunning = emu.running && !emu.paused;

    if (!isRunning) {
      audio_clear_samples();

      const worklet = workletNodeRef.current;
      if (worklet) {
        worklet.port.postMessage({ type: "clear" });
      }
    }
  }, [emu.running, emu.paused]);

  return null;
}