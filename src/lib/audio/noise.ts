// noise.ts

import { NOISE_DIVISORS } from "./constants";
import { ctx } from "./state";
import type { length_counter_state } from "./length-counter";

export type noise_channel = {
  enabled: boolean;
  dac_enabled: boolean;

  length: length_counter_state;

  clock_shift: number;
  lfsr_width_mode: boolean;
  divisor_code: number;
  freq_timer: number;
  lfsr: number;

  initial_volume: number;
  current_volume: number;
  envelope_period: number;
  envelope_add: boolean;
  envelope_timer: number;

  nr41: number;
  nr42: number;
  nr43: number;
  nr44: number;
};

export function make_noise_channel(): noise_channel {
  return {
    enabled: false,
    dac_enabled: false,

    length: { enabled: false, counter: 0 },

    clock_shift: 0,
    lfsr_width_mode: false,
    divisor_code: 0,
    freq_timer: 8,
    lfsr: 0x7fff,

    initial_volume: 0,
    current_volume: 0,
    envelope_period: 0,
    envelope_add: false,
    envelope_timer: 0,

    nr41: 0,
    nr42: 0,
    nr43: 0,
    nr44: 0,
  };
}

export function noise_timer_reload(
  divisor_code: number,
  clock_shift: number,
): number {
  return NOISE_DIVISORS[divisor_code & 7] << (clock_shift & 0x0f);
}

export function trigger_noise(): void {
  const ch = ctx.ch4;

  ch.enabled = ch.dac_enabled;

  ch.freq_timer = noise_timer_reload(
    ch.divisor_code,
    ch.clock_shift,
  );
  ch.envelope_timer =
    ch.envelope_period === 0 ? 8 : ch.envelope_period;
  ch.current_volume = ch.initial_volume;
  ch.lfsr = 0x7fff;
}

export function noise_output(): number {
  const ch = ctx.ch4;

  if (!ch.enabled || !ch.dac_enabled) {
    return 0;
  }

  const digital = (ch.lfsr & 1) === 0 ? ch.current_volume : 0;
  return digital / 7.5 - 1;
}

export function tick_noise(): void {
  const ch = ctx.ch4;

  if (ch.freq_timer > 0) {
    ch.freq_timer--;
  }

  if (ch.freq_timer <= 0) {
    ch.freq_timer = noise_timer_reload(
      ch.divisor_code,
      ch.clock_shift,
    );

    const xor = (ch.lfsr & 1) ^ ((ch.lfsr >> 1) & 1);
    ch.lfsr = (ch.lfsr >> 1) | (xor << 14);

    if (ch.lfsr_width_mode) {
      ch.lfsr = (ch.lfsr & ~(1 << 6)) | (xor << 6);
    }
  }
}