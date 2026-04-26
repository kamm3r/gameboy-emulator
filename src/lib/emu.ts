import { cpu_init, cpu_step } from "@/lib/cpu";
import { cart_load } from "@/lib/cart";
import { dma_tick } from "@/lib/dma";
import { ppu_get_context, ppu_init } from "@/lib/ppu";
import { ppu_tick, ppu_sm_init } from "@/lib/ppu_sm";
import { timer_init, timer_tick } from "@/lib/timer";
import { audio_init, audio_tick } from "./audio/apu";
import { audio_get_queued_sample_count } from "./audio/queue";

export type emu_context = {
  paused: boolean;
  running: boolean;
  die: boolean;
  ticks: number;
  current_frame: number;
  rom_loaded: boolean;
  rom_name: string | null;
};

type emu_listener = (ctx: Readonly<emu_context>) => void;

const ctx: emu_context = {
  paused: false,
  running: false,
  die: false,
  ticks: 0,
  current_frame: 0,
  rom_loaded: false,
  rom_name: null,
};

const listeners = new Set<emu_listener>();

let initialized = false;
let raf_handle: number | null = null;
let timeout_handle: ReturnType<typeof setTimeout> | null = null;

let ctx_snapshot: Readonly<emu_context> = Object.freeze({ ...ctx });

// SSR snapshot — always returns default state
const server_snapshot: Readonly<emu_context> = Object.freeze({
  paused: false,
  running: false,
  die: false,
  ticks: 0,
  current_frame: 0,
  rom_loaded: false,
  rom_name: null,
});

// Audio pump callback — set by useEmulatorAudio
let audio_pump_fn: (() => void) | null = null;

export function emu_set_audio_pump(fn: (() => void) | null): void {
  audio_pump_fn = fn;
}

function get_now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function update_snapshot(): void {
  ctx_snapshot = Object.freeze({ ...ctx });
}

function emit_update(): void {
  update_snapshot();
  for (const listener of listeners) {
    listener(ctx_snapshot);
  }
}

function cancel_loop(): void {
  if (raf_handle !== null) {
    cancelAnimationFrame(raf_handle);
    raf_handle = null;
  }
  if (timeout_handle !== null) {
    clearTimeout(timeout_handle);
    timeout_handle = null;
  }
}

function schedule_loop(): void {
  if (raf_handle !== null || !ctx.running || ctx.die) {
    return;
  }
  raf_handle = requestAnimationFrame(run_loop);
}

// Game Boy: ~4194304 Hz / 59.7 FPS = ~70224 M-cycles per frame
const T_CYCLES_PER_FRAME = 70224;
const GB_FRAME_RATE = 4_194_304 / T_CYCLES_PER_FRAME;
const TARGET_FRAME_MS = 1000 / GB_FRAME_RATE;

export function emu_cycles(cpu_cycles: number): void {
  for (let i = 0; i < cpu_cycles; i++) {
    for (let n = 0; n < 4; n++) {
      ctx.ticks++;
      timer_tick();
      ppu_tick();
      audio_tick();
    }
    dma_tick();
  }
}

function run_one_frame(): void {
  const start_frame = ppu_get_context().current_frame;

  // Run until PPU frame advances or safety limit
  let safety = 0;
  while (
    ctx.running &&
    !ctx.paused &&
    !ctx.die &&
    safety < T_CYCLES_PER_FRAME
  ) {
    const ok = cpu_step();
    if (!ok) {
      console.log("cpu stopped");
      ctx.running = false;
      return;
    }

    // If cpu_step doesn't tick peripherals, uncomment this:
    // emu_cycles(1);

    safety++;

    if (ppu_get_context().current_frame !== start_frame) {
      break;
    }
  }

  ctx.current_frame = ppu_get_context().current_frame;
}

function run_loop(): void {
  raf_handle = null;

  if (!ctx.running || ctx.die) {
    return;
  }

  if (ctx.paused) {
    schedule_loop();
    return;
  }

  const frame_start = get_now();

  // Run one Game Boy frame
  run_one_frame();

  // Pump audio immediately
  audio_pump_fn?.();

  emit_update();

  // Pace to ~60 FPS
  const elapsed = get_now() - frame_start;
  const delay = Math.max(0, TARGET_FRAME_MS - elapsed);

  if (delay > 0 && ctx.running && !ctx.die && !ctx.paused) {
    timeout_handle = setTimeout(() => {
      timeout_handle = null;
      if (ctx.running && !ctx.die && !ctx.paused) {
        schedule_loop();
      }
    }, delay);
  } else {
    schedule_loop();
  }
}

export function emu_get_context(): Readonly<emu_context> {
  return ctx_snapshot;
}

export function emu_get_server_context(): Readonly<emu_context> {
  return server_snapshot;
}

export function emu_subscribe(listener: emu_listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emu_init(): void {
  cancel_loop();

  timer_init();
  cpu_init();
  ppu_init();
  ppu_sm_init();
  audio_init();

  initialized = true;

  ctx.running = false;
  ctx.paused = false;
  ctx.die = false;
  ctx.ticks = 0;
  ctx.current_frame = 0;
  ctx.rom_loaded = false;
  ctx.rom_name = null;

  emit_update();
}

export function emu_load_rom(data: Uint8Array, filename?: string): boolean {
  const ok = cart_load(data, filename);
  ctx.rom_loaded = ok;
  ctx.rom_name = ok ? (filename ?? null) : null;
  emit_update();
  return ok;
}

export function emu_load_and_start(
  data: Uint8Array,
  filename?: string,
): boolean {
  if (!initialized) emu_init();
  const ok = emu_load_rom(data, filename);
  if (!ok) return false;
  emu_start();
  return true;
}

export function emu_start(): void {
  if (!initialized) emu_init();
  if (!ctx.rom_loaded) {
    console.warn("cannot start emulator: no rom loaded");
    return;
  }

  ctx.die = false;
  ctx.running = true;
  ctx.paused = false;
  ctx.current_frame = ppu_get_context().current_frame;

  emit_update();
  schedule_loop();
}

export function emu_pause(): void {
  if (!ctx.running) return;
  ctx.paused = true;
  emit_update();
}

export function emu_resume(): void {
  if (!ctx.running) return;
  ctx.paused = false;
  emit_update();
  schedule_loop();
}

export function emu_stop(): void {
  ctx.running = false;
  ctx.paused = false;
  ctx.die = true;
  cancel_loop();
  emit_update();
}

export function emu_get_frame(): number {
  return ctx.current_frame;
}

export function emu_get_ticks(): number {
  return ctx.ticks;
}