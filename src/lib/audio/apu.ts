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
} from "./constants";
import { frame_sequencer_tick } from "./frame-sequencer";
import { mix_and_push_sample } from "./mixer";
import { trigger_noise, tick_noise } from "./noise";
import {
  audio_clear_samples,
  audio_consume_samples,
  audio_get_queued_sample_count,
  trim_audio_queue,
} from "./queue";
import {
  envelope_dac_on,
  trigger_pulse,
  tick_pulse,
} from "./pulse";
import {
  ctx,
  make_pulse_channel,
  make_wave_channel,
  make_noise_channel,
  type audio_options,
  type length_counter,
  type envelope,
  type pulse_channel,
} from "./state";
import {
  ch3_dac_on,
  tick_wave,
  trigger_wave,
  wave_ram_read,
  wave_ram_write,
} from "./wave";

// ── Helpers ──

/** Does the NEXT frame sequencer step clock the length counter? */
function next_step_clocks_length(): boolean {
  const next = (ctx.frame_seq_step + 1) & 7;
  return (next & 1) === 0; // steps 0,2,4,6
}

/**
 * "First half of the length period" means the next step will NOT
 * clock length – i.e., we are between a length tick and the next one.
 */
function in_first_half(): boolean {
  return !next_step_clocks_length();
}

// ── Length counter NRx4 handler ──

function handle_length_nrx4(
  lc: length_counter,
  ch_enabled: boolean,
  old_len_en: boolean,
  new_len_en: boolean,
  trigger: boolean,
  max_length: number,
  do_trigger: () => void,
): boolean {
  const first = in_first_half();

  // Extra clock when enabling length enable in first half
  if (!old_len_en && new_len_en && first && lc.counter > 0) {
    lc.counter--;
    if (lc.counter === 0 && !trigger) {
      ch_enabled = false;
    }
  }

  lc.enabled = new_len_en;

  if (trigger) {
    if (lc.counter === 0) {
      lc.counter = max_length;
      if (new_len_en && first) {
        lc.counter--;
      }
    }

    do_trigger();

    // do_trigger may have set enabled based on DAC,
    // so re-read from the channel after trigger
  }

  return ch_enabled;
}

// ── NRx4 writers ──

function write_nrx4_pulse(
  ch: pulse_channel,
  value: number,
  with_sweep: boolean,
): void {
  const old_len_en = ch.length.enabled;
  const new_len_en = (value & 0x40) !== 0;
  const trigger = (value & 0x80) !== 0;

  const result = handle_length_nrx4(
    ch.length,
    ch.enabled,
    old_len_en,
    new_len_en,
    trigger,
    64,
    () => {
      trigger_pulse(ch, with_sweep);
    },
  );

  // After trigger, ch.enabled may have been set by trigger_pulse.
  // If no trigger, use the result from length handling.
  if (!trigger) {
    ch.enabled = result;
  } else {
    // Length handling could have disabled ch before trigger ran,
    // but trigger_pulse sets enabled = dac_enabled.
    // However, if length counter hit 0 from the extra clock AND
    // trigger is set, the counter was reloaded before trigger,
    // so just keep what trigger_pulse set, but also check if
    // length handling disabled it after trigger.
    // Actually: trigger re-enables (if DAC on), then the length
    // counter state is already handled. The only case where
    // enabled should be false after trigger+length is if DAC is off
    // or sweep overflow disabled it.
    // So we keep ch.enabled as-is after trigger_pulse.
  }
}

function write_nrx4_wave(value: number): void {
  const ch = ctx.ch3;
  const old_len_en = ch.length.enabled;
  const new_len_en = (value & 0x40) !== 0;
  const trigger = (value & 0x80) !== 0;

  const result = handle_length_nrx4(
    ch.length,
    ch.enabled,
    old_len_en,
    new_len_en,
    trigger,
    256,
    () => {
      trigger_wave();
    },
  );

  if (!trigger) {
    ch.enabled = result;
  }
}

function write_nrx4_noise(value: number): void {
  const ch = ctx.ch4;
  const old_len_en = ch.length.enabled;
  const new_len_en = (value & 0x40) !== 0;
  const trigger = (value & 0x80) !== 0;

  const result = handle_length_nrx4(
    ch.length,
    ch.enabled,
    old_len_en,
    new_len_en,
    trigger,
    64,
    () => {
      trigger_noise();
    },
  );

  if (!trigger) {
    ch.enabled = result;
  }
}

// ── Envelope register writer ──

function write_envelope_reg(
  env: envelope,
  ch: { enabled: boolean; dac_enabled: boolean },
  value: number,
): void {
  env.initial_volume = (value >>> 4) & 0x0f;
  env.add_mode = (value & 0x08) !== 0;
  env.period = value & 0x07;
  ch.dac_enabled = envelope_dac_on(value);
  if (!ch.dac_enabled) {
    ch.enabled = false;
  }
}

// ── NR52 update ──

function update_nr52(): void {
  ctx.nr52 =
    (ctx.enabled ? 0x80 : 0) |
    (ctx.ch1.enabled ? 0x01 : 0) |
    (ctx.ch2.enabled ? 0x02 : 0) |
    (ctx.ch3.enabled ? 0x04 : 0) |
    (ctx.ch4.enabled ? 0x08 : 0) |
    0x70;
}

// ── Power on/off ──

function power_off_pulse(ch: pulse_channel): void {
  const len = ch.length.counter; // DMG preserves length counter
  Object.assign(ch, make_pulse_channel());
  ch.length.counter = len;
}

function power_off_apu(): void {
  ctx.enabled = false;

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
  ctx.frame_seq_step = 7;
  ctx.hpf_cap_l = 0;
  ctx.hpf_cap_r = 0;
}

function power_on_apu(): void {
  ctx.enabled = true;
  ctx.frame_seq_step = 7;
}

// ── Public API ──

export function audio_init(options?: audio_options): void {
  ctx.enabled = false;
  ctx.ch1 = make_pulse_channel();
  ctx.ch2 = make_pulse_channel();
  ctx.ch3 = make_wave_channel();
  ctx.ch4 = make_noise_channel();
  ctx.nr50 = 0;
  ctx.nr51 = 0;
  ctx.wave_ram.fill(0);
  ctx.frame_seq_step = 7;
  ctx.sample_rate = options?.sample_rate ?? DEFAULT_SAMPLE_RATE;
  ctx.cycles_per_sample = CPU_HZ / ctx.sample_rate;
  ctx.sample_cycle_accum = 0;
  ctx.max_buffered_samples =
    options?.max_buffered_samples ?? DEFAULT_MAX_BUFFERED_SAMPLES;
  audio_clear_samples();
  ctx.hpf_cap_l = 0;
  ctx.hpf_cap_r = 0;
  update_nr52();
}

export function audio_set_sample_rate(sample_rate: number): void {
  if (!Number.isFinite(sample_rate) || sample_rate <= 0) return;
  ctx.sample_rate = sample_rate;
  ctx.cycles_per_sample = CPU_HZ / sample_rate;
  ctx.sample_cycle_accum = 0;
}

export function audio_set_max_buffered_samples(
  max: number,
): void {
  if (!Number.isFinite(max) || max <= 0) return;
  ctx.max_buffered_samples = max | 0;
  trim_audio_queue();
}

export function audio_tick(): void {
  if (ctx.enabled) {
    tick_pulse(ctx.ch1);
    tick_pulse(ctx.ch2);
    tick_wave();
    tick_noise();
  }

  ctx.sample_cycle_accum += 1;
  while (ctx.sample_cycle_accum >= ctx.cycles_per_sample) {
    ctx.sample_cycle_accum -= ctx.cycles_per_sample;
    mix_and_push_sample();
  }
}

export function audio_on_div_falling_edge(): void {
  frame_sequencer_tick();
}

export function audio_read(address: number): number {
  switch (address) {
    case NR10:
      return ctx.ch1.nrx0 | 0x80;
    case NR11:
      return ctx.ch1.nrx1 | 0x3f;
    case NR12:
      return ctx.ch1.nrx2;
    case NR13:
      return 0xff;
    case NR14:
      return (ctx.ch1.length.enabled ? 0x40 : 0) | 0xbf;

    case NR21:
      return ctx.ch2.nrx1 | 0x3f;
    case NR22:
      return ctx.ch2.nrx2;
    case NR23:
      return 0xff;
    case NR24:
      return (ctx.ch2.length.enabled ? 0x40 : 0) | 0xbf;

    case NR30:
      return ctx.ch3.nr30 | 0x7f;
    case NR31:
      return 0xff;
    case NR32:
      return ctx.ch3.nr32 | 0x9f;
    case NR33:
      return 0xff;
    case NR34:
      return (ctx.ch3.length.enabled ? 0x40 : 0) | 0xbf;

    case NR41:
      return 0xff;
    case NR42:
      return ctx.ch4.nr42;
    case NR43:
      return ctx.ch4.nr43;
    case NR44:
      return (ctx.ch4.length.enabled ? 0x40 : 0) | 0xbf;

    case NR50:
      return ctx.nr50;
    case NR51:
      return ctx.nr51;
    case NR52:
      update_nr52();
      return ctx.nr52;

    default:
      if (
        address >= WAVE_RAM_START &&
        address <= WAVE_RAM_END
      ) {
        return wave_ram_read(address - WAVE_RAM_START);
      }
      return 0xff;
  }
}

export function audio_write(
  address: number,
  value: number,
): void {
  value &= 0xff;

  // NR52 is always writable
  if (address === NR52) {
    if (!(value & 0x80)) {
      power_off_apu();
    } else if (!ctx.enabled) {
      power_on_apu();
    }
    update_nr52();
    return;
  }

  // Wave RAM is always writable
  if (address >= WAVE_RAM_START && address <= WAVE_RAM_END) {
    wave_ram_write(address - WAVE_RAM_START, value);
    return;
  }

  // When APU is off, only length counters can be written (DMG)
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
    // ── CH1 ──
    case NR10: {
      const old_negate = ctx.ch1.sweep_negate;
      ctx.ch1.nrx0 = value & 0x7f;
      ctx.ch1.sweep_period = (value >>> 4) & 0x07;
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
      ctx.ch1.nrx1 = value;
      ctx.ch1.duty = (value >>> 6) & 0x03;
      ctx.ch1.length.counter = 64 - (value & 0x3f);
      return;

    case NR12:
      ctx.ch1.nrx2 = value;
      write_envelope_reg(ctx.ch1.env, ctx.ch1, value);
      return;

    case NR13:
      ctx.ch1.nrx3 = value;
      ctx.ch1.period_value =
        (ctx.ch1.period_value & 0x700) | value;
      return;

    case NR14:
      ctx.ch1.nrx4 = value;
      ctx.ch1.period_value =
        (ctx.ch1.period_value & 0xff) | ((value & 0x07) << 8);
      write_nrx4_pulse(ctx.ch1, value, true);
      return;

    // ── CH2 ──
    case NR21:
      ctx.ch2.nrx1 = value;
      ctx.ch2.duty = (value >>> 6) & 0x03;
      ctx.ch2.length.counter = 64 - (value & 0x3f);
      return;

    case NR22:
      ctx.ch2.nrx2 = value;
      write_envelope_reg(ctx.ch2.env, ctx.ch2, value);
      return;

    case NR23:
      ctx.ch2.nrx3 = value;
      ctx.ch2.period_value =
        (ctx.ch2.period_value & 0x700) | value;
      return;

    case NR24:
      ctx.ch2.nrx4 = value;
      ctx.ch2.period_value =
        (ctx.ch2.period_value & 0xff) | ((value & 0x07) << 8);
      write_nrx4_pulse(ctx.ch2, value, false);
      return;

    // ── CH3 ──
    case NR30:
      ctx.ch3.nr30 = value;
      ctx.ch3.dac_enabled = ch3_dac_on(value);
      if (!ctx.ch3.dac_enabled) ctx.ch3.enabled = false;
      return;

    case NR31:
      ctx.ch3.nr31 = value;
      ctx.ch3.length.counter = 256 - value;
      return;

    case NR32:
      ctx.ch3.nr32 = value;
      ctx.ch3.volume_code = (value >>> 5) & 0x03;
      return;

    case NR33:
      ctx.ch3.nr33 = value;
      ctx.ch3.period_value =
        (ctx.ch3.period_value & 0x700) | value;
      return;

    case NR34:
      ctx.ch3.nr34 = value;
      ctx.ch3.period_value =
        (ctx.ch3.period_value & 0xff) | ((value & 0x07) << 8);
      write_nrx4_wave(value);
      return;

    // ── CH4 ──
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
      ctx.ch4.clock_shift = (value >>> 4) & 0x0f;
      ctx.ch4.lfsr_width_mode = (value & 0x08) !== 0;
      ctx.ch4.divisor_code = value & 0x07;
      return;

    case NR44:
      ctx.ch4.nr44 = value;
      write_nrx4_noise(value);
      return;

    // ── Master ──
    case NR50:
      ctx.nr50 = value;
      return;

    case NR51:
      ctx.nr51 = value;
      return;

    default:
      break;
  }
}

export function audio_debug_state() {
  return {
    enabled: ctx.enabled,
    nr50: ctx.nr50,
    nr51: ctx.nr51,
    nr52: ctx.nr52,
    queued: audio_get_queued_sample_count(),
    sample_rate: ctx.sample_rate,
    cycles_per_sample: ctx.cycles_per_sample,
    ch1_enabled: ctx.ch1.enabled,
    ch2_enabled: ctx.ch2.enabled,
    ch3_enabled: ctx.ch3.enabled,
    ch4_enabled: ctx.ch4.enabled,
  };
}

export {
  audio_clear_samples,
  audio_consume_samples,
  audio_get_queued_sample_count,
};