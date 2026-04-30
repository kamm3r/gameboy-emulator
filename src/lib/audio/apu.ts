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
import { make_noise_channel, tick_noise, trigger_noise } from "./noise";
import {
  audio_clear_samples,
  audio_consume_samples,
  audio_get_queued_sample_count,
  trim_audio_queue,
} from "./queue";
import {
  envelope_dac_on,
  make_pulse_channel,
  tick_pulse,
  trigger_pulse,
} from "./pulse";
import { ctx, type audio_options } from "./state";
import {
  ch3_dac_on,
  make_wave_channel,
  tick_wave,
  trigger_wave,
  wave_ram_read,
  wave_ram_write,
} from "./wave";

function next_frame_step_clocks_length(): boolean {
  const next_step = (ctx.frame_seq_step + 1) & 7;
  return (next_step & 1) === 0;
}

function handle_nrx4_write(
  ch: { enabled: boolean; length_enabled: boolean; length_counter: number },
  old_length_enabled: boolean,
  new_length_enabled: boolean,
  trigger: boolean,
  on_trigger: () => void,
): void {
  const next_step_is_length = next_frame_step_clocks_length();
  const first_half = !next_step_is_length;
  const was_zero_before_write = ch.length_counter === 0;

  if (
    !old_length_enabled &&
    new_length_enabled &&
    first_half &&
    ch.length_counter > 0
  ) {
    ch.length_counter--;

    if (ch.length_counter === 0 && !trigger) {
      ch.enabled = false;
    }
  }

  ch.length_enabled = new_length_enabled;

  if (!trigger) {
    return;
  }

  on_trigger();

  if (was_zero_before_write && new_length_enabled && first_half) {
    ch.length_counter--;

    if (ch.length_counter === 0) {
      ch.enabled = false;
    }
  }
}

function write_envelope(
  ch: {
    enabled: boolean;
    dac_enabled: boolean;
    initial_volume: number;
    envelope_period: number;
    envelope_add: boolean;
  },
  value: number,
): void {
  ch.initial_volume = (value >> 4) & 0x0f;
  ch.envelope_add = (value & 0x08) !== 0;
  ch.envelope_period = value & 0x07;
  ch.dac_enabled = envelope_dac_on(value);

  if (!ch.dac_enabled) {
    ch.enabled = false;
  }
}

function apu_update_nr52(): void {
  ctx.nr52 =
    (ctx.enabled ? 0x80 : 0) |
    (ctx.ch1.enabled ? 0x01 : 0) |
    (ctx.ch2.enabled ? 0x02 : 0) |
    (ctx.ch3.enabled ? 0x04 : 0) |
    (ctx.ch4.enabled ? 0x08 : 0) |
    0x70;
}

function power_off_pulse(ch: typeof ctx.ch1): void {
  const len = ch.length_counter;

  Object.assign(ch, {
    enabled: false,
    dac_enabled: false,
    length_enabled: false,
    length_counter: len,
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
  });
}

function power_off_wave(ch: typeof ctx.ch3): void {
  const len = ch.length_counter;

  Object.assign(ch, {
    enabled: false,
    dac_enabled: false,
    length_enabled: false,
    length_counter: len,
    period_value: 0,
    freq_timer: 0,
    volume_code: 0,
    wave_pos: 0,
    sample_latch: 0,
    last_read_byte: 0,
    access_window: 0,
    nr30: 0,
    nr31: 0,
    nr32: 0,
    nr33: 0,
    nr34: 0,
  });
}

function power_off_noise(ch: typeof ctx.ch4): void {
  const len = ch.length_counter;

  Object.assign(ch, {
    enabled: false,
    dac_enabled: false,
    length_enabled: false,
    length_counter: len,
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
  });
}

function power_off_apu(): void {
  ctx.enabled = false;
  power_off_pulse(ctx.ch1);
  power_off_pulse(ctx.ch2);
  power_off_wave(ctx.ch3);
  power_off_noise(ctx.ch4);
  ctx.nr50 = 0;
  ctx.nr51 = 0;
  ctx.frame_seq_step = 7;
  ctx.div_apu_counter = 0;
  ctx.hpf_cap_l = 0;
  ctx.hpf_cap_r = 0;
}

function power_on_apu(): void {
  ctx.enabled = true;
  ctx.frame_seq_step = 7;
  ctx.div_apu_counter = 0;
}

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
  ctx.div_apu_counter = 0;
  ctx.sample_rate = options?.sample_rate ?? DEFAULT_SAMPLE_RATE;
  ctx.cycles_per_sample = CPU_HZ / ctx.sample_rate;
  ctx.sample_cycle_accum = 0;
  ctx.max_buffered_samples =
    options?.max_buffered_samples ?? DEFAULT_MAX_BUFFERED_SAMPLES;
  audio_clear_samples();
  ctx.hpf_cap_l = 0;
  ctx.hpf_cap_r = 0;
  apu_update_nr52();
}

export function audio_set_sample_rate(sample_rate: number): void {
  if (!Number.isFinite(sample_rate) || sample_rate <= 0) {
    return;
  }

  ctx.sample_rate = sample_rate;
  ctx.cycles_per_sample = CPU_HZ / sample_rate;
  ctx.sample_cycle_accum = 0;
}

export function audio_set_max_buffered_samples(
  max_buffered_samples: number,
): void {
  if (!Number.isFinite(max_buffered_samples) || max_buffered_samples <= 0) {
    return;
  }

  ctx.max_buffered_samples = max_buffered_samples | 0;
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
  if (ctx.enabled) {
    frame_sequencer_tick();
  }
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
      return ctx.ch1.nrx4 | 0xbf;

    case NR21:
      return ctx.ch2.nrx1 | 0x3f;
    case NR22:
      return ctx.ch2.nrx2;
    case NR23:
      return 0xff;
    case NR24:
      return ctx.ch2.nrx4 | 0xbf;

    case NR30:
      return ctx.ch3.nr30 | 0x7f;
    case NR31:
      return 0xff;
    case NR32:
      return ctx.ch3.nr32 | 0x9f;
    case NR33:
      return 0xff;
    case NR34:
      return ctx.ch3.nr34 | 0xbf;

    case NR41:
      return 0xff;
    case NR42:
      return ctx.ch4.nr42;
    case NR43:
      return ctx.ch4.nr43;
    case NR44:
      return ctx.ch4.nr44 | 0xbf;

    case NR50:
      return ctx.nr50;
    case NR51:
      return ctx.nr51;
    case NR52:
      apu_update_nr52();
      return ctx.nr52;

    default:
      return address >= WAVE_RAM_START && address <= WAVE_RAM_END
        ? wave_ram_read(address - WAVE_RAM_START)
        : 0xff;
  }
}

export function audio_write(address: number, value: number): void {
  value &= 0xff;

  if (address === NR52) {
    if (!(value & 0x80)) {
      power_off_apu();
    } else if (!ctx.enabled) {
      power_on_apu();
    }

    apu_update_nr52();
    return;
  }

  if (!ctx.enabled) {
    if (address === NR11) {
      ctx.ch1.length_counter = 64 - (value & 0x3f);
    } else if (address === NR21) {
      ctx.ch2.length_counter = 64 - (value & 0x3f);
    } else if (address === NR31) {
      ctx.ch3.length_counter = 256 - value;
    } else if (address === NR41) {
      ctx.ch4.length_counter = 64 - (value & 0x3f);
    } else if (address >= WAVE_RAM_START && address <= WAVE_RAM_END) {
      wave_ram_write(address - WAVE_RAM_START, value);
    }

    return;
  }

  switch (address) {
    case NR10: {
      const old_negate = ctx.ch1.sweep_negate;

      ctx.ch1.nrx0 = value & 0x7f;
      ctx.ch1.sweep_period = (value >> 4) & 0x07;
      ctx.ch1.sweep_negate = (value & 0x08) !== 0;
      ctx.ch1.sweep_shift = value & 0x07;

      if (old_negate && !ctx.ch1.sweep_negate && ctx.ch1.sweep_negate_used) {
        ctx.ch1.enabled = false;
      }

      return;
    }

    case NR11:
      ctx.ch1.nrx1 = value;
      ctx.ch1.duty = (value >> 6) & 0x03;
      ctx.ch1.length_counter = 64 - (value & 0x3f);
      return;

    case NR12:
      ctx.ch1.nrx2 = value;
      write_envelope(ctx.ch1, value);
      return;

    case NR13:
      ctx.ch1.nrx3 = value;
      ctx.ch1.period_value = (ctx.ch1.period_value & 0x0700) | value;
      return;

    case NR14: {
      const old_len_en = ctx.ch1.length_enabled;

      ctx.ch1.nrx4 = value;
      ctx.ch1.period_value =
        (ctx.ch1.period_value & 0x00ff) | ((value & 0x07) << 8);

      handle_nrx4_write(
        ctx.ch1,
        old_len_en,
        (value & 0x40) !== 0,
        (value & 0x80) !== 0,
        () => trigger_pulse(ctx.ch1, true),
      );

      return;
    }

    case NR21:
      ctx.ch2.nrx1 = value;
      ctx.ch2.duty = (value >> 6) & 0x03;
      ctx.ch2.length_counter = 64 - (value & 0x3f);
      return;

    case NR22:
      ctx.ch2.nrx2 = value;
      write_envelope(ctx.ch2, value);
      return;

    case NR23:
      ctx.ch2.nrx3 = value;
      ctx.ch2.period_value = (ctx.ch2.period_value & 0x0700) | value;
      return;

    case NR24: {
      const old_len_en = ctx.ch2.length_enabled;

      ctx.ch2.nrx4 = value;
      ctx.ch2.period_value =
        (ctx.ch2.period_value & 0x00ff) | ((value & 0x07) << 8);

      handle_nrx4_write(
        ctx.ch2,
        old_len_en,
        (value & 0x40) !== 0,
        (value & 0x80) !== 0,
        () => trigger_pulse(ctx.ch2, false),
      );

      return;
    }

    case NR30:
      ctx.ch3.nr30 = value;
      ctx.ch3.dac_enabled = ch3_dac_on(value);

      if (!ctx.ch3.dac_enabled) {
        ctx.ch3.enabled = false;
      }

      return;

    case NR31:
      ctx.ch3.nr31 = value;
      ctx.ch3.length_counter = 256 - value;
      return;

    case NR32:
      ctx.ch3.nr32 = value;
      ctx.ch3.volume_code = (value >> 5) & 0x03;
      return;

    case NR33:
      ctx.ch3.nr33 = value;
      ctx.ch3.period_value = (ctx.ch3.period_value & 0x0700) | value;
      return;

    case NR34: {
      const old_len_en = ctx.ch3.length_enabled;

      ctx.ch3.nr34 = value;
      ctx.ch3.period_value =
        (ctx.ch3.period_value & 0x00ff) | ((value & 0x07) << 8);

      handle_nrx4_write(
        ctx.ch3,
        old_len_en,
        (value & 0x40) !== 0,
        (value & 0x80) !== 0,
        () => trigger_wave(),
      );

      return;
    }

    case NR41:
      ctx.ch4.nr41 = value;
      ctx.ch4.length_counter = 64 - (value & 0x3f);
      return;

    case NR42:
      ctx.ch4.nr42 = value;
      write_envelope(ctx.ch4, value);
      return;

    case NR43:
      ctx.ch4.nr43 = value;
      ctx.ch4.clock_shift = (value >> 4) & 0x0f;
      ctx.ch4.lfsr_width_mode = (value & 0x08) !== 0;
      ctx.ch4.divisor_code = value & 0x07;
      return;

    case NR44: {
      const old_len_en = ctx.ch4.length_enabled;
      const new_len_en = (value & 0x40) !== 0;
      const trigger = (value & 0x80) !== 0;

      ctx.ch4.nr44 = value;

      handle_nrx4_write(ctx.ch4, old_len_en, new_len_en, trigger, () =>
        trigger_noise(),
      );

      return;
    }

    case NR50:
      ctx.nr50 = value;
      return;

    case NR51:
      ctx.nr51 = value;
      return;

    default:
      if (address >= WAVE_RAM_START && address <= WAVE_RAM_END) {
        wave_ram_write(address - WAVE_RAM_START, value);
      }
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