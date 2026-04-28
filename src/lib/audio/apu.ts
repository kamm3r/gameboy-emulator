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
import { ch3_dac_on, make_wave_channel, tick_wave, trigger_wave } from "./wave";

function apu_update_nr52(): void {
  let value = ctx.enabled ? 0x80 : 0x00;

  if (ctx.ch1.enabled) {
    value |= 0x01;
  }

  if (ctx.ch2.enabled) {
    value |= 0x02;
  }

  if (ctx.ch3.enabled) {
    value |= 0x04;
  }

  if (ctx.ch4.enabled) {
    value |= 0x08;
  }

  ctx.nr52 = value | 0x70;
}

function power_off_pulse(ch: typeof ctx.ch1): void {
  const nrx1 = ch.nrx1;
  const length_counter = ch.length_counter;

  ch.enabled = false;
  ch.dac_enabled = false;

  ch.length_enabled = false;
  ch.length_counter = length_counter;

  ch.duty = (nrx1 >> 6) & 0x03;
  ch.duty_pos = 0;

  ch.period_value = 0;
  ch.freq_timer = 0;

  ch.initial_volume = 0;
  ch.current_volume = 0;
  ch.envelope_period = 0;
  ch.envelope_add = false;
  ch.envelope_timer = 0;

  ch.sweep_period = 0;
  ch.sweep_negate = false;
  ch.sweep_shift = 0;
  ch.sweep_timer = 0;
  ch.sweep_enabled = false;
  ch.shadow_period = 0;
  ch.sweep_negate_used = false;

  ch.nrx0 = 0;
  ch.nrx1 = nrx1;
  ch.nrx2 = 0;
  ch.nrx3 = 0;
  ch.nrx4 = 0;
}

function power_off_wave(ch: typeof ctx.ch3): void {
  const nr31 = ch.nr31;
  const length_counter = ch.length_counter;

  ch.enabled = false;
  ch.dac_enabled = false;

  ch.length_enabled = false;
  ch.length_counter = length_counter;

  ch.period_value = 0;
  ch.volume_code = 0;

  ch.nr30 = 0;
  ch.nr31 = nr31;
  ch.nr32 = 0;
  ch.nr33 = 0;
  ch.nr34 = 0;
}

function power_off_noise(ch: typeof ctx.ch4): void {
  const nr41 = ch.nr41;
  const length_counter = ch.length_counter;

  ch.enabled = false;
  ch.dac_enabled = false;

  ch.length_enabled = false;
  ch.length_counter = length_counter;

  ch.initial_volume = 0;
  ch.current_volume = 0;
  ch.envelope_period = 0;
  ch.envelope_add = false;
  ch.envelope_timer = 0;

  ch.clock_shift = 0;
  ch.lfsr_width_mode = false;
  ch.divisor_code = 0;

  ch.nr41 = nr41;
  ch.nr42 = 0;
  ch.nr43 = 0;
  ch.nr44 = 0;
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
  // This function advances the APU by exactly 1 T-cycle.
  // The frame sequencer must be clocked externally from DIV falling edges,
  // not from an internal 8192-cycle counter here.

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
      if (address >= WAVE_RAM_START && address <= WAVE_RAM_END) {
        return ctx.wave_ram[address - WAVE_RAM_START];
      }

      return 0xff;
  }
}

export function audio_write(address: number, value: number): void {
  value &= 0xff;

  if (address === NR52) {
    const enable = (value & 0x80) !== 0;

    if (!enable) {
      power_off_apu();
    } else if (!ctx.enabled) {
      power_on_apu();
    }

    apu_update_nr52();
    return;
  }

  const can_write_while_off =
    address === NR11 ||
    address === NR21 ||
    address === NR31 ||
    address === NR41 ||
    (address >= WAVE_RAM_START && address <= WAVE_RAM_END);

  if (!ctx.enabled && !can_write_while_off) {
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
      ctx.ch1.initial_volume = (value >> 4) & 0x0f;
      ctx.ch1.envelope_add = (value & 0x08) !== 0;
      ctx.ch1.envelope_period = value & 0x07;
      ctx.ch1.dac_enabled = envelope_dac_on(value);

      if (!ctx.ch1.dac_enabled) {
        ctx.ch1.enabled = false;
      }

      return;

    case NR13:
      ctx.ch1.nrx3 = value;
      ctx.ch1.period_value = (ctx.ch1.period_value & 0x0700) | value;
      return;

    case NR14:
      ctx.ch1.nrx4 = value;
      ctx.ch1.length_enabled = (value & 0x40) !== 0;
      ctx.ch1.period_value =
        (ctx.ch1.period_value & 0x00ff) | ((value & 0x07) << 8);

      if (value & 0x80) {
        trigger_pulse(ctx.ch1, true);
      }

      return;

    case NR21:
      ctx.ch2.nrx1 = value;
      ctx.ch2.duty = (value >> 6) & 0x03;
      ctx.ch2.length_counter = 64 - (value & 0x3f);
      return;

    case NR22:
      ctx.ch2.nrx2 = value;
      ctx.ch2.initial_volume = (value >> 4) & 0x0f;
      ctx.ch2.envelope_add = (value & 0x08) !== 0;
      ctx.ch2.envelope_period = value & 0x07;
      ctx.ch2.dac_enabled = envelope_dac_on(value);

      if (!ctx.ch2.dac_enabled) {
        ctx.ch2.enabled = false;
      }

      return;

    case NR23:
      ctx.ch2.nrx3 = value;
      ctx.ch2.period_value = (ctx.ch2.period_value & 0x0700) | value;
      return;

    case NR24:
      ctx.ch2.nrx4 = value;
      ctx.ch2.length_enabled = (value & 0x40) !== 0;
      ctx.ch2.period_value =
        (ctx.ch2.period_value & 0x00ff) | ((value & 0x07) << 8);

      if (value & 0x80) {
        trigger_pulse(ctx.ch2, false);
      }

      return;

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

    case NR34:
      ctx.ch3.nr34 = value;
      ctx.ch3.length_enabled = (value & 0x40) !== 0;
      ctx.ch3.period_value =
        (ctx.ch3.period_value & 0x00ff) | ((value & 0x07) << 8);

      if (value & 0x80) {
        trigger_wave();
      }

      return;

    case NR41:
      ctx.ch4.nr41 = value;
      ctx.ch4.length_counter = 64 - (value & 0x3f);
      return;

    case NR42:
      ctx.ch4.nr42 = value;
      ctx.ch4.initial_volume = (value >> 4) & 0x0f;
      ctx.ch4.envelope_add = (value & 0x08) !== 0;
      ctx.ch4.envelope_period = value & 0x07;
      ctx.ch4.dac_enabled = envelope_dac_on(value);

      if (!ctx.ch4.dac_enabled) {
        ctx.ch4.enabled = false;
      }

      return;

    case NR43:
      ctx.ch4.nr43 = value;
      ctx.ch4.clock_shift = (value >> 4) & 0x0f;
      ctx.ch4.lfsr_width_mode = (value & 0x08) !== 0;
      ctx.ch4.divisor_code = value & 0x07;
      return;

    case NR44:
      ctx.ch4.nr44 = value;
      ctx.ch4.length_enabled = (value & 0x40) !== 0;

      if (value & 0x80) {
        trigger_noise();
      }

      return;

    case NR50:
      ctx.nr50 = value;
      return;

    case NR51:
      ctx.nr51 = value;
      return;

    default:
      if (address >= WAVE_RAM_START && address <= WAVE_RAM_END) {
        ctx.wave_ram[address - WAVE_RAM_START] = value;
      }

      return;
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
