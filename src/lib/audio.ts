import { BIT } from "@/lib/common";

const CPU_HZ = 4_194_304;
const DEFAULT_SAMPLE_RATE = 48_000;
const DEFAULT_MAX_BUFFERED_SAMPLES = 16_384;

const NR10 = 0xff10;
const NR11 = 0xff11;
const NR12 = 0xff12;
const NR13 = 0xff13;
const NR14 = 0xff14;

const NR21 = 0xff16;
const NR22 = 0xff17;
const NR23 = 0xff18;
const NR24 = 0xff19;

const NR30 = 0xff1a;
const NR31 = 0xff1b;
const NR32 = 0xff1c;
const NR33 = 0xff1d;
const NR34 = 0xff1e;

const NR41 = 0xff20;
const NR42 = 0xff21;
const NR43 = 0xff22;
const NR44 = 0xff23;

const NR50 = 0xff24;
const NR51 = 0xff25;
const NR52 = 0xff26;

const WAVE_RAM_START = 0xff30;
const WAVE_RAM_END = 0xff3f;

type pulse_channel = {
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

  nrx0: number;
  nrx1: number;
  nrx2: number;
  nrx3: number;
  nrx4: number;
};

type wave_channel = {
  enabled: boolean;
  dac_enabled: boolean;

  length_enabled: boolean;
  length_counter: number;

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

type noise_channel = {
  enabled: boolean;
  dac_enabled: boolean;

  length_enabled: boolean;
  length_counter: number;

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

export type audio_options = {
  sample_rate?: number;
  max_buffered_samples?: number;
};

export type audio_sample_chunk = {
  left: Float32Array;
  right: Float32Array;
};

type apu_context = {
  enabled: boolean;

  ch1: pulse_channel;
  ch2: pulse_channel;
  ch3: wave_channel;
  ch4: noise_channel;

  nr50: number;
  nr51: number;
  nr52: number;

  wave_ram: Uint8Array;

  frame_seq_step: number;
  div_apu_counter: number;

  sample_rate: number;
  cycles_per_sample: number;
  sample_cycle_accum: number;
  max_buffered_samples: number;

  sample_queue_l: number[];
  sample_queue_r: number[];
};

const DUTY_PATTERNS = [
  [0, 1, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 0, 0, 0, 0, 0],
  [0, 1, 1, 1, 1, 0, 0, 0],
  [1, 0, 0, 1, 1, 1, 1, 1],
] as const;

const NOISE_DIVISORS = [8, 16, 32, 48, 64, 80, 96, 112];

const ctx: apu_context = {
  enabled: false,

  ch1: make_pulse_channel(),
  ch2: make_pulse_channel(),

  ch3: {
    enabled: false,
    dac_enabled: false,
    length_enabled: false,
    length_counter: 0,
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
  },

  ch4: {
    enabled: false,
    dac_enabled: false,
    length_enabled: false,
    length_counter: 0,
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
  },

  nr50: 0,
  nr51: 0,
  nr52: 0,

  wave_ram: new Uint8Array(16),

  frame_seq_step: 0,
  div_apu_counter: 0,

  sample_rate: DEFAULT_SAMPLE_RATE,
  cycles_per_sample: CPU_HZ / DEFAULT_SAMPLE_RATE,
  sample_cycle_accum: 0,
  max_buffered_samples: DEFAULT_MAX_BUFFERED_SAMPLES,

  sample_queue_l: [],
  sample_queue_r: [],
};

function make_pulse_channel(): pulse_channel {
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

    nrx0: 0,
    nrx1: 0,
    nrx2: 0,
    nrx3: 0,
    nrx4: 0,
  };
}

function reset_wave_channel(): wave_channel {
  return {
    enabled: false,
    dac_enabled: false,
    length_enabled: false,
    length_counter: 0,
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

function reset_noise_channel(): noise_channel {
  return {
    enabled: false,
    dac_enabled: false,
    length_enabled: false,
    length_counter: 0,
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

function clamp_sample(v: number): number {
  if (v > 1) {
    return 1;
  }

  if (v < -1) {
    return -1;
  }

  return v;
}

function pulse_timer_reload(period_value: number): number {
  return (2048 - period_value) * 4;
}

function wave_timer_reload(period_value: number): number {
  return (2048 - period_value) * 2;
}

function noise_timer_reload(divisor_code: number, clock_shift: number): number {
  return NOISE_DIVISORS[divisor_code] << clock_shift;
}

function envelope_dac_on(nrx2: number): boolean {
  return (nrx2 & 0xf8) !== 0;
}

function ch3_dac_on(nr30: number): boolean {
  return (nr30 & 0x80) !== 0;
}

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

export function audio_init(options?: audio_options): void {
  ctx.enabled = false;

  ctx.ch1 = make_pulse_channel();
  ctx.ch2 = make_pulse_channel();
  ctx.ch3 = reset_wave_channel();
  ctx.ch4 = reset_noise_channel();

  ctx.nr50 = 0;
  ctx.nr51 = 0;
  ctx.wave_ram.fill(0);

  ctx.frame_seq_step = 0;
  ctx.div_apu_counter = 0;

  ctx.sample_rate = options?.sample_rate ?? DEFAULT_SAMPLE_RATE;
  ctx.cycles_per_sample = CPU_HZ / ctx.sample_rate;
  ctx.sample_cycle_accum = 0;
  ctx.max_buffered_samples =
    options?.max_buffered_samples ?? DEFAULT_MAX_BUFFERED_SAMPLES;

  ctx.sample_queue_l.length = 0;
  ctx.sample_queue_r.length = 0;

  apu_update_nr52();
}

export function audio_set_sample_rate(sample_rate: number): void {
  if (!Number.isFinite(sample_rate) || sample_rate <= 0) {
    return;
  }

  ctx.sample_rate = sample_rate;
  ctx.cycles_per_sample = CPU_HZ / sample_rate;
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

function step_length(channel: {
  enabled: boolean;
  length_enabled: boolean;
  length_counter: number;
}): void {
  if (!channel.enabled || !channel.length_enabled) {
    return;
  }

  if (channel.length_counter > 0) {
    channel.length_counter--;
    if (channel.length_counter === 0) {
      channel.enabled = false;
    }
  }
}

function step_envelope(channel: {
  enabled: boolean;
  dac_enabled: boolean;
  current_volume: number;
  envelope_period: number;
  envelope_add: boolean;
  envelope_timer: number;
}): void {
  if (!channel.enabled || !channel.dac_enabled) {
    return;
  }

  if (channel.envelope_period === 0) {
    return;
  }

  channel.envelope_timer--;
  if (channel.envelope_timer > 0) {
    return;
  }

  channel.envelope_timer = channel.envelope_period;

  if (channel.envelope_add) {
    if (channel.current_volume < 15) {
      channel.current_volume++;
    }
  } else if (channel.current_volume > 0) {
    channel.current_volume--;
  }
}

function calc_sweep_target(
  period: number,
  shift: number,
  negate: boolean,
): number {
  const delta = period >> shift;
  return negate ? period - delta : period + delta;
}

function step_sweep(): void {
  const ch = ctx.ch1;

  if (!ch.enabled || !ch.sweep_enabled || ch.sweep_period === 0) {
    return;
  }

  ch.sweep_timer--;
  if (ch.sweep_timer > 0) {
    return;
  }

  ch.sweep_timer = ch.sweep_period === 0 ? 8 : ch.sweep_period;

  const new_period = calc_sweep_target(
    ch.shadow_period,
    ch.sweep_shift,
    ch.sweep_negate,
  );

  if (new_period > 2047) {
    ch.enabled = false;
    return;
  }

  if (ch.sweep_shift > 0) {
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
}

function frame_sequencer_tick(): void {
  switch (ctx.frame_seq_step) {
    case 0:
    case 2:
    case 4:
    case 6:
      step_length(ctx.ch1);
      step_length(ctx.ch2);
      step_length(ctx.ch3);
      step_length(ctx.ch4);

      if (ctx.frame_seq_step === 2 || ctx.frame_seq_step === 6) {
        step_sweep();
      }
      break;

    case 7:
      step_envelope(ctx.ch1);
      step_envelope(ctx.ch2);
      step_envelope(ctx.ch4);
      break;
  }

  ctx.frame_seq_step = (ctx.frame_seq_step + 1) & 7;
}

function trigger_pulse(ch: pulse_channel, with_sweep: boolean): void {
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

    if (ch.sweep_shift !== 0) {
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

function trigger_wave(): void {
  const ch = ctx.ch3;

  ch.enabled = ch.dac_enabled;

  if (ch.length_counter === 0) {
    ch.length_counter = 256;
  }

  ch.freq_timer = wave_timer_reload(ch.period_value);
  ch.wave_pos = 0;
  ch.sample_latch = (ctx.wave_ram[0] >> 4) & 0x0f;
}

function trigger_noise(): void {
  const ch = ctx.ch4;

  ch.enabled = ch.dac_enabled;

  if (ch.length_counter === 0) {
    ch.length_counter = 64;
  }

  ch.freq_timer = noise_timer_reload(ch.divisor_code, ch.clock_shift);
  ch.envelope_timer = ch.envelope_period === 0 ? 8 : ch.envelope_period;
  ch.current_volume = ch.initial_volume;
  ch.lfsr = 0x7fff;
}

function pulse_output(ch: pulse_channel): number {
  if (!ch.enabled || !ch.dac_enabled) {
    return 0;
  }

  const bit = DUTY_PATTERNS[ch.duty][ch.duty_pos];
  return bit ? ch.current_volume / 15 : 0;
}

function wave_output(): number {
  const ch = ctx.ch3;

  if (!ch.enabled || !ch.dac_enabled) {
    return 0;
  }

  let sample = ch.sample_latch & 0x0f;

  switch (ch.volume_code) {
    case 0:
      sample = 0;
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

  return sample / 15;
}

function noise_output(): number {
  const ch = ctx.ch4;

  if (!ch.enabled || !ch.dac_enabled) {
    return 0;
  }

  const bit = ~ch.lfsr & 1;
  return bit ? ch.current_volume / 15 : 0;
}

function trim_audio_queue(): void {
  if (ctx.sample_queue_l.length > ctx.max_buffered_samples) {
    ctx.sample_queue_l.splice(
      0,
      ctx.sample_queue_l.length - ctx.max_buffered_samples,
    );
  }

  if (ctx.sample_queue_r.length > ctx.max_buffered_samples) {
    ctx.sample_queue_r.splice(
      0,
      ctx.sample_queue_r.length - ctx.max_buffered_samples,
    );
  }
}

function mix_and_push_sample(): void {
  if (!ctx.enabled) {
    ctx.sample_queue_l.push(0);
    ctx.sample_queue_r.push(0);
    trim_audio_queue();
    return;
  }

  const ch1 = pulse_output(ctx.ch1) * 2 - 1;
  const ch2 = pulse_output(ctx.ch2) * 2 - 1;
  const ch3 = wave_output();
  const ch4 = noise_output();

  let left_sum = 0;
  let right_sum = 0;
  let left_count = 0;
  let right_count = 0;

  if (BIT(ctx.nr51, 4)) {
    left_sum += ch1;
    left_count++;
  }
  if (BIT(ctx.nr51, 5)) {
    left_sum += ch2;
    left_count++;
  }
  if (BIT(ctx.nr51, 6)) {
    left_sum += ch3;
    left_count++;
  }
  if (BIT(ctx.nr51, 7)) {
    left_sum += ch4;
    left_count++;
  }

  if (BIT(ctx.nr51, 0)) {
    right_sum += ch1;
    right_count++;
  }
  if (BIT(ctx.nr51, 1)) {
    right_sum += ch2;
    right_count++;
  }
  if (BIT(ctx.nr51, 2)) {
    right_sum += ch3;
    right_count++;
  }
  if (BIT(ctx.nr51, 3)) {
    right_sum += ch4;
    right_count++;
  }

  let left = left_count > 0 ? left_sum / left_count : 0;
  let right = right_count > 0 ? right_sum / right_count : 0;

  const left_volume = ((ctx.nr50 >> 4) & 0x07) / 7;
  const right_volume = (ctx.nr50 & 0x07) / 7;

  left *= left_volume * 0.25;
  right *= right_volume * 0.25;

  ctx.sample_queue_l.push(clamp_sample(left));
  ctx.sample_queue_r.push(clamp_sample(right));

  trim_audio_queue();
}

function tick_pulse(ch: pulse_channel): void {
  if (ch.freq_timer > 0) {
    ch.freq_timer--;
  }

  if (ch.freq_timer <= 0) {
    ch.freq_timer = pulse_timer_reload(ch.period_value);
    ch.duty_pos = (ch.duty_pos + 1) & 7;
  }
}

function tick_wave(): void {
  const ch = ctx.ch3;

  if (ch.freq_timer > 0) {
    ch.freq_timer--;
  }

  if (ch.freq_timer <= 0) {
    ch.freq_timer = wave_timer_reload(ch.period_value);
    ch.wave_pos = (ch.wave_pos + 1) & 31;

    const byte = ctx.wave_ram[ch.wave_pos >> 1];
    ch.sample_latch =
      (ch.wave_pos & 1) === 0 ? (byte >> 4) & 0x0f : byte & 0x0f;
  }
}

function tick_noise(): void {
  const ch = ctx.ch4;

  if (ch.freq_timer > 0) {
    ch.freq_timer--;
  }

  if (ch.freq_timer <= 0) {
    ch.freq_timer = noise_timer_reload(ch.divisor_code, ch.clock_shift);

    const xor = (ch.lfsr & 1) ^ ((ch.lfsr >> 1) & 1);
    ch.lfsr = (ch.lfsr >> 1) | (xor << 14);

    if (ch.lfsr_width_mode) {
      ch.lfsr = (ch.lfsr & ~(1 << 6)) | (xor << 6);
    }
  }
}

export function audio_tick(): void {
  ctx.div_apu_counter++;

  if (ctx.div_apu_counter >= 8192) {
    ctx.div_apu_counter = 0;

    if (ctx.enabled) {
      frame_sequencer_tick();
    }
  }

  tick_pulse(ctx.ch1);
  tick_pulse(ctx.ch2);
  tick_wave();
  tick_noise();

  ctx.sample_cycle_accum += 1;

  if (ctx.sample_cycle_accum >= ctx.cycles_per_sample) {
    ctx.sample_cycle_accum -= ctx.cycles_per_sample;
    mix_and_push_sample();
  }

  apu_update_nr52();
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
      ctx.enabled = false;
      ctx.ch1 = make_pulse_channel();
      ctx.ch2 = make_pulse_channel();
      ctx.ch3 = reset_wave_channel();
      ctx.ch4 = reset_noise_channel();
      ctx.nr50 = 0;
      ctx.nr51 = 0;
    } else {
      ctx.enabled = true;
    }

    apu_update_nr52();
    return;
  }

  if (
    !ctx.enabled &&
    address !== NR52 &&
    !(address >= WAVE_RAM_START && address <= WAVE_RAM_END)
  ) {
    return;
  }

  switch (address) {
    case NR10:
      ctx.ch1.nrx0 = value & 0x7f;
      ctx.ch1.sweep_period = (value >> 4) & 0x07;
      ctx.ch1.sweep_negate = (value & 0x08) !== 0;
      ctx.ch1.sweep_shift = value & 0x07;
      return;

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

export function audio_get_queued_sample_count(): number {
  return Math.min(ctx.sample_queue_l.length, ctx.sample_queue_r.length);
}

export function audio_consume_samples(
  max_samples?: number,
): audio_sample_chunk {
  const available = audio_get_queued_sample_count();
  const count =
    max_samples === undefined
      ? available
      : Math.max(0, Math.min(available, max_samples | 0));

  const left = new Float32Array(count);
  const right = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    left[i] = ctx.sample_queue_l[i] ?? 0;
    right[i] = ctx.sample_queue_r[i] ?? 0;
  }

  if (count > 0) {
    ctx.sample_queue_l.splice(0, count);
    ctx.sample_queue_r.splice(0, count);
  }

  return { left, right };
}

export function audio_clear_samples(): void {
  ctx.sample_queue_l.length = 0;
  ctx.sample_queue_r.length = 0;
}

export function audio_debug_state() {
  return {
    enabled: ctx.enabled,
    nr50: ctx.nr50,
    nr51: ctx.nr51,
    nr52: ctx.nr52,
    queued: audio_get_queued_sample_count(),
    ch1_enabled: ctx.ch1.enabled,
    ch2_enabled: ctx.ch2.enabled,
    ch3_enabled: ctx.ch3.enabled,
    ch4_enabled: ctx.ch4.enabled,
  };
}