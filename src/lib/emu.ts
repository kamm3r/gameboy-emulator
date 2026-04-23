import { cpu_init, cpu_step } from "@/lib/cpu";
import { cart_load } from "@/lib/cart";
import { dma_tick } from "@/lib/dma";
import { ppu_get_context, ppu_init } from "@/lib/ppu";
import { ppu_tick, ppu_sm_init } from "@/lib/ppu_sm";
import { timer_init, timer_tick } from "@/lib/timer";
import { audio_init, audio_tick } from "./audio/apu";

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
let loop_handle: ReturnType<typeof setTimeout> | null = null;

let ctx_snapshot: Readonly<emu_context> = Object.freeze({ ...ctx });

const server_snapshot: Readonly<emu_context> = Object.freeze({
  paused: false,
  running: false,
  die: false,
  ticks: 0,
  current_frame: 0,
  rom_loaded: false,
  rom_name: null,
});

const MAX_CPU_STEPS_PER_SLICE = 2000;
const MAX_SLICE_MS = 8;

function get_now(): number {
  return typeof performance !== "undefined"
    ? performance.now()
    : Date.now();
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

function clear_loop(): void {
  if (loop_handle !== null) {
    clearTimeout(loop_handle);
    loop_handle = null;
  }
}

function schedule_loop(): void {
  if (loop_handle !== null || !ctx.running || ctx.die) {
    return;
  }

  loop_handle = setTimeout(run_loop, 0);
}

function run_loop(): void {
  loop_handle = null;

  if (!ctx.running || ctx.die) {
    return;
  }

  if (ctx.paused) {
    schedule_loop();
    return;
  }

  const start_time = get_now();
  let steps = 0;
  let frame_changed = false;

  while (
    ctx.running &&
    !ctx.paused &&
    !ctx.die &&
    steps < MAX_CPU_STEPS_PER_SLICE &&
    get_now() - start_time < MAX_SLICE_MS
  ) {
    if (!cpu_step()) {
      console.log("cpu stopped");
      ctx.running = false;
      emit_update();
      return;
    }

    // CRITICAL: Tick system after each CPU instruction
    // If cpu_step() already calls emu_cycles() internally, remove this
    // Average Game Boy instruction is ~2-3 M-cycles
    emu_cycles(2);

    steps++;

    const frame = ppu_get_context().current_frame;

    if (frame !== ctx.current_frame) {
      ctx.current_frame = frame;
      frame_changed = true;
      break;
    }
  }

  if (frame_changed) {
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

  return () => {
    listeners.delete(listener);
  };
}

export function emu_init(): void {
  clear_loop();

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
  ctx.current_frame = ppu_get_context().current_frame;
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
  if (!initialized) {
    emu_init();
  }

  const ok = emu_load_rom(data, filename);

  if (!ok) {
    return false;
  }

  emu_start();
  return true;
}

export function emu_start(): void {
  if (!initialized) {
    emu_init();
  }

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
  if (!ctx.running) {
    return;
  }

  ctx.paused = true;
  emit_update();
}

export function emu_resume(): void {
  if (!ctx.running) {
    return;
  }

  ctx.paused = false;
  emit_update();
  schedule_loop();
}

export function emu_stop(): void {
  ctx.running = false;
  ctx.paused = false;
  ctx.die = true;

  clear_loop();
  emit_update();
}

/**
 * Run system forward by cpu_cycles machine cycles.
 * Each machine cycle = 4 T-states (timer/ppu/audio ticks).
 */
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

export function emu_run(max_cpu_steps = MAX_CPU_STEPS_PER_SLICE): boolean {
  if (!ctx.running || ctx.paused || ctx.die) {
    return false;
  }

  for (let i = 0; i < max_cpu_steps; i++) {
    if (!cpu_step()) {
      console.log("cpu stopped");
      ctx.running = false;
      emit_update();
      return false;
    }

    emu_cycles(2);

    const frame = ppu_get_context().current_frame;

    if (frame !== ctx.current_frame) {
      ctx.current_frame = frame;
      emit_update();
      break;
    }
  }

  return true;
}

export function emu_get_frame(): number {
  return ctx.current_frame;
}