// wave.ts

import { ctx, type wave_channel } from "./state";

export function ch3_dac_on(nr30: number): boolean {
  return (nr30 & 0x80) !== 0;
}

export function wave_timer_reload(period_value: number): number {
  return (2048 - (period_value & 0x7ff)) * 2;
}

function wave_read_sample(sample_index: number): number {
  const byte_index = (sample_index >>> 1) & 0x0f;
  const byte = ctx.wave_ram[byte_index];

  ctx.ch3.last_read_byte = byte_index;
  ctx.ch3.access_clocks = 2;

  return (sample_index & 1) === 0
    ? (byte >>> 4) & 0x0f
    : byte & 0x0f;
}

function wave_accessible(): boolean {
  return ctx.ch3.access_clocks > 0;
}

function wave_corrupt_on_retrigger(): void {
  const ch = ctx.ch3;
  if (!wave_accessible()) return;

  const byte = ch.last_read_byte & 0x0f;

  if (byte < 4) {
    ctx.wave_ram[0] = ctx.wave_ram[byte];
  } else {
    const base = byte & ~0x03;
    ctx.wave_ram[0] = ctx.wave_ram[base];
    ctx.wave_ram[1] = ctx.wave_ram[base + 1];
    ctx.wave_ram[2] = ctx.wave_ram[base + 2];
    ctx.wave_ram[3] = ctx.wave_ram[base + 3];
  }
}

export function wave_ram_read(index: number): number {
  const ch = ctx.ch3;
  const i = index & 0x0f;

  if (!ch.enabled) return ctx.wave_ram[i];
  if (wave_accessible()) return ctx.wave_ram[ch.last_read_byte];
  return 0xff;
}

export function wave_ram_write(
  index: number,
  value: number,
): void {
  const ch = ctx.ch3;
  const i = index & 0x0f;
  const v = value & 0xff;

  if (!ch.enabled) {
    ctx.wave_ram[i] = v;
    return;
  }

  if (wave_accessible()) {
    ctx.wave_ram[ch.last_read_byte] = v;
  }
}

export function trigger_wave(): void {
  const ch = ctx.ch3;

  if (ch.enabled) {
    wave_corrupt_on_retrigger();
  }

  ch.enabled = ch.dac_enabled;

  // On DMG, the frequency timer is reloaded with period + 6 T-cycles
  // This accounts for the delay before the first tick
  ch.freq_timer = wave_timer_reload(ch.period_value) + 6;

  // Wave position is reset to 0. The first sample played will be
  // from position 0 (which is fetched when the timer first expires).
  ch.wave_pos = 0;
  ch.sample_latch = 0;
}

export function wave_output(): number {
  const ch = ctx.ch3;

  if (!ch.enabled || !ch.dac_enabled) return 0;

  let sample = ch.sample_latch & 0x0f;

  switch (ch.volume_code) {
    case 0:
      sample >>= 4;
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

  return (sample / 7.5) - 1.0;
}

export function tick_wave(): void {
  const ch = ctx.ch3;

  if (ch.access_clocks > 0) {
    ch.access_clocks--;
  }

  ch.freq_timer--;
  if (ch.freq_timer <= 0) {
    ch.freq_timer = wave_timer_reload(ch.period_value);
    ch.wave_pos = (ch.wave_pos + 1) & 31;
    ch.sample_latch = wave_read_sample(ch.wave_pos);
  }
}