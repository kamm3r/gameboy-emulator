import { cpu_step, cpu_init, cpu_handle_interrupts, cpu_get_context } from "@/lib/cpu";
import { cart_load } from "./cart";
import { delay } from "@/lib/common";
import { timer_init, timer_tick } from "@/lib/timer";
import { ppu_init, ppu_tick } from "@/lib/ppu";
import { dma_tick } from "@/lib/dma";

type emulator_context = {
  paused: boolean;
  running: boolean;
  ticks: number;
  die: boolean;
};

const ctx: emulator_context = {
  paused: false,
  running: false,
  ticks: 0,
  die: false,
};

export function emulation_get_context(): emulator_context {
  return ctx;
}

export function emulation_run(argc: number, argv: string[]): number {
  if (argc < 2) {
    console.log("Usage: emu <rom_file>\n");
    return -1;
  }

  if (!cart_load(argv[2])) {
    console.log(`Failed to load ROM file: \n ${argv[2]}`);
    return -2;
  }

  console.log("Cart loaded...\n");

  timer_init();
  cpu_init();
  ppu_init();

  ctx.running = true;
  ctx.paused = false;
  ctx.ticks = 0;

  while (ctx.running) {
    if (ctx.paused) {
      delay(10);
      continue;
    }
    if (!cpu_step()) {
      console.log("CPU Stopped\n");
      return -3;
    }

    ctx.ticks++;
  }
  return 0;
}

export function emulation_cycles(cpu_cycles: number): void {
  for (let i = 0; i < cpu_cycles; i++) {
    for (let n = 0; n < 4; n++) {
      ctx.ticks++;
      timer_tick();
      ppu_tick();
    }

    dma_tick();
  }
}

export function handle_interrupts(): void {
  const cpu = cpu_get_context();
  if (cpu.int_master_enabled) {
    cpu_handle_interrupts();
    cpu.enabling_ime = false;
  }

  if (cpu.enabling_ime) {
    cpu.int_master_enabled = true;
  }
}
