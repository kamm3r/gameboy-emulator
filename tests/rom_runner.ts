import * as fs from "fs";
import * as path from "path";
import { inflateSync } from "zlib";
import { cpu_get_context, cpu_step } from "../src/lib/cpu/cpu.js";
import { bus_read, bus_write } from "../src/lib/memory/bus.js";
import { emu_init, emu_load_rom, emu_stop } from "../src/lib/emu.js";
import { ppu_get_context } from "../src/lib/ppu/ppu.js";
import { XRES, YRES } from "../src/lib/common.js";

export const ROMS_DIR = path.join(
  import.meta.dirname,
  "..",
  "game-boy-test-roms-v7.0",
);

export type rom_result = {
  passed: boolean;
  output: string;
  debug_info: string;
};

type run_options = {
  max_frames: number;
  // Return true to stop early (checked once per frame)
  is_done?: (serial: string) => boolean;
};

type run_state = {
  serial: string;
  frames: number;
};

function load(rom_path: string): void {
  const data = new Uint8Array(fs.readFileSync(rom_path));

  emu_init();

  if (!emu_load_rom(data, path.basename(rom_path))) {
    throw new Error(`Failed to load ROM ${rom_path}`);
  }
}

function run(options: run_options): run_state {
  const ppu = ppu_get_context();
  const state: run_state = { serial: "", frames: 0 };

  // Guards against the LCD being off (no frames counted)
  const max_steps = options.max_frames * 70224;
  let last_frame = ppu.current_frame;

  for (let step = 0; step < max_steps; step++) {
    const serial_ctrl = bus_read(0xff02);
    if ((serial_ctrl & 0x81) === 0x81) {
      state.serial += String.fromCharCode(bus_read(0xff01));
      bus_write(0xff02, serial_ctrl & 0x7f);
    }

    if (!cpu_step()) {
      break;
    }

    if (ppu.current_frame !== last_frame) {
      last_frame = ppu.current_frame;
      state.frames++;

      if (state.frames >= options.max_frames) break;
      if (options.is_done?.(state.serial)) break;
    }
  }

  emu_stop();
  return state;
}

function debug_info(state: run_state): string {
  const cpu = cpu_get_context();
  return `PC: 0x${cpu.registers.PC.toString(16)}, frames: ${state.frames}, halted: ${cpu.halted}`;
}

// Tests that report "Passed"/"Failed" over the serial port (blargg cpu_instrs etc.)
export function run_serial_rom(rom_path: string, max_frames = 3000): rom_result {
  load(rom_path);

  const state = run({
    max_frames,
    is_done: (serial) => /passed|failed/i.test(serial),
  });

  const output = state.serial;

  return {
    passed: /passed/i.test(output) && !/failed/i.test(output),
    output,
    debug_info: debug_info(state),
  };
}

// Blargg's memory protocol: $A001-$A003 = DE B0 61 signature,
// $A000 = 0x80 while running then the result code (0 = pass),
// $A004+ = zero-terminated text output.
function read_blargg_memory(): { status: number; text: string } | null {
  if (
    bus_read(0xa001) !== 0xde ||
    bus_read(0xa002) !== 0xb0 ||
    bus_read(0xa003) !== 0x61
  ) {
    return null;
  }

  let text = "";
  for (let addr = 0xa004; addr < 0xc000; addr++) {
    const c = bus_read(addr);
    if (c === 0) break;
    text += String.fromCharCode(c);
  }

  return { status: bus_read(0xa000), text };
}

export function run_blargg_memory_rom(
  rom_path: string,
  max_frames = 3000,
): rom_result {
  load(rom_path);

  let result: { status: number; text: string } | null = null;

  const state = run({
    max_frames,
    is_done: () => {
      result = read_blargg_memory();
      return result !== null && result.status !== 0x80;
    },
  });

  const final = read_blargg_memory();

  if (final === null) {
    return {
      passed: false,
      output: "no blargg signature at $A001",
      debug_info: debug_info(state),
    };
  }

  return {
    passed: final.status === 0,
    output: `status=0x${final.status.toString(16)} ${final.text.trim()}`,
    debug_info: debug_info(state),
  };
}

// Minimal PNG decoder for the non-interlaced grayscale reference screenshots
function decode_gray_png(file: string): {
  width: number;
  height: number;
  bit_depth: number;
  pixels: Uint8Array;
} {
  const buf = fs.readFileSync(file);
  let pos = 8;
  let width = 0;
  let height = 0;
  let bit_depth = 0;
  let color_type = 0;
  const idat: Buffer[] = [];

  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bit_depth = data[8];
      color_type = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }

    pos += 12 + len;
  }

  if (color_type !== 0) {
    throw new Error(`${file}: only grayscale PNGs are supported`);
  }

  const raw = inflateSync(Buffer.concat(idat));
  const stride = Math.ceil((width * bit_depth) / 8);
  const bpp = Math.max(1, bit_depth >> 3);
  const rows = new Uint8Array(stride * height);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;

    for (let x = 0; x < stride; x++) {
      const cur = raw[src + x];
      const a = x >= bpp ? rows[dst + x - bpp] : 0;
      const b = y > 0 ? rows[dst - stride + x] : 0;
      const c = x >= bpp && y > 0 ? rows[dst - stride + x - bpp] : 0;

      let value: number;
      switch (filter) {
        case 0:
          value = cur;
          break;
        case 1:
          value = cur + a;
          break;
        case 2:
          value = cur + b;
          break;
        case 3:
          value = cur + ((a + b) >> 1);
          break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          value = cur + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default:
          throw new Error(`${file}: bad PNG filter ${filter}`);
      }

      rows[dst + x] = value & 0xff;
    }
  }

  const max = (1 << bit_depth) - 1;
  const per_byte = 8 / bit_depth;
  const pixels = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const byte = rows[y * stride + Math.floor(x / per_byte)];
      const shift = 8 - bit_depth * ((x % per_byte) + 1);
      const v = (byte >> shift) & max;
      // Scale to 0..3 (0 = black, 3 = white)
      pixels[y * width + x] = Math.round((v * 3) / max);
    }
  }

  return { width, height, bit_depth, pixels };
}

// Emulator colors are gray (0xff/0xaa/0x55/0x00 per channel) -> PNG level 0..3
function video_pixel_to_gray(color: number): number {
  return Math.round((color & 0xff) / 0x55);
}

export function run_screenshot_rom(
  rom_path: string,
  reference_png: string,
  frames: number,
): rom_result {
  load(rom_path);
  const state = run({ max_frames: frames });

  const ref = decode_gray_png(reference_png);
  if (ref.width !== XRES || ref.height !== YRES) {
    throw new Error(`reference ${reference_png} is ${ref.width}x${ref.height}`);
  }

  const video = ppu_get_context().video_buffer;
  let mismatches = 0;
  let first = "";

  for (let i = 0; i < XRES * YRES; i++) {
    const got = video_pixel_to_gray(video[i]);
    if (got !== ref.pixels[i]) {
      if (mismatches === 0) {
        first = `first at (${i % XRES}, ${Math.floor(i / XRES)}) got ${got} expected ${ref.pixels[i]}`;
      }
      mismatches++;
    }
  }

  return {
    passed: mismatches === 0,
    output: mismatches === 0 ? "matches reference" : `${mismatches} pixels differ, ${first}`,
    debug_info: debug_info(state),
  };
}
