import { DUTY_PATTERNS } from "./constants";
import { pulse_state } from "./state";

export function pulse_init(): pulse_state {
  return {
    enabled: false,
    dac: false,
    duty: 0,
    duty_pos: 0,
    length: 64,
    length_enable: false,
    length_counter: 64,
    volume: 0,
    volume_initial: 0,
    volume_dir: 0,
    volume_period: 0,
    volume_counter: 0,
    frequency: 0,
    freq_divider: 0,
    sweep_period: 0,
    sweep_counter: 0,
    sweep_dir: 0,
    sweep_shift: 0,
    sweep_enabled: false,
  };
}

export function pulse_trigger(p: pulse_state, ch: number): void {
  p.enabled = true;
  p.freq_divider = (2048 - p.frequency) * 4;

  p.volume = p.volume_initial;
  p.volume_counter = p.volume_period;

  if (p.length_counter === 0) {
    p.length_counter = ch === 1 ? 64 : 64;
  }

  if (p.sweep_shift > 0 && ch === 1) {
    p.sweep_enabled = true;
    p.sweep_counter = p.sweep_period;
  }
}

export function pulse_clock_length(p: pulse_state): void {
  if (p.length_enable && p.length_counter > 0) {
    p.length_counter--;

    if (p.length_counter === 0) {
      p.enabled = false;
    }
  }
}

export function pulse_clock_sweep(p: pulse_state): void {
  if (!p.sweep_enabled || p.sweep_period === 0) {
    return;
  }

  p.sweep_counter--;

  if (p.sweep_counter > 0) {
    return;
  }

  p.sweep_counter = p.sweep_period;

  const shadow = p.frequency;
  let new_freq = shadow >> p.sweep_shift;

  if (p.sweep_dir === 1) {
    new_freq = shadow - new_freq;
  } else {
    new_freq = shadow + new_freq;
  }

  if (new_freq > 2047) {
    p.enabled = false;
    return;
  }

  p.frequency = new_freq;
  p.freq_divider = (2048 - new_freq) * 4;
}

export function pulse_clock_envelope(p: pulse_state): void {
  if (p.volume_period === 0) {
    return;
  }

  p.volume_counter--;

  if (p.volume_counter > 0) {
    return;
  }

  p.volume_counter = p.volume_period;

  if (p.volume_dir === 0 && p.volume > 0) {
    p.volume--;
  } else if (p.volume_dir === 1 && p.volume < 15) {
    p.volume++;
  }
}

export function pulse_sample(p: pulse_state): number {
  if (!p.enabled || !p.dac) {
    return 0;
  }

  return (p.volume / 15) * (DUTY_PATTERNS[p.duty][p.duty_pos] ? 1 : -1);
}

export function pulse_tick(p: pulse_state): void {
  p.freq_divider--;

  if (p.freq_divider <= 0) {
    p.freq_divider = (2048 - p.frequency) * 4;
    p.duty_pos = (p.duty_pos + 1) & 7;
  }
}

export function pulse_write_nr0(p: pulse_state, value: number): void {
  p.sweep_period = (value >> 4) & 0x07;
  p.sweep_dir = (value >> 3) & 0x01;
  p.sweep_shift = value & 0x07;
}

export function pulse_write_nr1(p: pulse_state, value: number): void {
  p.duty = (value >> 6) & 0x03;
  p.length = 64 - (value & 0x3f);
  p.length_counter = 64 - (value & 0x3f);
}

export function pulse_write_nr2(p: pulse_state, value: number): void {
  p.volume_initial = (value >> 4) & 0x0f;
  p.volume_dir = (value >> 3) & 0x01;
  p.volume_period = value & 0x07;
  p.dac = (value & 0xf8) !== 0;

  if (!p.dac) {
    p.enabled = false;
  }
}

export function pulse_write_nr3(p: pulse_state, value: number): void {
  p.frequency = (p.frequency & 0x0700) | value;
}

export function pulse_write_nr4(p: pulse_state, value: number, ch: number): void {
  p.frequency = ((value & 0x07) << 8) | (p.frequency & 0x00ff);
  p.length_enable = (value & 0x40) !== 0;

  if ((value & 0x80) !== 0) {
    pulse_trigger(p, ch);
  }
}

export function pulse_read_nr0(p: pulse_state): number {
  return (p.sweep_period << 4) | (p.sweep_dir << 3) | p.sweep_shift;
}

export function pulse_read_nr1(p: pulse_state): number {
  return (p.duty << 6) | 0x3f;
}

export function pulse_read_nr2(p: pulse_state): number {
  return (p.volume_initial << 4) | (p.volume_dir << 3) | p.volume_period;
}

export function pulse_read_nr3(): number {
  return 0xff;
}

export function pulse_read_nr4(p: pulse_state): number {
  return (p.length_enable ? 0x40 : 0) | 0xbf;
}
