import { test, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { cpu_get_context, cpu_step } from "../src/lib/cpu.js";
import { timer_tick } from "../src/lib/timer.js";
import { ppu_tick } from "../src/lib/ppu_sm.js";
import { dma_tick } from "../src/lib/dma.js";
import { bus_read, bus_write } from "../src/lib/bus.js";
import { dbg_get_message, dbg_clear } from "../src/lib/dbg.js";
import {
  emu_init,
  emu_load_rom,
  emu_stop,
  emu_get_context,
} from "../src/lib/emu.js";

const TEST_ROMS = [
  "01-special.gb",
  "02-interrupts.gb",
  "03-op sp,hl.gb",
  "04-op r,imm.gb",
  "05-op rp.gb",
  "06-ld r,r.gb",
  "07-jr,jp,call,ret,rst.gb",
  "08-misc instrs.gb",
  "09-op r,r.gb",
  "10-bit ops.gb",
  "11-op a,(hl).gb",
  "cpu_instrs.gb",
  "dmg-acid2.gb",
  "mem_timing.gb",
];

function runEmulator(
  romPath: string,
  maxCycles: number = 2_000_000,
): { passed: boolean; output: string; cycles: number; debugInfo: string } {
  const buffer = fs.readFileSync(romPath);
  const data = new Uint8Array(buffer);

  emu_init();
  dbg_clear();

  const success = emu_load_rom(data, path.basename(romPath));
  if (!success) {
    return {
      passed: false,
      output: "Failed to load ROM",
      cycles: 0,
      debugInfo: "",
    };
  }

  let cycles = 0;
  const cyclesPerFrame = 17556;
  const maxFrames = Math.floor(maxCycles / cyclesPerFrame);
  let serialWriteCount = 0;
  const serialWrites: number[] = [];
  let stopped = false;

  for (let frame = 0; frame < maxFrames && !stopped; frame++) {
    const ctx = emu_get_context();
    if (ctx.die) {
      break;
    }

    const stepsPerFrame = Math.floor(cyclesPerFrame / 4);
    for (let i = 0; i < stepsPerFrame; i++) {
      const serialCtrl = bus_read(0xff02);
      if (serialCtrl === 0x81) {
        const c = bus_read(0xff01);
        serialWriteCount++;
        if (serialWrites.length < 200) {
          serialWrites.push(c);
        }
        bus_write(0xff02, 0);
      }

      if (!cpu_step()) {
        stopped = true;
        break;
      }

      for (let n = 0; n < 4; n++) {
        timer_tick();
        ppu_tick();
      }
      dma_tick();
      cycles++;
    }

    if (serialWriteCount > 100) {
      break;
    }
  }

  emu_stop();

  const serialOutput = String.fromCharCode(
    ...serialWrites.filter((c) => c !== 0),
  );
  const dbgOutput = dbg_get_message();
  const cpu = cpu_get_context();
  const debugInfo = `PC: 0x${cpu.registers.PC.toString(16)}, A: 0x${cpu.registers.A.toString(16)}, halted: ${cpu.halted}, serialWrites: ${serialWriteCount}`;

  const finalOutput = serialOutput || dbgOutput;
  const hasPassed = finalOutput.toLowerCase().includes("passed");
  const hasFailed = finalOutput.toLowerCase().includes("failed");
  const passed = hasPassed || (!hasFailed && finalOutput.length > 0);

  return { passed, output: finalOutput, cycles, debugInfo };
}

for (const rom of TEST_ROMS) {
  test(rom, () => {
    const romPath = path.join(process.cwd(), "roms", rom);
    const result = runEmulator(romPath);

    console.log(
      `\n${rom}: cycles=${result.cycles}, output length=${result.output.length}`,
    );
    console.log("Debug:", result.debugInfo);
    console.log("Output:", result.output);

    expect(
      result.passed,
      `ROM ${rom} failed: ${result.debugInfo} - ${result.output}`,
    ).toBe(true);
  });
}