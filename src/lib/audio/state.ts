import {
  CPU_HZ,
  DEFAULT_MAX_BUFFERED_SAMPLES,
  DEFAULT_SAMPLE_RATE,
} from "./constants";
import { make_noise_channel, type noise_channel } from "./noise";
import { make_pulse_channel, type pulse_channel } from "./pulse";
import { make_wave_channel, type wave_channel } from "./wave";

export type audio_options = {
  sample_rate?: number;
  max_buffered_samples?: number;
};

export type audio_sample_chunk = {
  left: Float32Array;
  right: Float32Array;
};

export type apu_context = {
  enabled: boolean;

  ch1: pulse_channel;
  ch2: pulse_channel;
  ch3: wave_channel;
  ch4: noise_channel;

  nr50: number;
  nr51: number;
  nr52: number;

  wave_ram: Uint8Array;

  frame_seq_step: number;
  div_apu_counter: number;

  sample_rate: number;
  cycles_per_sample: number;
  sample_cycle_accum: number;
  max_buffered_samples: number;

  sample_queue_l: Float32Array;
  sample_queue_r: Float32Array;
  sample_queue_read: number;
  sample_queue_write: number;
  sample_queue_count: number;

  hpf_cap_l: number;
  hpf_cap_r: number;
};

function make_queue_buffers(capacity: number): {
  l: Float32Array;
  r: Float32Array;
} {
  return {
    l: new Float32Array(capacity),
    r: new Float32Array(capacity),
  };
}

const initial_buffers = make_queue_buffers(DEFAULT_MAX_BUFFERED_SAMPLES);

export const ctx: apu_context = {
  enabled: false,
  ch1: make_pulse_channel(),
  ch2: make_pulse_channel(),
  ch3: make_wave_channel(),
  ch4: make_noise_channel(),
  nr50: 0,
  nr51: 0,
  nr52: 0,
  wave_ram: new Uint8Array(16),
  frame_seq_step: 0,
  div_apu_counter: 0,
  sample_rate: DEFAULT_SAMPLE_RATE,
  cycles_per_sample: CPU_HZ / DEFAULT_SAMPLE_RATE,
  sample_cycle_accum: 0,
  max_buffered_samples: DEFAULT_MAX_BUFFERED_SAMPLES,
  sample_queue_l: initial_buffers.l,
  sample_queue_r: initial_buffers.r,
  sample_queue_read: 0,
  sample_queue_write: 0,
  sample_queue_count: 0,
  hpf_cap_l: 0,
  hpf_cap_r: 0,
};