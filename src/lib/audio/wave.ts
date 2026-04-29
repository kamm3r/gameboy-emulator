import { ctx } from "./state";

export type wave_channel = {
  enabled: boolean;
  dac_enabled: boolean;

  length_enabled: boolean;
  length_counter: number;

  period_value: number;
  freq_timer: number;

  volume_code: number;
  wave_pos: number;
  sample_latch: number;

  nr30: number;
  nr31: number;
  nr32: number;
  nr33: number;
  nr34: number;
};

export function make_wave_channel(): wave_channel {
  return {
    enabled: false,
    dac_enabled: false,

    length_enabled: false,
    length_counter: 0,

    period_value: 0,
    freq_timer: 0,

    volume_code: 0,
    wave_pos: 0,
    sample_latch: 0,

    nr30: 0,
    nr31: 0,
    nr32: 0,
    nr33: 0,
    nr34: 0,
  };
}

export function ch3_dac_on(nr30: number): boolean {
  return (nr30 & 0x80) !== 0;
}

export function wave_timer_reload(period_value: number): number {
  return (2048 - (period_value & 0x7ff)) * 2;
}

function wave_read_sample(sample_index: number): number {
  const byte = ctx.wave_ram[sample_index >> 1];

  // GB wave RAM plays high nibble first, then low nibble.
  return (sample_index & 1) === 0 ? (byte >> 4) & 0x0f : byte & 0x0f;
}

export function trigger_wave(): void {
  const ch = ctx.ch3;

  ch.enabled = ch.dac_enabled;

  if (ch.length_counter === 0) {
    ch.length_counter = 256;
  }

  ch.freq_timer = wave_timer_reload(ch.period_value);
  ch.wave_pos = 0;
  ch.sample_latch = wave_read_sample(0);
}

export function wave_output(): number {
  const ch = ctx.ch3;

  if (!ch.enabled || !ch.dac_enabled || ch.volume_code === 0) {
    return 0;
  }

  let sample = ch.sample_latch & 0x0f;

  switch (ch.volume_code) {
    case 1:
      break;
    case 2:
      sample >>= 1;
      break;
    case 3:
      sample >>= 2;
      break;
  }

  return 1 - (sample / 15) * 2;
}

export function tick_wave(): void {
  const ch = ctx.ch3;

  if (ch.freq_timer > 0) {
    ch.freq_timer--;
  }

  if (ch.freq_timer <= 0) {
    ch.freq_timer = wave_timer_reload(ch.period_value);
    ch.wave_pos = (ch.wave_pos + 1) & 31;
    ch.sample_latch = wave_read_sample(ch.wave_pos);
  }
}