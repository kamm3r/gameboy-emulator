// pulse.ts

import { DUTY_PATTERNS } from "./constants";
import { ctx } from "./state";
import type { length_counter_state } from "./length-counter";

export type pulse_channel = {
  enabled: boolean;
  dac_enabled: boolean;

  length: length_counter_state;

  duty: number;
  duty_pos: number;

  period_value: number;
  freq_timer: number;

  initial_volume: number;
  current_volume: number;
  envelope_period: number;
  envelope_add: boolean;
  envelope_timer: number;

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

const MAX_PERIOD = 0x7ff;

export function make_pulse_channel(): pulse_channel {
  return {
    enabled: false,
    dac_enabled: false,

    length: { enabled: false, counter: 0 },

    duty: 0,
    duty_pos: 0,

    period_value: 0,
    freq_timer: 0,

    initial_volume: 0,
    current_volume: 0,
    envelope_period: 0,
    envelope_add: false,
    envelope_timer: 0,

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

export function pulse_timer_reload(period_value: number): number {
  return (2048 - (period_value & MAX_PERIOD)) * 4;
}

export function envelope_dac_on(nrx2: number): boolean {
  return (nrx2 & 0xf8) !== 0;
}

export function calc_sweep_target(
  period: number,
  shift: number,
  negate: boolean,
): number {
  const delta = period >> shift;
  return negate ? period - delta : period + delta;
}

function sweep_timer_reload(period: number): number {
  return period === 0 ? 8 : period;
}

export function trigger_pulse(
  ch: pulse_channel,
  with_sweep: boolean,
): void {
  ch.enabled = ch.dac_enabled;

  // Frequency timer is reloaded with full period
  ch.freq_timer = pulse_timer_reload(ch.period_value);

  // Envelope
  ch.envelope_timer =
    ch.envelope_period === 0 ? 8 : ch.envelope_period;
  ch.current_volume = ch.initial_volume;

  if (!with_sweep) {
    return;
  }

  // Sweep
  ch.shadow_period = ch.period_value & MAX_PERIOD;
  ch.sweep_timer = sweep_timer_reload(ch.sweep_period);
  ch.sweep_enabled =
    ch.sweep_period !== 0 || ch.sweep_shift !== 0;
  ch.sweep_negate_used = false;

  // Overflow check on trigger if shift != 0
  if (ch.sweep_shift !== 0) {
    const target = calc_sweep_target(
      ch.shadow_period,
      ch.sweep_shift,
      ch.sweep_negate,
    );

    if (ch.sweep_negate) {
      ch.sweep_negate_used = true;
    }

    if (target > MAX_PERIOD) {
      ch.enabled = false;
    }
  }
}

export function pulse_output(ch: pulse_channel): number {
  if (!ch.enabled || !ch.dac_enabled) {
    return 0;
  }

  const duty_bit = DUTY_PATTERNS[ch.duty][ch.duty_pos];
  const digital = duty_bit ? ch.current_volume : 0;

  return digital / 7.5 - 1;
}

export function tick_pulse(ch: pulse_channel): void {
  if (ch.freq_timer > 0) {
    ch.freq_timer--;
  }

  if (ch.freq_timer <= 0) {
    ch.freq_timer = pulse_timer_reload(ch.period_value);
    ch.duty_pos = (ch.duty_pos + 1) & 7;
  }
}

export function step_sweep(): void {
  const ch = ctx.ch1;

  if (!ch.sweep_enabled) {
    return;
  }

  ch.sweep_timer--;

  if (ch.sweep_timer > 0) {
    return;
  }

  ch.sweep_timer = sweep_timer_reload(ch.sweep_period);

  if (ch.sweep_period === 0) {
    return;
  }

  const new_period = calc_sweep_target(
    ch.shadow_period,
    ch.sweep_shift,
    ch.sweep_negate,
  );

  if (ch.sweep_negate) {
    ch.sweep_negate_used = true;
  }

  if (new_period > MAX_PERIOD) {
    ch.enabled = false;
    return;
  }

  if (ch.sweep_shift !== 0) {
    ch.shadow_period = new_period & MAX_PERIOD;
    ch.period_value = new_period & MAX_PERIOD;

    // Second overflow check
    const second_check = calc_sweep_target(
      ch.shadow_period,
      ch.sweep_shift,
      ch.sweep_negate,
    );

    if (ch.sweep_negate) {
      ch.sweep_negate_used = true;
    }

    if (second_check > MAX_PERIOD) {
      ch.enabled = false;
    }
  }
}