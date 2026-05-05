import { ctx } from "./state";

export function ch3_dac_on(nr30: number): boolean {
  return (nr30 & 0x80) !== 0;
}

export function wave_timer_reload(period_value: number): number {
  return (2048 - (period_value & 0x7ff)) * 2;
}

function wave_accessible(): boolean {
  return ctx.ch3.access_countdown > 0;
}

function fetch_wave_sample(): void {
  const ch = ctx.ch3;
  const sample_index = ch.wave_pos & 31;
  const byte_index = (sample_index >> 1) & 0x0f;
  const byte = ctx.wave_ram[byte_index];

  ch.last_read_byte = byte_index;
  ch.access_countdown = 2;

  if ((sample_index & 1) === 0) {
    ch.sample_latch = (byte >> 4) & 0x0f;
  } else {
    ch.sample_latch = byte & 0x0f;
  }

  ch.wave_pos = (ch.wave_pos + 1) & 31;
}

function wave_corrupt_on_retrigger(): void {
  const ch = ctx.ch3;

  if (!ch.enabled) {
    return;
  }

  if (ch.freq_timer > 2) {
    return;
  }

  const pos = ch.wave_pos & 31;

  if (pos < 8) {
    ctx.wave_ram[0] = ctx.wave_ram[(pos >> 1) & 0x0f];
    return;
  }

  const base = ((pos >> 1) & 0x0c) & 0x0f;

  ctx.wave_ram[0] = ctx.wave_ram[base];
  ctx.wave_ram[1] = ctx.wave_ram[(base + 1) & 0x0f];
  ctx.wave_ram[2] = ctx.wave_ram[(base + 2) & 0x0f];
  ctx.wave_ram[3] = ctx.wave_ram[(base + 3) & 0x0f];
}

export function wave_ram_read(index: number): number {
  const ch = ctx.ch3;
  const i = index & 0x0f;

  if (!ch.enabled) {
    return ctx.wave_ram[i];
  }

  if (wave_accessible()) {
    return ctx.wave_ram[ch.last_read_byte & 0x0f];
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

  if (wave_accessible()) {
    ctx.wave_ram[ch.last_read_byte & 0x0f] = v;
  }
}

export function trigger_wave(): void {
  const ch = ctx.ch3;

  wave_corrupt_on_retrigger();

  ch.enabled = ch.dac_enabled;

  if (!ch.enabled) {
    return;
  }

  ch.freq_timer = 6;
  ch.wave_pos = 0;
  ch.sample_latch = 0;
  ch.access_countdown = 0;
}

export function wave_output(): number {
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

  return sample / 7.5 - 1.0;
}

export function tick_wave(): void {
  const ch = ctx.ch3;

  if (ch.access_countdown > 0) {
    ch.access_countdown--;
  }

  if (!ch.enabled) {
    return;
  }

  ch.freq_timer--;

  if (ch.freq_timer <= 0) {
    ch.freq_timer += wave_timer_reload(ch.period_value);
    fetch_wave_sample();
  }
}