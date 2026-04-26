import { useEffect, useRef, useCallback } from "react";
import { useEmu } from "@/hooks/use_emu";
import {
  audio_clear_samples,
  audio_consume_samples,
  audio_get_queued_sample_count,
} from "@/lib/audio/queue";
import {
  audio_set_max_buffered_samples,
  audio_set_sample_rate,
} from "@/lib/audio/apu";
import { emu_set_audio_pump } from "@/lib/emu";

const GAIN_VALUE = 0.35;

// Keep about this much audio queued inside the AudioWorklet.
const TARGET_WORKLET_BUFFER_SECONDS = 0.1;

// Main-thread pump interval. AudioWorklet renders every ~2.67ms at 48kHz,
// so feeding every 8ms is stable without being too spammy.
const PUMP_INTERVAL_MS = 8;

type WorkletStatus = {
  type: "status";
  available: number;
  underflows: number;
  capacity?: number;
  sampleRate?: number;
};

export function useEmulatorAudio() {
  const emu = useEmu();

  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const workletAvailableRef = useRef(0);
  const workletUnderflowsRef = useRef(0);

  const pumpSamples = useCallback(() => {
    const worklet = workletNodeRef.current;
    const audioCtx = audioCtxRef.current;

    if (!worklet || !audioCtx) {
      return;
    }

    const targetBuffered = Math.floor(
      audioCtx.sampleRate * TARGET_WORKLET_BUFFER_SECONDS,
    );

    const needed = targetBuffered - workletAvailableRef.current;

    if (needed <= 0) {
      return;
    }

    const available = audio_get_queued_sample_count();

    if (available <= 0) {
      return;
    }

    const count = Math.min(available, needed);
    const { left, right } = audio_consume_samples(count);

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
    emu_set_audio_pump(pumpSamples);
    return () => emu_set_audio_pump(null);
  }, [pumpSamples]);

  useEffect(() => {
    const id = window.setInterval(() => {
      pumpSamples();
    }, PUMP_INTERVAL_MS);

    return () => window.clearInterval(id);
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

        if (cancelled) {
          void audioCtx.close();
          return;
        }

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

        workletNode.connect(gain);
        gain.connect(audioCtx.destination);

        workletNode.port.onmessage = (e: MessageEvent) => {
          const data = e.data as WorkletStatus | undefined;

          if (!data || data.type !== "status") {
            return;
          }

          workletAvailableRef.current = data.available;
          workletUnderflowsRef.current = data.underflows;
        };

        audioCtxRef.current = audioCtx;
        workletNodeRef.current = workletNode;
        gainRef.current = gain;

        audio_set_sample_rate(audioCtx.sampleRate);

        // Queue in emulator side. This is not all sent to the worklet at once;
        // pumpSamples() only sends enough to maintain target worklet latency.
        audio_set_max_buffered_samples(Math.floor(audioCtx.sampleRate * 0.5));

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

      try {
        workletNodeRef.current?.port.postMessage({ type: "clear" });
      } catch {
        // ignore
      }

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

      const audioCtx = audioCtxRef.current;

      if (audioCtx && audioCtx.state !== "closed") {
        void audioCtx.close();
      }

      audioCtxRef.current = null;
      workletNodeRef.current = null;
      gainRef.current = null;
    };
  }, []);

  useEffect(() => {
    const isRunning = emu.running && !emu.paused;

    if (!isRunning) {
      audio_clear_samples();
      workletNodeRef.current?.port.postMessage({ type: "clear" });
      workletAvailableRef.current = 0;
    }
  }, [emu.running, emu.paused]);

  return null;
}