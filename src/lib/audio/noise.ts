import { noise_state } from "./state";

export function noise_init(): noise_state {
  return {
    enabled: false,
    dac: false,
    length: 0,
    length_enable: false,
    length_counter: 64,
    volume: 0,
    volume_initial: 0,
    volume_dir: 0,
    volume_period: 0,
    volume_counter: 0,
    divisor_code: 0,
    clock_shift: 0,
    lfsr: 0x7fff,
    width_mode: false,
    freq_divider: 0,
  };
}

export function noise_trigger(n: noise_state): void {
  n.enabled = true;
  n.lfsr = 0x7fff;

  const divisor = n.divisor_code === 0 ? 8 : n.divisor_code * 16;
  n.freq_divider = divisor << n.clock_shift;

  n.volume = n.volume_initial;
  n.volume_counter = n.volume_period;

  if (n.length_counter === 0) {
    n.length_counter = 64;
  }
}

export function noise_clock_length(n: noise_state): void {
  if (n.length_enable && n.length_counter > 0) {
    n.length_counter--;

    if (n.length_counter === 0) {
      n.enabled = false;
    }
  }
}

export function noise_clock_envelope(n: noise_state): void {
  if (n.volume_period === 0) {
    return;
  }

  n.volume_counter--;

  if (n.volume_counter > 0) {
    return;
  }

  n.volume_counter = n.volume_period;

  if (n.volume_dir === 0 && n.volume > 0) {
    n.volume--;
  } else if (n.volume_dir === 1 && n.volume < 15) {
    n.volume++;
  }
}

export function noise_sample(n: noise_state): number {
  if (!n.enabled || !n.dac) {
    return 0;
  }

  const bit = n.lfsr & 1;

  return (n.volume / 15) * (bit === 0 ? 1 : -1);
}

export function noise_tick(n: noise_state): void {
  n.freq_divider--;

  if (n.freq_divider > 0) {
    return;
  }

  const divisor = n.divisor_code === 0 ? 8 : n.divisor_code * 16;
  n.freq_divider = divisor << n.clock_shift;

  const xor = (n.lfsr & 1) ^ ((n.lfsr >> 1) & 1);
  n.lfsr = (n.lfsr >> 1) | (xor << 14);

  if (n.width_mode) {
    n.lfsr = (n.lfsr & ~0x40) | (xor << 6);
  }
}

export function noise_write_nr1(n: noise_state, value: number): void {
  n.length = 64 - (value & 0x3f);
  n.length_counter = 64 - (value & 0x3f);
}

export function noise_write_nr2(n: noise_state, value: number): void {
  n.volume_initial = (value >> 4) & 0x0f;
  n.volume_dir = (value >> 3) & 0x01;
  n.volume_period = value & 0x07;
  n.dac = (value & 0xf8) !== 0;

  if (!n.dac) {
    n.enabled = false;
  }
}

export function noise_write_nr3(n: noise_state, value: number): void {
  n.clock_shift = (value >> 4) & 0x0f;
  n.width_mode = (value & 0x08) !== 0;
  n.divisor_code = value & 0x07;
}

export function noise_write_nr4(n: noise_state, value: number): void {
  n.length_enable = (value & 0x40) !== 0;

  if ((value & 0x80) !== 0) {
    noise_trigger(n);
  }
}

export function noise_read_nr1(): number {
  return 0xff;
}

export function noise_read_nr2(n: noise_state): number {
  return (n.volume_initial << 4) | (n.volume_dir << 3) | n.volume_period;
}

export function noise_read_nr3(n: noise_state): number {
  return (n.clock_shift << 4) | (n.width_mode ? 0x08 : 0) | n.divisor_code;
}

export function noise_read_nr4(n: noise_state): number {
  return (n.length_enable ? 0x40 : 0) | 0xbf;
}
