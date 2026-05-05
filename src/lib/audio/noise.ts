import { NOISE_DIVISORS } from "./constants";
import { ctx } from "./state";

export function noise_timer_reload(
  divisor_code: number,
  clock_shift: number,
): number {
  return NOISE_DIVISORS[divisor_code & 7] << (clock_shift & 0x0f);
}

export function trigger_noise(): void {
  const ch = ctx.ch4;

  ch.enabled = ch.dac_enabled;
  ch.freq_timer = noise_timer_reload(ch.divisor_code, ch.clock_shift);
  ch.env.timer = ch.env.period === 0 ? 8 : ch.env.period;
  ch.env.current_volume = ch.env.initial_volume;
  ch.lfsr = 0x7fff;
}

export function noise_output(): number {
  const ch = ctx.ch4;

  if (!ch.enabled || !ch.dac_enabled) {
    return 0;
  }

  const digital = (ch.lfsr & 1) === 0 ? ch.env.current_volume : 0;

  return digital / 7.5 - 1.0;
}

export function tick_noise(): void {
  const ch = ctx.ch4;

  ch.freq_timer--;

  if (ch.freq_timer <= 0) {
    ch.freq_timer += noise_timer_reload(ch.divisor_code, ch.clock_shift);

    const xor = (ch.lfsr & 1) ^ ((ch.lfsr >> 1) & 1);
    ch.lfsr = (ch.lfsr >> 1) | (xor << 14);

    if (ch.lfsr_width_mode) {
      ch.lfsr = (ch.lfsr & ~(1 << 6)) | (xor << 6);
    }
  }
}