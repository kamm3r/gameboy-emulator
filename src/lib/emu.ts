import { cpu_step, cpu_init } from "@/lib/cpu";
import { cart_load } from "@/lib/cart";
import { timer_init, timer_tick } from "@/lib/timer";
import { ppu_init, ppu_get_context } from "@/lib/ppu";
import { ppu_tick } from "@/lib/ppu_sm";
import { dma_tick } from "@/lib/dma";

type emu_context = {
  paused: boolean;
  running: boolean;
  die: boolean;
  ticks: number;
};

const ctx: emu_context = {
  paused: false,
  running: false,
  die: false,
  ticks: 0,
};

export function emu_get_context(): emu_context {
  return ctx;
}

export function emu_init(): void {
  timer_init();
  cpu_init();
  ppu_init();

  ctx.running = false;
  ctx.paused = false;
  ctx.die = false;
  ctx.ticks = 0;
}

export function emu_load_rom(data: Uint8Array, filename?: string): boolean {
  return cart_load(data, filename);
}

export function emu_start(): void {
  ctx.running = true;
  ctx.paused = false;
}

export function emu_stop(): void {
  ctx.running = false;
  ctx.die = true;
}

export function emu_cycles(cpu_cycles: number): void {
  for (let i = 0; i < cpu_cycles; i++) {
    for (let n = 0; n < 4; n++) {
      ctx.ticks++;
      timer_tick();
      ppu_tick();
    }

    dma_tick();
  }
}

export function emu_run_chunk(maxCpuSteps: number): boolean {
  if (!ctx.running || ctx.paused || ctx.die) {
    return false;
  }

  for (let i = 0; i < maxCpuSteps; i++) {
    if (!cpu_step()) {
      ctx.running = false;
      return false;
    }
  }

  return true;
}

export function emu_get_frame(): number {
  return ppu_get_context().current_frame;
}