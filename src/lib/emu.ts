import { cpu_init, cpu_step } from "@/lib/cpu/cpu";
import { cart_load } from "@/lib/cart";
import { dma_tick } from "@/lib/memory/dma";
import {
  ppu_get_context,
  ppu_init,
  ppu_update_dirty_tiles,
} from "@/lib/ppu/ppu";
import { ppu_tick, ppu_sm_init } from "@/lib/ppu/ppu_sm";
import { timer_init, timer_tick } from "@/lib/timer";
import { audio_init, audio_tick } from "./audio/apu";
import { T_CYCLES_PER_FRAME, TARGET_FRAME_MS } from "./common";

export type emu_context = {
  paused: boolean;
  running: boolean;
  die: boolean;
  ticks: number;
  current_frame: number;
  fps: number;
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
  fps: 0,
  rom_loaded: false,
  rom_name: null,
};

const listeners = new Set<emu_listener>();

let initialized = false;
let raf_handle: number | null = null;
let last_loop_time: number | null = null;
let frame_time_accum = 0;
let fps_frame_count = 0;
let fps_last_time = 0;

let ctx_snapshot: Readonly<emu_context> = Object.freeze({ ...ctx });

// SSR snapshot — always returns default state
const server_snapshot: Readonly<emu_context> = Object.freeze({
  paused: false,
  running: false,
  die: false,
  ticks: 0,
  current_frame: 0,
  fps: 0,
  rom_loaded: false,
  rom_name: null,
});

// Audio pump callback — set by useEmulatorAudio
let audio_pump_fn: (() => void) | null = null;

export function emu_set_audio_pump(fn: (() => void) | null): void {
  audio_pump_fn = fn;
}

function reset_fps(): void {
  fps_frame_count = 0;
  fps_last_time = get_now();
  ctx.fps = 0;
}
function update_fps(): void {
  fps_frame_count++;

  const now = get_now();
  const elapsed = now - fps_last_time;

  if (elapsed < 1000) {
    return;
  }

  ctx.fps = Math.round((fps_frame_count * 1000) / elapsed);
  fps_frame_count = 0;
  fps_last_time = now;
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

  last_loop_time = null;
  frame_time_accum = 0;
}

function schedule_loop(): void {
  if (raf_handle !== null || !ctx.running || ctx.die) {
    return;
  }

  raf_handle = requestAnimationFrame(run_loop);
}

// Frames to run in one callback before giving up on catching up
const MAX_CATCH_UP_FRAMES = 4;
// A longer gap (tab hidden, debugger, GC) is skipped instead of caught up
const MAX_LOOP_GAP_MS = 250;

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
  ppu_update_dirty_tiles();

  const start_frame = ppu_get_context().current_frame;
  const start_ticks = ctx.ticks;

  // Bounded by T-cycles so a frame with the LCD off still takes one frame of time
  while (
    ctx.running &&
    !ctx.paused &&
    !ctx.die &&
    ctx.ticks - start_ticks < T_CYCLES_PER_FRAME
  ) {
    const ok = cpu_step();

    if (!ok) {
      console.log("cpu stopped");
      ctx.running = false;
      return;
    }

    if (ppu_get_context().current_frame !== start_frame) {
      break;
    }
  }

  ctx.current_frame = ppu_get_context().current_frame;
}

// Paced by wall-clock time instead of rAF ticks, so emulation (and audio
// production) runs at the real Game Boy rate on any display refresh rate.
function run_loop(now: number): void {
  raf_handle = null;

  if (!ctx.running || ctx.die) {
    return;
  }

  if (ctx.paused) {
    last_loop_time = null;
    schedule_loop();
    return;
  }

  let elapsed = last_loop_time === null ? TARGET_FRAME_MS : now - last_loop_time;
  last_loop_time = now;

  if (elapsed > MAX_LOOP_GAP_MS) {
    elapsed = TARGET_FRAME_MS;
  }

  frame_time_accum += elapsed;

  let frames = 0;

  while (frame_time_accum >= TARGET_FRAME_MS && frames < MAX_CATCH_UP_FRAMES) {
    run_one_frame();
    update_fps();
    frame_time_accum -= TARGET_FRAME_MS;
    frames++;

    if (!ctx.running) {
      break;
    }
  }

  // Too far behind to catch up; drop the backlog rather than spiral
  if (frames === MAX_CATCH_UP_FRAMES) {
    frame_time_accum = 0;
  }

  if (frames > 0) {
    audio_pump_fn?.();
    emit_update();
  }

  schedule_loop();
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
  ctx.fps = 0;
  ctx.rom_loaded = false;
  ctx.rom_name = null;

  reset_fps();
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

  reset_fps();
  emit_update();
  schedule_loop();
}

export function emu_pause(): void {
  if (!ctx.running) return;
  ctx.paused = true;
  ctx.fps = 0;
  emit_update();
}

export function emu_resume(): void {
  if (!ctx.running) return;
  ctx.paused = false;
  reset_fps();
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

export function emu_get_fps(): number {
  return ctx.fps;
}
