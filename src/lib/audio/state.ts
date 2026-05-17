export type apu_context = {
  enabled: boolean;

  ch1_enabled: boolean;
  ch2_enabled: boolean;
  ch3_enabled: boolean;
  ch4_enabled: boolean;

  nr50: number;
  nr51: number;
  nr52: number;

  ch1: pulse_state;
  ch2: pulse_state;
  ch3: wave_state;
  ch4: noise_state;
};

export type pulse_state = {
  enabled: boolean;
  dac: boolean;
  duty: number;
  duty_pos: number;
  length: number;
  length_enable: boolean;
  length_counter: number;
  volume: number;
  volume_initial: number;
  volume_dir: number;
  volume_period: number;
  volume_counter: number;
  frequency: number;
  freq_divider: number;
  sweep_period: number;
  sweep_counter: number;
  sweep_dir: number;
  sweep_shift: number;
  sweep_enabled: boolean;
};

export type wave_state = {
  enabled: boolean;
  dac: boolean;
  length: number;
  length_enable: boolean;
  length_counter: number;
  volume_code: number;
  frequency: number;
  freq_divider: number;
  sample_buffer: number;
  position: number;
  wave_ram: Uint8Array;
};

export type noise_state = {
  enabled: boolean;
  dac: boolean;
  length: number;
  length_enable: boolean;
  length_counter: number;
  volume: number;
  volume_initial: number;
  volume_dir: number;
  volume_period: number;
  volume_counter: number;
  divisor_code: number;
  clock_shift: number;
  lfsr: number;
  width_mode: boolean;
  freq_divider: number;
};
