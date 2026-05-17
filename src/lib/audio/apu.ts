import { CPU_HZ } from "../common";
import { type pulse_state, type wave_state, type noise_state } from "./state";
import { pulse_init, pulse_tick, pulse_sample, pulse_write_nr0, pulse_write_nr1, pulse_write_nr2, pulse_write_nr3, pulse_write_nr4, pulse_read_nr0, pulse_read_nr1, pulse_read_nr2, pulse_read_nr3, pulse_read_nr4, pulse_clock_length, pulse_clock_sweep, pulse_clock_envelope } from "./pulse";
import { wave_init, wave_tick, wave_sample, wave_write_nr0, wave_write_nr1, wave_write_nr2, wave_write_nr3, wave_write_nr4, wave_read_nr0, wave_read_nr1, wave_read_nr2, wave_read_nr3, wave_read_nr4, wave_read_ram, wave_write_ram, wave_clock_length } from "./wave";
import { noise_init, noise_tick, noise_sample, noise_write_nr1, noise_write_nr2, noise_write_nr3, noise_write_nr4, noise_read_nr1, noise_read_nr2, noise_read_nr3, noise_read_nr4, noise_clock_length, noise_clock_envelope } from "./noise";
import { mixer_init, mixer_mix, mixer_update_volumes } from "./mixer";
import { audio_queue_push } from "./queue";
import { fs_init, fs_tick } from "./frame_sequencer";

type apu_context = {
  enabled: boolean;
  cycle_counter: number;
  sample_interval: number;
  ch1: pulse_state;
  ch2: pulse_state;
  ch3: wave_state;
  ch4: noise_state;
  mixer: ReturnType<typeof mixer_init>;
  fs: ReturnType<typeof fs_init>;
  nr51: number;
  nr50: number;
};

const ctx: apu_context = {
  enabled: false,
  cycle_counter: 0,
  sample_interval: CPU_HZ / 48000,
  ch1: pulse_init(),
  ch2: pulse_init(),
  ch3: wave_init(),
  ch4: noise_init(),
  mixer: mixer_init(),
  fs: fs_init(),
  nr51: 0,
  nr50: 0,
};

let max_buffered = 0;
let sample_rate = 48000;

export function audio_set_max_buffered_samples(max: number): void {
  max_buffered = max;
}

export function audio_set_sample_rate(rate: number): void {
  sample_rate = rate;
  ctx.sample_interval = CPU_HZ / rate;
}

let last_left = 0;
let last_right = 0;

export function audio_init(): void {
  ctx.enabled = false;
  ctx.cycle_counter = 0;
  ctx.nr51 = 0;
  ctx.nr50 = 0;
  ctx.ch1 = pulse_init();
  ctx.ch2 = pulse_init();
  ctx.ch3 = wave_init();
  ctx.ch4 = noise_init();
  ctx.mixer = mixer_init();
  ctx.fs = fs_init();
}

export function audio_tick(t_cycles: number): void {
  if (!ctx.enabled) {
    return;
  }

  for (let i = 0; i < t_cycles; i++) {
    pulse_tick(ctx.ch1);
    pulse_tick(ctx.ch2);
    wave_tick(ctx.ch3);
    noise_tick(ctx.ch4);

    ctx.cycle_counter++;

    if (ctx.cycle_counter >= ctx.sample_interval) {
      ctx.cycle_counter -= ctx.sample_interval;

      const s1 = pulse_sample(ctx.ch1);
      const s2 = pulse_sample(ctx.ch2);
      const s3 = wave_sample(ctx.ch3);
      const s4 = noise_sample(ctx.ch4);

      const [left, right] = mixer_mix(ctx.mixer, s1, s2, s3, s4, ctx.nr51);

      last_left = left;
      last_right = right;

      const buf = new Float32Array(2);
      buf[0] = left;
      buf[1] = right;
      audio_queue_push(buf);
    }
  }

  const step = fs_tick(ctx.fs);

  if (step >= 0) {
    if (step === 0 || step === 4) {
      pulse_clock_length(ctx.ch1);
      pulse_clock_length(ctx.ch2);
      wave_clock_length(ctx.ch3);
      noise_clock_length(ctx.ch4);
    }

    if (step === 2 || step === 6) {
      pulse_clock_length(ctx.ch1);
      pulse_clock_length(ctx.ch2);
      wave_clock_length(ctx.ch3);
      noise_clock_length(ctx.ch4);
      pulse_clock_sweep(ctx.ch1);
    }

    if (step === 7) {
      pulse_clock_envelope(ctx.ch1);
      pulse_clock_envelope(ctx.ch2);
      noise_clock_envelope(ctx.ch4);
    }
  }
}

export function audio_read(address: number): number {
  switch (address & 0xff) {
    case 0x10: return pulse_read_nr0(ctx.ch1);
    case 0x11: return pulse_read_nr1(ctx.ch1);
    case 0x12: return pulse_read_nr2(ctx.ch1);
    case 0x13: return pulse_read_nr3();
    case 0x14: return pulse_read_nr4(ctx.ch1);
    case 0x15: return 0xff;
    case 0x16: return pulse_read_nr1(ctx.ch2);
    case 0x17: return pulse_read_nr2(ctx.ch2);
    case 0x18: return pulse_read_nr3();
    case 0x19: return pulse_read_nr4(ctx.ch2);
    case 0x1a: return wave_read_nr0(ctx.ch3);
    case 0x1b: return wave_read_nr1();
    case 0x1c: { const code = ctx.ch3.volume_code; return (code << 5) | 0x9f; }
    case 0x1d: return 0xff;
    case 0x1e: return wave_read_nr4(ctx.ch3);
    case 0x1f: return 0xff;
    case 0x20: return noise_read_nr1();
    case 0x21: return noise_read_nr2(ctx.ch4);
    case 0x22: return noise_read_nr3(ctx.ch4);
    case 0x23: return noise_read_nr4(ctx.ch4);
    case 0x24: return ctx.nr50;
    case 0x25: return ctx.nr51;
    case 0x26: return (ctx.enabled ? 0x80 : 0) | 0x70;
    case 0x30: case 0x31: case 0x32: case 0x33:
    case 0x34: case 0x35: case 0x36: case 0x37:
    case 0x38: case 0x39: case 0x3a: case 0x3b:
    case 0x3c: case 0x3d: case 0x3e: case 0x3f:
      return wave_read_ram(ctx.ch3, address - 0xff30);
    default: return 0xff;
  }
}

export function audio_write(address: number, value: number): void {
  value &= 0xff;

  switch (address & 0xff) {
    case 0x10: pulse_write_nr0(ctx.ch1, value); break;
    case 0x11: pulse_write_nr1(ctx.ch1, value); break;
    case 0x12: pulse_write_nr2(ctx.ch1, value); break;
    case 0x13: pulse_write_nr3(ctx.ch1, value); break;
    case 0x14: pulse_write_nr4(ctx.ch1, value, 1); break;
    case 0x15: break;
    case 0x16: pulse_write_nr1(ctx.ch2, value); break;
    case 0x17: pulse_write_nr2(ctx.ch2, value); break;
    case 0x18: pulse_write_nr3(ctx.ch2, value); break;
    case 0x19: pulse_write_nr4(ctx.ch2, value, 2); break;
    case 0x1a: wave_write_nr0(ctx.ch3, value); break;
    case 0x1b: wave_write_nr1(ctx.ch3, value); break;
    case 0x1c: wave_write_nr2(ctx.ch3, value); break;
    case 0x1d: wave_write_nr3(ctx.ch3, value); break;
    case 0x1e: wave_write_nr4(ctx.ch3, value); break;
    case 0x1f: break;
    case 0x20: noise_write_nr1(ctx.ch4, value); break;
    case 0x21: noise_write_nr2(ctx.ch4, value); break;
    case 0x22: noise_write_nr3(ctx.ch4, value); break;
    case 0x23: noise_write_nr4(ctx.ch4, value); break;
    case 0x24:
      ctx.nr50 = value;
      mixer_update_volumes(ctx.mixer, value);
      break;
    case 0x25:
      ctx.nr51 = value;
      break;
    case 0x26:
      ctx.enabled = (value & 0x80) !== 0;
      if (!ctx.enabled) {
        ctx.ch1 = pulse_init();
        ctx.ch2 = pulse_init();
        ctx.ch3 = wave_init();
        ctx.ch4 = noise_init();
      }
      break;
    default:
      if (address >= 0xff30 && address <= 0xff3f) {
        wave_write_ram(ctx.ch3, address - 0xff30, value);
      }
      break;
  }
}
