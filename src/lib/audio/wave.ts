import { ctx } from "./state";

export type wave_channel = {
  enabled: boolean;
  dac_enabled: boolean;

  length_enabled: boolean;
  length_counter: number;

  period_value: number;
  freq_timer: number;

  volume_code: number;
  wave_pos: number;
  sample_latch: number;

  last_read_byte: number;
  access_window: number;

  nr30: number;
  nr31: number;
  nr32: number;
  nr33: number;
  nr34: number;
};

export function make_wave_channel(): wave_channel {
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

    last_read_byte: 0,
    access_window: 0,

    nr30: 0,
    nr31: 0,
    nr32: 0,
    nr33: 0,
    nr34: 0,
  };
}

export function ch3_dac_on(nr30: number): boolean {
  return (nr30 & 0x80) !== 0;
}

export function wave_timer_reload(period_value: number): number {
  return (2048 - (period_value & 0x7ff)) * 2;
}

function wave_fetch_sample(sample_index: number): number {
  const ch = ctx.ch3;
  const byte_index = (sample_index >> 1) & 0x0f;
  const byte = ctx.wave_ram[byte_index];

  ch.last_read_byte = byte_index;
  ch.access_window = 2;

  // GB wave RAM plays high nibble first, then low nibble.
  return (sample_index & 1) === 0 ? (byte >> 4) & 0x0f : byte & 0x0f;
}

function wave_accessible_while_on(): boolean {
  return ctx.ch3.access_window > 0;
}

function wave_corrupt_on_retrigger(): void {
  const ch = ctx.ch3;

  if (!wave_accessible_while_on()) {
    return;
  }

  const byte = ch.last_read_byte & 0x0f;

  // DMG retrigger corruption behavior:
  // - if the currently accessed byte is in the first 4 bytes, copy that byte
  //   into wave RAM byte 0
  // - otherwise copy the aligned 4-byte block into bytes 0-3
  if (byte < 4) {
    ctx.wave_ram[0] = ctx.wave_ram[byte];
    return;
  }

  const base = byte & ~0x03;

  ctx.wave_ram[0] = ctx.wave_ram[base];
  ctx.wave_ram[1] = ctx.wave_ram[base + 1];
  ctx.wave_ram[2] = ctx.wave_ram[base + 2];
  ctx.wave_ram[3] = ctx.wave_ram[base + 3];
}

export function wave_ram_read(index: number): number {
  const ch = ctx.ch3;
  const i = index & 0x0f;

  if (!ch.enabled) {
    return ctx.wave_ram[i];
  }

  if (wave_accessible_while_on()) {
    return ctx.wave_ram[ch.last_read_byte];
  }

  return 0xff;
}

export function wave_ram_write(index: number, value: number): void {
  const ch = ctx.ch3;
  const i = index & 0x0f;
  const v = value & 0xff;

  if (!ch.enabled) {
    ctx.wave_ram[i] = v;
    return;
  }

  if (wave_accessible_while_on()) {
    ctx.wave_ram[ch.last_read_byte] = v;
  }
}

export function trigger_wave(): void {
  const ch = ctx.ch3;

  if (ch.enabled) {
    wave_corrupt_on_retrigger();
  }

  ch.enabled = ch.dac_enabled;

  if (ch.length_counter === 0) {
    ch.length_counter = 256;
  }

  ch.freq_timer = wave_timer_reload(ch.period_value);
  ch.wave_pos = 0;
  ch.sample_latch = wave_fetch_sample(0);
}

export function wave_output(): number {
  const ch = ctx.ch3;

  if (!ch.enabled || !ch.dac_enabled || ch.volume_code === 0) {
    return 0;
  }

  let sample = ch.sample_latch & 0x0f;

  switch (ch.volume_code) {
    case 1:
      break;
    case 2:
      sample >>= 1;
      break;
    case 3:
      sample >>= 2;
      break;
  }

  return 1 - (sample / 15) * 2;
}

export function tick_wave(): void {
  const ch = ctx.ch3;

  if (ch.access_window > 0) {
    ch.access_window--;
  }

  if (ch.freq_timer > 0) {
    ch.freq_timer--;
  }

  if (ch.freq_timer <= 0) {
    ch.freq_timer = wave_timer_reload(ch.period_value);
    ch.wave_pos = (ch.wave_pos + 1) & 31;
    ch.sample_latch = wave_fetch_sample(ch.wave_pos);
  }
}