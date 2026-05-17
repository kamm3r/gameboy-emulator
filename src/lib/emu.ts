import { cpu_init, cpu_step, cpu_request_interrupt } from "./cpu/cpu";
import { cart_load } from "./cart";
import { dma_init, dma_tick_batch } from "./memory/dma";
import { ppu_get_context, ppu_init, ppu_update_dirty_tiles, ppu_oam_write } from "./ppu/ppu";
import { ppu_sm_init, ppu_tick_batch } from "./ppu/ppu_sm";
import { timer_init, timer_tick } from "./timer";
import { T_CYCLES_PER_FRAME, TARGET_FRAME_MS, get_now } from "./common";
import { int_init } from "./interrupts";
import { bus_read } from "./memory/bus";
import { audio_init, audio_tick } from "./audio/apu";

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

const listeners = new Set<(c: Readonly<emu_context>) => void>();
const render_callbacks = new Set<() => void>();

let initialized = false;
let raf_handle: number | null = null;
let timeout_handle: ReturnType<typeof setTimeout> | null = null;
let fps_frame_count = 0;
let fps_last_time = 0;

let ctx_snapshot: Readonly<emu_context> = Object.freeze({ ...ctx });
let last_snapshot_fps = 0;
let last_snapshot_paused = false;
let last_snapshot_running = false;
let last_snapshot_rom_loaded = false;
let last_snapshot_rom_name: string | null = null;
let audio_pump_fn: (() => void) | null = null;

const server_snapshot: Readonly<emu_context> = Object.freeze({
  paused: false, running: false, die: false, ticks: 0,
  current_frame: 0, fps: 0, rom_loaded: false, rom_name: null,
});

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
  if (elapsed < 1000) return;
  ctx.fps = Math.round((fps_frame_count * 1000) / elapsed);
  fps_frame_count = 0;
  fps_last_time = now;
}

function update_snapshot(): void {
  ctx_snapshot = Object.freeze({ ...ctx });
}

function snapshot_changed(): boolean {
  return (
    ctx.fps !== last_snapshot_fps ||
    ctx.paused !== last_snapshot_paused ||
    ctx.running !== last_snapshot_running ||
    ctx.rom_loaded !== last_snapshot_rom_loaded ||
    ctx.rom_name !== last_snapshot_rom_name
  );
}

function update_snapshot_tracking(): void {
  last_snapshot_fps = ctx.fps;
  last_snapshot_paused = ctx.paused;
  last_snapshot_running = ctx.running;
  last_snapshot_rom_loaded = ctx.rom_loaded;
  last_snapshot_rom_name = ctx.rom_name;
}

function emit_update(): void {
  update_snapshot();
  for (const cb of render_callbacks) cb();
  if (snapshot_changed()) {
    for (const listener of listeners) listener(ctx_snapshot);
    update_snapshot_tracking();
  }
}

export function emu_subscribe_render(cb: () => void): () => void {
  render_callbacks.add(cb);
  return () => render_callbacks.delete(cb);
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
  if (raf_handle !== null || timeout_handle !== null || !ctx.running || ctx.die) {
    return;
  }
  raf_handle = requestAnimationFrame(run_loop);
}

export function emu_cycles(m_cycles: number): void {
  if (m_cycles <= 0) return;
  const t_cycles = m_cycles << 2;
  ctx.ticks += t_cycles;

  ppu_tick_batch(t_cycles);

  for (let i = 0; i < t_cycles; i++) {
    timer_tick(1);
    audio_tick(1);
  }

  dma_tick_batch(m_cycles);
}

function run_one_frame(): void {
  ppu_update_dirty_tiles();
  const ppu = ppu_get_context();
  const start_frame = ppu.current_frame;
  const start_ticks = ctx.ticks;
  const max_ticks = start_ticks + T_CYCLES_PER_FRAME + 456;

  while (ctx.running && !ctx.paused && !ctx.die && ctx.ticks < max_ticks) {
    const ok = cpu_step();
    if (!ok) {
      ctx.running = false;
      return;
    }
    if (ppu.current_frame !== start_frame) {
      break;
    }
  }

  ctx.current_frame = ppu.current_frame;
}

function run_loop(): void {
  raf_handle = null;

  if (!ctx.running || ctx.die) return;
  if (ctx.paused) { schedule_loop(); return; }

  const frame_start = get_now();
  run_one_frame();
  update_fps();
  audio_pump_fn?.();
  emit_update();

  const elapsed = get_now() - frame_start;
  const delay = Math.max(0, TARGET_FRAME_MS - elapsed);

  if (delay > 0 && ctx.running && !ctx.die && !ctx.paused) {
    timeout_handle = setTimeout(() => {
      timeout_handle = null;
      if (ctx.running && !ctx.die && !ctx.paused) schedule_loop();
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

export function emu_subscribe(listener: (c: Readonly<emu_context>) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emu_init(): void {
  cancel_loop();

  int_init();
  timer_init(cpu_request_interrupt);
  dma_init(bus_read, (addr: number, val: number) => ppu_oam_write(addr, val));
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
  ctx.rom_name = ok ? filename ?? null : null;
  emit_update();
  return ok;
}

export function emu_load_and_start(data: Uint8Array, filename?: string): boolean {
  if (!initialized) emu_init();
  const ok = emu_load_rom(data, filename);
  if (!ok) return false;
  emu_start();
  return true;
}

export function emu_start(): void {
  if (!initialized) emu_init();
  if (!ctx.rom_loaded) return;
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


