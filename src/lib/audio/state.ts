import { CPU_HZ, DEFAULT_MAX_BUFFERED_SAMPLES, DEFAULT_SAMPLE_RATE } from "../common";


export type audio_options = {
  sample_rate?: number;
  max_buffered_samples?: number;
};

export type audio_sample_chunk = {
  left: Float32Array;
  right: Float32Array;
};

export type length_counter = {
  counter: number;
  enabled: boolean;
};

export type envelope = {
  initial_volume: number;
  current_volume: number;
  period: number;
  add_mode: boolean;
  timer: number;
};

export type pulse_channel = {
  enabled: boolean;
  dac_enabled: boolean;

  length: length_counter;

  duty: number;
  duty_pos: number;

  period_value: number;
  freq_timer: number;

  env: envelope;

  sweep_period: number;
  sweep_negate: boolean;
  sweep_shift: number;
  sweep_timer: number;
  sweep_enabled: boolean;
  shadow_period: number;
  sweep_negate_used: boolean;

  nrx0: number;
  nrx1: number;
  nrx2: number;
  nrx3: number;
  nrx4: number;
};

export type wave_channel = {
  enabled: boolean;
  dac_enabled: boolean;

  length: length_counter;

  period_value: number;
  freq_timer: number;

  volume_code: number;
  wave_pos: number;
  sample_latch: number;

  last_read_byte: number;
  access_countdown: number;

  nr30: number;
  nr31: number;
  nr32: number;
  nr33: number;
  nr34: number;
};

export type noise_channel = {
  enabled: boolean;
  dac_enabled: boolean;

  length: length_counter;

  clock_shift: number;
  lfsr_width_mode: boolean;
  divisor_code: number;
  freq_timer: number;
  lfsr: number;

  env: envelope;

  nr41: number;
  nr42: number;
  nr43: number;
  nr44: number;
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

export function make_envelope(): envelope {
  return {
    initial_volume: 0,
    current_volume: 0,
    period: 0,
    add_mode: false,
    timer: 0,
  };
}

export function make_length_counter(): length_counter {
  return {
    counter: 0,
    enabled: false,
  };
}

export function make_pulse_channel(): pulse_channel {
  return {
    enabled: false,
    dac_enabled: false,

    length: make_length_counter(),

    duty: 0,
    duty_pos: 0,

    period_value: 0,
    freq_timer: 0,

    env: make_envelope(),

    sweep_period: 0,
    sweep_negate: false,
    sweep_shift: 0,
    sweep_timer: 0,
    sweep_enabled: false,
    shadow_period: 0,
    sweep_negate_used: false,

    nrx0: 0,
    nrx1: 0,
    nrx2: 0,
    nrx3: 0,
    nrx4: 0,
  };
}

export function make_wave_channel(): wave_channel {
  return {
    enabled: false,
    dac_enabled: false,

    length: make_length_counter(),

    period_value: 0,
    freq_timer: 0,

    volume_code: 0,
    wave_pos: 0,
    sample_latch: 0,

    last_read_byte: 0,
    access_countdown: 0,

    nr30: 0,
    nr31: 0,
    nr32: 0,
    nr33: 0,
    nr34: 0,
  };
}

export function make_noise_channel(): noise_channel {
  return {
    enabled: false,
    dac_enabled: false,

    length: make_length_counter(),

    clock_shift: 0,
    lfsr_width_mode: false,
    divisor_code: 0,
    freq_timer: 8,
    lfsr: 0x7fff,

    env: make_envelope(),

    nr41: 0,
    nr42: 0,
    nr43: 0,
    nr44: 0,
  };
}

function make_queue_buffers(capacity: number) {
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
  nr52: 0x70,

  wave_ram: new Uint8Array(16),

  frame_seq_step: 7,

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