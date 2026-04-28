import { DUTY_PATTERNS } from "./constants";
import { ctx } from "./state";

export type pulse_channel = {
  enabled: boolean;
  dac_enabled: boolean;

  length_enabled: boolean;
  length_counter: number;

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

export function make_pulse_channel(): pulse_channel {
  return {
    enabled: false,
    dac_enabled: false,
    length_enabled: false,
    length_counter: 0,
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
  return (2048 - period_value) * 4;
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

export function trigger_pulse(ch: pulse_channel, with_sweep: boolean): void {
  ch.enabled = ch.dac_enabled;

  if (ch.length_counter === 0) {
    ch.length_counter = 64;
  }

  ch.freq_timer = pulse_timer_reload(ch.period_value);
  ch.envelope_timer = ch.envelope_period === 0 ? 8 : ch.envelope_period;
  ch.current_volume = ch.initial_volume;

  if (with_sweep) {
    ch.shadow_period = ch.period_value;
    ch.sweep_timer = ch.sweep_period === 0 ? 8 : ch.sweep_period;
    ch.sweep_enabled = ch.sweep_period !== 0 || ch.sweep_shift !== 0;
    ch.sweep_negate_used = false;

    // On trigger, if shift != 0, hardware performs overflow check only.
    // It does not write the new period back.
    if (ch.sweep_shift !== 0) {
      if (ch.sweep_negate) {
        ch.sweep_negate_used = true;
      }

      const new_period = calc_sweep_target(
        ch.shadow_period,
        ch.sweep_shift,
        ch.sweep_negate,
      );

      if (new_period > 2047) {
        ch.enabled = false;
      }
    }
  }
}

export function pulse_output(ch: pulse_channel): number {
  if (!ch.enabled || !ch.dac_enabled || ch.current_volume === 0) {
    return 0;
  }

  const bit = DUTY_PATTERNS[ch.duty][ch.duty_pos];
  const digital = bit ? ch.current_volume : 0;

  return 1 - (digital / 15) * 2;
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

  if (!ch.enabled || !ch.sweep_enabled) {
    return;
  }

  ch.sweep_timer--;

  if (ch.sweep_timer > 0) {
    return;
  }

  // Period 0 is treated as 8.
  ch.sweep_timer = ch.sweep_period === 0 ? 8 : ch.sweep_period;

  // shift = 0 => no calculation on sweep clock
  if (ch.sweep_shift === 0) {
    return;
  }

  if (ch.sweep_negate) {
    ch.sweep_negate_used = true;
  }

  const new_period = calc_sweep_target(
    ch.shadow_period,
    ch.sweep_shift,
    ch.sweep_negate,
  );

  if (new_period > 2047) {
    ch.enabled = false;
    return;
  }

  ch.shadow_period = new_period;
  ch.period_value = new_period;
  ch.nrx3 = new_period & 0xff;
  ch.nrx4 = (ch.nrx4 & 0xf8) | ((new_period >> 8) & 0x07);

  const overflow_check = calc_sweep_target(
    ch.shadow_period,
    ch.sweep_shift,
    ch.sweep_negate,
  );

  if (overflow_check > 2047) {
    ch.enabled = false;
  }
}