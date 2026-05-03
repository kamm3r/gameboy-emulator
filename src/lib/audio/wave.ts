// wave.ts

import { ctx } from "./state";
import type { length_counter_state } from "./length-counter";

export type wave_channel = {
  enabled: boolean;
  dac_enabled: boolean;

  length: length_counter_state;

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

    length: { enabled: false, counter: 0 },

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

export function wave_ram_read(index: number): number {
  const ch = ctx.ch3;
  const i = index & 0x0f;

  if (!ch.enabled) {
    return ctx.wave_ram[i];
  }

  // When channel is on (DMG), wave RAM is only accessible
  // when the wave channel has just read from it (same T-cycle).
  // We approximate this: return the byte at the current read position.
  return ctx.wave_ram[ch.wave_pos >> 1];
}

export function wave_ram_write(
  index: number,
  value: number,
): void {
  const ch = ctx.ch3;
  const i = index & 0x0f;
  const v = value & 0xff;

  if (!ch.enabled) {
    ctx.wave_ram[i] = v;
    return;
  }

  // When channel is on (DMG), writes go to the byte the channel
  // is currently reading from.
  ctx.wave_ram[ch.wave_pos >> 1] = v;
}

export function trigger_wave(): void {
  const ch = ctx.ch3;

  ch.enabled = ch.dac_enabled;

  ch.freq_timer = wave_timer_reload(ch.period_value) + 6;
  ch.wave_pos = 0;
}

export function wave_output(): number {
  const ch = ctx.ch3;

  if (!ch.enabled || !ch.dac_enabled) {
    return 0;
  }

  let sample = ch.sample_latch & 0x0f;

  switch (ch.volume_code) {
    case 0:
      sample >>= 4;
      break;
    case 1:
      break;
    case 2:
      sample >>= 1;
      break;
    case 3:
      sample >>= 2;
      break;
  }

  return sample / 7.5 - 1;
}

export function tick_wave(): void {
  const ch = ctx.ch3;

  if (ch.freq_timer > 0) {
    ch.freq_timer--;
  }

  if (ch.freq_timer <= 0) {
    ch.freq_timer = wave_timer_reload(ch.period_value);
    ch.wave_pos = (ch.wave_pos + 1) & 31;

    const byte_index = (ch.wave_pos >> 1) & 0x0f;
    const byte = ctx.wave_ram[byte_index];

    ch.sample_latch =
      (ch.wave_pos & 1) === 0
        ? (byte >> 4) & 0x0f
        : byte & 0x0f;
  }
}