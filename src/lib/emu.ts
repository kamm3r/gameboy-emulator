import { cpu_step, cpu_init } from "@/lib/cpu";
import { cart_load } from "./cart";
import { delay } from "@/lib/common";
import { timer_init, timer_tick } from "@/lib/timer";
import { ppu_init, ppu_tick, ppu_get_context } from "@/lib/ppu";
import { dma_tick } from "@/lib/dma";
import { ui_init, ui_handle_events, ui_update } from "@/lib/ui";

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

export async function cpu_run(): Promise<void> {
  timer_init();
  cpu_init();
  ppu_init();

  ctx.running = true;
  ctx.paused = false;
  ctx.ticks = 0;

  while (ctx.running) {
    if (ctx.paused) {
      await delay(10);
      console.log("paused");
      continue;
    }

    if (!cpu_step()) {
      console.log("CPU stopped\n");
      break;
    }
  }
}

export async function emu_run(
  argc: number,
  argv: string[],
): Promise<number> {
  if (argc < 2) {
    console.log("Usage: emu <rom_file>\n");
    return -1;
  }

  const romPath = argv[2];

  if (!cart_load(romPath)) {
    console.log(`Failed to load ROM file: ${romPath}`);
    return -2;
  }

  console.log("Cart loaded...");

  ui_init();

  void cpu_run();

  let prevFrame = 0;

  while (!ctx.die) {
    await delay(1);
    ui_handle_events();

    const currentFrame = ppu_get_context().current_frame;
    if (prevFrame !== currentFrame) {
      ui_update();
    }
    prevFrame = currentFrame;
  }

  return 0;
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