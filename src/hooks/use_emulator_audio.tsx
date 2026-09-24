import { useEffect, useRef, useCallback } from "react";
import { useEmu } from "@/hooks/use_emu";
import {
  audio_clear_samples,
  audio_consume_samples,
  audio_get_queued_sample_count,
} from "@/lib/audio/queue";
import {
  audio_set_max_buffered_samples,
  audio_set_rate_adjust,
  audio_set_sample_rate,
} from "@/lib/audio/apu";
import { emu_set_audio_pump } from "@/lib/emu";

const GAIN_VALUE = 0.35;

// Keep about this much audio queued inside the AudioWorklet.
const TARGET_WORKLET_BUFFER_SECONDS = 0.15;

// How strongly buffer level error steers the APU sample rate
const RATE_CONTROL_GAIN = 0.005;

type WorkletStatus = { type: "status"; available: number };

export function useEmulatorAudio() {
  const emu = useEmu();

  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const workletAvailableRef = useRef(0);

  // Called by the emulator loop after each batch of frames
  const pumpSamples = useCallback(() => {
    const worklet = workletNodeRef.current;
    const audioCtx = audioCtxRef.current;

    if (!worklet || !audioCtx) {
      return;
    }

    const targetBuffered = Math.floor(
      audioCtx.sampleRate * TARGET_WORKLET_BUFFER_SECONDS,
    );

    const available = audio_get_queued_sample_count();

    // Steer production rate toward the target fill level (total buffered audio)
    const fill = workletAvailableRef.current + available;
    const error = (fill - targetBuffered) / targetBuffered;
    audio_set_rate_adjust(1 + Math.max(-1, Math.min(1, error)) * RATE_CONTROL_GAIN);

    const needed = targetBuffered - workletAvailableRef.current;

    if (needed <= 0 || available <= 0) {
      return;
    }

    const { left, right } = audio_consume_samples(Math.min(available, needed));

    if (left.length === 0) {
      return;
    }

    worklet.port.postMessage({ type: "samples", left, right }, [
      left.buffer,
      right.buffer,
    ]);

    // Account for what we just sent until the next status report arrives,
    // otherwise back-to-back pumps overfill the worklet and it drops samples
    workletAvailableRef.current += left.length;
  }, []);

  useEffect(() => {
    emu_set_audio_pump(pumpSamples);
    return () => emu_set_audio_pump(null);
  }, [pumpSamples]);

  useEffect(() => {
    let cancelled = false;
    let cleanupListeners: (() => void) | undefined;

    async function initAudio(): Promise<void> {
      const AudioCtx =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;

      if (!AudioCtx) {
        console.warn("Web Audio API not supported");
        return;
      }

      try {
        const audioCtx = new AudioCtx({
          latencyHint: "playback",
          sampleRate: 48000,
        });

        // Cache-bust in development because AudioWorklets can be cached hard.
        const workletUrl =
          process.env.NODE_ENV === "development"
            ? `/audio-worklet.js?v=${Date.now()}`
            : "/audio-worklet.js";

        await audioCtx.audioWorklet.addModule(workletUrl);

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
        workletNode.connect(gain).connect(audioCtx.destination);

        workletNode.port.onmessage = (e: MessageEvent<WorkletStatus>) => {
          if (e.data?.type === "status") {
            workletAvailableRef.current = e.data.available;
          }
        };

        audioCtxRef.current = audioCtx;
        workletNodeRef.current = workletNode;

        audio_set_sample_rate(audioCtx.sampleRate);

        // Emulator-side queue: headroom against main-thread jank
        audio_set_max_buffered_samples(audioCtx.sampleRate);

        // Browsers start audio suspended until a user gesture
        const resume = () => {
          if (audioCtx.state === "suspended") {
            audioCtx.resume().catch(() => {});
          }
        };

        window.addEventListener("pointerdown", resume, { passive: true });
        window.addEventListener("keydown", resume);

        cleanupListeners = () => {
          window.removeEventListener("pointerdown", resume);
          window.removeEventListener("keydown", resume);
        };
      } catch (err) {
        console.error("Audio init failed:", err);
      }
    }

    void initAudio();

    return () => {
      cancelled = true;
      cleanupListeners?.();
      audio_clear_samples();

      // Closing the context stops and disconnects the whole graph
      const audioCtx = audioCtxRef.current;
      if (audioCtx && audioCtx.state !== "closed") {
        void audioCtx.close();
      }

      audioCtxRef.current = null;
      workletNodeRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!emu.running || emu.paused) {
      audio_clear_samples();
      workletNodeRef.current?.port.postMessage({ type: "clear" });
      workletAvailableRef.current = 0;
    }
  }, [emu.running, emu.paused]);

  return null;
}
