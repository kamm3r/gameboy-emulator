import { cpu_step } from "@/lib/cpu.js";
import { cart_load } from "./cartridge.js";
import { delay } from "@/lib/common.js";

type emulator_context = {
  paused: boolean;
  running: boolean;
  ticks: number;
};

const ctx: emulator_context = {
  paused: false,
  running: false,
  ticks: 0,
};

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

  ctx.running = true;
  ctx.paused = false;
  ctx.ticks = 0;

  while (ctx.running) {
    if (ctx.paused) {
      delay(10);
      console.log("paused");
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

export function emulation_cycles(cpu_cycles: number): void {}
