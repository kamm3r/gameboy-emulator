import { wave_state } from "./state";

export function wave_init(): wave_state {
  return {
    enabled: false,
    dac: false,
    length: 0,
    length_enable: false,
    length_counter: 256,
    volume_code: 0,
    frequency: 0,
    freq_divider: 0,
    sample_buffer: 0,
    position: 0,
    wave_ram: new Uint8Array(16),
  };
}

export function wave_trigger(w: wave_state): void {
  w.enabled = true;
  w.freq_divider = (2048 - w.frequency) * 2;
  w.position = 0;

  if (w.length_counter === 0) {
    w.length_counter = 256;
  }
}

export function wave_clock_length(w: wave_state): void {
  if (w.length_enable && w.length_counter > 0) {
    w.length_counter--;

    if (w.length_counter === 0) {
      w.enabled = false;
    }
  }
}

export function wave_sample(w: wave_state): number {
  if (!w.enabled || !w.dac) {
    return 0;
  }

  const raw = w.sample_buffer;
  let amp: number;

  switch (w.volume_code) {
    case 0: return 0;
    case 1: amp = raw; break;
    case 2: amp = raw >> 1; break;
    case 3: amp = raw >> 2; break;
    default: amp = raw; break;
  }

  return (amp / 7.5) - 1;
}

export function wave_tick(w: wave_state): void {
  w.freq_divider--;

  if (w.freq_divider <= 0) {
    w.freq_divider = (2048 - w.frequency) * 2;
    w.position = (w.position + 1) & 31;

    const byte = w.wave_ram[w.position >> 1];
    w.sample_buffer = (w.position & 1) === 0 ? (byte >> 4) & 0x0f : byte & 0x0f;
  }
}

export function wave_write_nr0(w: wave_state, value: number): void {
  w.dac = (value & 0x80) !== 0;

  if (!w.dac) {
    w.enabled = false;
  }
}

export function wave_write_nr1(w: wave_state, value: number): void {
  w.length = 256 - value;
  w.length_counter = 256 - value;
}

export function wave_write_nr2(w: wave_state, value: number): void {
  w.volume_code = (value >> 5) & 0x03;
}

export function wave_write_nr3(w: wave_state, value: number): void {
  w.frequency = (w.frequency & 0x0700) | value;
}

export function wave_write_nr4(w: wave_state, value: number): void {
  w.frequency = ((value & 0x07) << 8) | (w.frequency & 0x00ff);
  w.length_enable = (value & 0x40) !== 0;

  if ((value & 0x80) !== 0) {
    wave_trigger(w);
  }
}

export function wave_read_nr0(w: wave_state): number {
  return w.dac ? 0x80 : 0x00;
}

export function wave_read_nr1(): number {
  return 0xff;
}

export function wave_read_nr2(w: wave_state): number {
  return (w.volume_code << 5) | 0x9f;
}

export function wave_read_nr3(): number {
  return 0xff;
}

export function wave_read_nr4(w: wave_state): number {
  return (w.length_enable ? 0x40 : 0) | 0xbf;
}

export function wave_read_ram(w: wave_state, address: number): number {
  return w.wave_ram[address & 0x0f];
}

export function wave_write_ram(w: wave_state, address: number, value: number): void {
  w.wave_ram[address & 0x0f] = value & 0xff;
}
