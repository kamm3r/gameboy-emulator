import {
  CPU_HZ,
  DEFAULT_MAX_BUFFERED_SAMPLES,
  DEFAULT_SAMPLE_RATE,
  NR10,
  NR11,
  NR12,
  NR13,
  NR14,
  NR21,
  NR22,
  NR23,
  NR24,
  NR30,
  NR31,
  NR32,
  NR33,
  NR34,
  NR41,
  NR42,
  NR43,
  NR44,
  NR50,
  NR51,
  NR52,
  WAVE_RAM_END,
  WAVE_RAM_START,
} from "../common";
import { mix_and_push_sample } from "./mixer";
import { tick_noise, trigger_noise } from "./noise";
import { audio_clear_samples, trim_audio_queue } from "./queue";
import { envelope_dac_on, trigger_pulse, tick_pulse } from "./pulse";
import {
  ctx,
  make_noise_channel,
  make_pulse_channel,
  make_wave_channel,
  type audio_options,
  type envelope,
  type length_counter,
  type pulse_channel,
} from "./state";
import {
  ch3_dac_on,
  tick_wave,
  trigger_wave,
  wave_ram_read,
  wave_ram_write,
} from "./wave";
import { frame_sequencer_tick } from "./frame_sequencer";

// True when the next frame sequencer step won't clock the length counters
function in_first_half(): boolean {
  return ((ctx.frame_seq_step + 1) & 1) === 1;
}

// NRx4 write: length enable (with the extra-clock quirk) and trigger
function write_nrx4(
  ch: { enabled: boolean; length: length_counter },
  value: number,
  max_length: number,
  trigger_channel: () => void,
): void {
  const lc = ch.length;
  const len_en = (value & 0x40) !== 0;
  const trigger = (value & 0x80) !== 0;
  const first = in_first_half();

  if (!lc.enabled && len_en && first && lc.counter > 0) {
    lc.counter--;

    if (lc.counter === 0 && !trigger) {
      ch.enabled = false;
    }
  }

  lc.enabled = len_en;

  if (!trigger) {
    return;
  }

  if (lc.counter === 0) {
    lc.counter = max_length;

    if (len_en && first) {
      lc.counter--;
    }
  }

  trigger_channel();
}

function write_envelope_reg(
  env: envelope,
  ch: { enabled: boolean; dac_enabled: boolean },
  value: number,
): void {
  env.initial_volume = (value >> 4) & 0x0f;
  env.add_mode = (value & 0x08) !== 0;
  env.period = value & 0x07;

  ch.dac_enabled = envelope_dac_on(value);

  if (!ch.dac_enabled) {
    ch.enabled = false;
  }
}

function update_nr52(): void {
  ctx.nr52 =
    (ctx.enabled ? 0x80 : 0) |
    0x70 |
    (ctx.ch1.enabled ? 0x01 : 0) |
    (ctx.ch2.enabled ? 0x02 : 0) |
    (ctx.ch3.enabled ? 0x04 : 0) |
    (ctx.ch4.enabled ? 0x08 : 0);
}

function power_off_apu(): void {
  const ch1_len = ctx.ch1.length.counter;
  const ch2_len = ctx.ch2.length.counter;
  const ch3_len = ctx.ch3.length.counter;
  const ch4_len = ctx.ch4.length.counter;

  ctx.ch1 = make_pulse_channel();
  ctx.ch2 = make_pulse_channel();
  ctx.ch3 = make_wave_channel();
  ctx.ch4 = make_noise_channel();

  ctx.ch1.length.counter = ch1_len;
  ctx.ch2.length.counter = ch2_len;
  ctx.ch3.length.counter = ch3_len;
  ctx.ch4.length.counter = ch4_len;

  ctx.nr50 = 0;
  ctx.nr51 = 0;
  ctx.enabled = false;

  ctx.hpf_cap_l = 0;
  ctx.hpf_cap_r = 0;
}

function power_on_apu(): void {
  ctx.enabled = true;
  ctx.frame_seq_step = 7;

  ctx.ch1.duty_pos = 0;
  ctx.ch2.duty_pos = 0;
  ctx.ch3.wave_pos = 0;
}

export function audio_init(options?: audio_options): void {
  ctx.enabled = false;

  ctx.ch1 = make_pulse_channel();
  ctx.ch2 = make_pulse_channel();
  ctx.ch3 = make_wave_channel();
  ctx.ch4 = make_noise_channel();

  ctx.nr50 = 0;
  ctx.nr51 = 0;
  ctx.nr52 = 0x70;

  ctx.wave_ram.fill(0);

  ctx.frame_seq_step = 7;

  ctx.sample_rate = options?.sample_rate ?? DEFAULT_SAMPLE_RATE;
  ctx.cycles_per_sample = CPU_HZ / ctx.sample_rate;
  ctx.sample_cycle_accum = 0;

  ctx.max_buffered_samples =
    options?.max_buffered_samples ?? DEFAULT_MAX_BUFFERED_SAMPLES;

  trim_audio_queue();
  audio_clear_samples();

  ctx.hpf_cap_l = 0;
  ctx.hpf_cap_r = 0;

  update_nr52();
}

export function audio_set_sample_rate(sample_rate: number): void {
  if (!Number.isFinite(sample_rate) || sample_rate <= 0) {
    return;
  }

  ctx.sample_rate = sample_rate;
  ctx.cycles_per_sample = CPU_HZ / sample_rate;
  ctx.sample_cycle_accum = 0;
}

// Dynamic rate control: ratio > 1 produces fewer samples, < 1 more.
// Keeps the output buffer level steady despite host clock drift.
const MAX_RATE_ADJUST = 0.005;

export function audio_set_rate_adjust(ratio: number): void {
  if (!Number.isFinite(ratio)) {
    return;
  }

  const clamped = Math.min(
    1 + MAX_RATE_ADJUST,
    Math.max(1 - MAX_RATE_ADJUST, ratio),
  );

  ctx.cycles_per_sample = (CPU_HZ / ctx.sample_rate) * clamped;
}

export function audio_set_max_buffered_samples(max: number): void {
  if (!Number.isFinite(max) || max <= 0) {
    return;
  }

  ctx.max_buffered_samples = max | 0;
  trim_audio_queue();
}

export function audio_tick(): void {
  if (ctx.enabled) {
    tick_pulse(ctx.ch1);
    tick_pulse(ctx.ch2);
    tick_wave();
    tick_noise();
  } else if (ctx.ch3.access_countdown > 0) {
    ctx.ch3.access_countdown--;
  }

  ctx.sample_cycle_accum += 1;

  while (ctx.sample_cycle_accum >= ctx.cycles_per_sample) {
    ctx.sample_cycle_accum -= ctx.cycles_per_sample;
    mix_and_push_sample();
  }
}

export function audio_on_div_falling_edge(): void {
  if (!ctx.enabled) {
    return;
  }

  frame_sequencer_tick();
}

function length_enable_bit(lc: length_counter): number {
  return (lc.enabled ? 0x40 : 0) | 0xbf;
}

export function audio_read(address: number): number {
  if (address >= WAVE_RAM_START && address <= WAVE_RAM_END) {
    return wave_ram_read(address - WAVE_RAM_START);
  }

  // Unused bits read back as 1
  switch (address) {
    case NR10: return ctx.ch1.nrx0 | 0x80;
    case NR11: return ctx.ch1.nrx1 | 0x3f;
    case NR12: return ctx.ch1.nrx2;
    case NR14: return length_enable_bit(ctx.ch1.length);
    case NR21: return ctx.ch2.nrx1 | 0x3f;
    case NR22: return ctx.ch2.nrx2;
    case NR24: return length_enable_bit(ctx.ch2.length);
    case NR30: return ctx.ch3.nr30 | 0x7f;
    case NR32: return ctx.ch3.nr32 | 0x9f;
    case NR34: return length_enable_bit(ctx.ch3.length);
    case NR42: return ctx.ch4.nr42;
    case NR43: return ctx.ch4.nr43;
    case NR44: return length_enable_bit(ctx.ch4.length);
    case NR50: return ctx.nr50;
    case NR51: return ctx.nr51;
    case NR52:
      update_nr52();
      return ctx.nr52;
    default: return 0xff; // write-only period/length registers and gaps
  }
}

// NRx1-NRx4 of a pulse channel (reg = 1..4)
function write_pulse(
  ch: pulse_channel,
  reg: number,
  value: number,
  with_sweep: boolean,
): void {
  switch (reg) {
    case 1:
      ch.nrx1 = value;
      ch.duty = (value >> 6) & 0x03;
      ch.length.counter = 64 - (value & 0x3f);
      return;
    case 2:
      ch.nrx2 = value;
      write_envelope_reg(ch.env, ch, value);
      return;
    case 3:
      ch.nrx3 = value;
      ch.period_value = (ch.period_value & 0x700) | value;
      return;
    default:
      ch.nrx4 = value & 0xc7;
      ch.period_value = (ch.period_value & 0x0ff) | ((value & 0x07) << 8);
      write_nrx4(ch, value, 64, () => trigger_pulse(ch, with_sweep));
  }
}

export function audio_write(address: number, value: number): void {
  value &= 0xff;

  if (address === NR52) {
    const turning_on = (value & 0x80) !== 0;

    if (!turning_on && ctx.enabled) {
      power_off_apu();
    } else if (turning_on && !ctx.enabled) {
      power_on_apu();
    }

    update_nr52();
    return;
  }

  if (address >= WAVE_RAM_START && address <= WAVE_RAM_END) {
    wave_ram_write(address - WAVE_RAM_START, value);
    return;
  }

  if (!ctx.enabled) {
    switch (address) {
      case NR11:
        ctx.ch1.length.counter = 64 - (value & 0x3f);
        return;

      case NR21:
        ctx.ch2.length.counter = 64 - (value & 0x3f);
        return;

      case NR31:
        ctx.ch3.length.counter = 256 - value;
        return;

      case NR41:
        ctx.ch4.length.counter = 64 - (value & 0x3f);
        return;

      default:
        return;
    }
  }

  switch (address) {
    case NR10: {
      const old_negate = ctx.ch1.sweep_negate;

      ctx.ch1.nrx0 = value & 0x7f;
      ctx.ch1.sweep_period = (value >> 4) & 0x07;
      ctx.ch1.sweep_negate = (value & 0x08) !== 0;
      ctx.ch1.sweep_shift = value & 0x07;

      if (
        old_negate &&
        !ctx.ch1.sweep_negate &&
        ctx.ch1.sweep_negate_used
      ) {
        ctx.ch1.enabled = false;
      }

      return;
    }

    case NR11:
    case NR12:
    case NR13:
    case NR14:
      write_pulse(ctx.ch1, address - NR10, value, true);
      return;

    case NR21:
    case NR22:
    case NR23:
    case NR24:
      write_pulse(ctx.ch2, address - NR21 + 1, value, false);
      return;

    case NR30:
      ctx.ch3.nr30 = value & 0x80;
      ctx.ch3.dac_enabled = ch3_dac_on(value);

      if (!ctx.ch3.dac_enabled) {
        ctx.ch3.enabled = false;
      }

      return;

    case NR31:
      ctx.ch3.nr31 = value;
      ctx.ch3.length.counter = 256 - value;
      return;

    case NR32:
      ctx.ch3.nr32 = value & 0x60;
      ctx.ch3.volume_code = (value >> 5) & 0x03;
      return;

    case NR33:
      ctx.ch3.nr33 = value;
      ctx.ch3.period_value = (ctx.ch3.period_value & 0x700) | value;
      return;

    case NR34:
      ctx.ch3.nr34 = value & 0xc7;
      ctx.ch3.period_value =
        (ctx.ch3.period_value & 0x0ff) | ((value & 0x07) << 8);
      write_nrx4(ctx.ch3, value, 256, trigger_wave);
      return;

    case NR41:
      ctx.ch4.nr41 = value;
      ctx.ch4.length.counter = 64 - (value & 0x3f);
      return;

    case NR42:
      ctx.ch4.nr42 = value;
      write_envelope_reg(ctx.ch4.env, ctx.ch4, value);
      return;

    case NR43:
      ctx.ch4.nr43 = value;
      ctx.ch4.clock_shift = (value >> 4) & 0x0f;
      ctx.ch4.lfsr_width_mode = (value & 0x08) !== 0;
      ctx.ch4.divisor_code = value & 0x07;
      return;

    case NR44:
      ctx.ch4.nr44 = value & 0xc0;
      write_nrx4(ctx.ch4, value, 64, trigger_noise);
      return;

    case NR50:
      ctx.nr50 = value;
      return;

    case NR51:
      ctx.nr51 = value;
      return;
  }
}
