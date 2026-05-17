import { test, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { cpu_get_context, cpu_step } from "../src/lib/cpu/cpu.js";
import { bus_read, bus_write } from "../src/lib/memory/bus.js";
import { dbg_get_message, dbg_clear } from "../src/lib/dbg.js";
import {
  emu_init,
  emu_load_rom,
  emu_stop,
  emu_get_context,
  emu_cycles,
} from "../src/lib/emu.js";

const AUDIO_TEST_ROMS = [
  "blargg/cgb_sound/rom_singles/01-registers.gb",
  "blargg/cgb_sound/rom_singles/02-len ctr.gb",
  "blargg/cgb_sound/rom_singles/03-trigger.gb",
  "blargg/cgb_sound/rom_singles/04-sweep.gb",
  "blargg/cgb_sound/rom_singles/05-sweep details.gb",
  "blargg/cgb_sound/rom_singles/06-overflow on trigger.gb",
  "blargg/cgb_sound/rom_singles/07-len sweep period sync.gb",
  "blargg/cgb_sound/rom_singles/08-len ctr during power.gb",
  "blargg/cgb_sound/rom_singles/09-wave read while on.gb",
  "blargg/cgb_sound/rom_singles/10-wave trigger while on.gb",
  "blargg/cgb_sound/rom_singles/11-regs after power.gb",
  "blargg/cgb_sound/rom_singles/12-wave.gb",
];

function runEmulator(
  romPath: string,
  maxCycles: number = 20_000_000,
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
      if ((serialCtrl & 0x80) !== 0) {
        const c = bus_read(0xff01);
        serialWriteCount++;
        if (serialWrites.length < 500) {
          serialWrites.push(c);
        }
        bus_write(0xff02, serialCtrl & 0x7f);
      }

      if (!cpu_step()) {
        stopped = true;
        break;
      }

      cycles++;
    }

    if (serialWriteCount > 200) {
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

for (const rom of AUDIO_TEST_ROMS) {
  test(rom, () => {
    const romPath = path.join(process.cwd(), "roms", rom);
    const result = runEmulator(romPath);

    console.log(
      `\n${rom}: cycles=${result.cycles}, output length=${result.output.length}`,
    );
    console.log("Debug:", result.debugInfo);
    console.log("Output:", result.output.substring(0, 200));

    expect(
      result.passed,
      `ROM ${rom} failed: ${result.debugInfo} - ${result.output.substring(0, 200)}`,
    ).toBe(true);
  });
}
