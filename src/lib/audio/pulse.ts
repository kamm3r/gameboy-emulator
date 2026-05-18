import { DUTY_PATTERNS } from "../common";
import { ctx, type pulse_channel } from "./state";

const MAX_PERIOD = 0x7ff;

export function envelope_dac_on(nrx2: number): boolean {
  return (nrx2 & 0xf8) !== 0;
}

export function pulse_timer_reload(period_value: number): number {
  return (2048 - (period_value & MAX_PERIOD)) * 4;
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

export function trigger_pulse(ch: pulse_channel, with_sweep: boolean): void {
  ch.enabled = ch.dac_enabled;

  ch.freq_timer = pulse_timer_reload(ch.period_value);

  ch.env.timer = ch.env.period === 0 ? 8 : ch.env.period;
  ch.env.current_volume = ch.env.initial_volume;

  if (!with_sweep) {
    return;
  }

  ch.shadow_period = ch.period_value & MAX_PERIOD;
  ch.sweep_timer = sweep_timer_reload(ch.sweep_period);
  ch.sweep_enabled = ch.sweep_period !== 0 || ch.sweep_shift !== 0;
  ch.sweep_negate_used = false;

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
  const digital = duty_bit ? ch.env.current_volume : 0;

  return digital / 7.5 - 1.0;
}

export function tick_pulse(ch: pulse_channel): void {
  ch.freq_timer--;

  if (ch.freq_timer <= 0) {
    ch.freq_timer += pulse_timer_reload(ch.period_value);
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

    const second = calc_sweep_target(
      ch.shadow_period,
      ch.sweep_shift,
      ch.sweep_negate,
    );

    if (ch.sweep_negate) {
      ch.sweep_negate_used = true;
    }

    if (second > MAX_PERIOD) {
      ch.enabled = false;
    }
  }
}