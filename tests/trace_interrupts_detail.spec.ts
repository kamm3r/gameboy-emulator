import { test } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { cpu_get_context, cpu_step } from "../src/lib/cpu/cpu.js";
import { bus_read, bus_write } from "../src/lib/memory/bus.js";
import { emu_init, emu_load_rom, emu_stop } from "../src/lib/emu.js";
import { dbg_get_message, dbg_clear } from "../src/lib/dbg.js";
import { instruction_name } from "../src/lib/cpu/instructions.js";

const ROMS_DIR = path.join(import.meta.dirname, "..", "game-boy-test-roms-v7.0");

function hex2(v: number): string {
  return (v & 0xff).toString(16).padStart(2, "0");
}
function hex4(v: number): string {
  return (v & 0xffff).toString(16).padStart(4, "0");
}

test("detailed trace 02-interrupts test2", () => {
  const romPath = path.join(ROMS_DIR, "blargg/cpu_instrs/individual/02-interrupts.gb");
  const buffer = fs.readFileSync(romPath);
  const data = new Uint8Array(buffer);

  emu_init();
  dbg_clear();
  emu_load_rom(data, "02-interrupts.gb");

  const MAX = 500000;
  let serialOutput = "";
  let stepped = 0;
  let foundEI = false;
  let afterINT = false;
  let intStep = 0;

  for (let step = 0; step < MAX; step++) {
    const cpu = cpu_get_context();
    const pc = cpu.registers.PC;
    const opcode = bus_read(pc);

    const s = bus_read(0xff02);
    if ((s & 0x81) === 0x81) {
      const c = bus_read(0xff01);
      bus_write(0xff02, 0);
      serialOutput += String.fromCharCode(c);
    }

    // Detect EI at 0xC2B5 (test #2)
    if (!foundEI && opcode === 0xFB && pc === 0xC2B5) {
      foundEI = true;
      console.log("=== Found EI at 0xC2B5 (test #2 starts) ===");
    }

    // Log 10 steps before EI through 20 steps after interrupt
    if (foundEI && !afterINT) {
      const ime = cpu.int_master_enabled;
      const enabling = cpu.enabling_ime;
      const if_ = bus_read(0xff0f);
      const ie = bus_read(0xffff);
      const r = cpu.registers;
      const iname = cpu.current_instruction ? instruction_name(cpu.current_instruction.type) : "???";
      const hl = (r.H << 8) | r.L;

      console.log(
        `[${step}] PC=0x${hex4(pc)} op=0x${hex2(opcode)} ${iname.padEnd(8)}` +
        ` IME=${ime} en=${enabling} IF=0x${hex2(if_)} IE=0x${hex2(ie)}` +
        ` A=0x${hex2(r.A)} BC=0x${hex4((r.B<<8)|r.C)} HL=0x${hex4(hl)}` +
        ` SP=0x${hex4(r.SP)}`
      );
    }

    if (!cpu_step()) break;
    stepped = step;

    // Detect interrupt servicing (PC == 0x50)
    const cpu2 = cpu_get_context();
    if (foundEI && !afterINT && cpu2.registers.PC === 0x50) {
      afterINT = true;
      intStep = step;
      console.log("=== Interrupted! Now at 0x50 (timer vector) ===");
    }

    // After interrupt, trace the handler and return
    if (afterINT && step <= intStep + 10) {
      const pc2 = cpu2.registers.PC;
      const op2 = bus_read(pc2);
      const ime = cpu2.int_master_enabled;
      const r = cpu2.registers;
      const iname = cpu2.current_instruction ? instruction_name(cpu2.current_instruction.type) : "???";
      console.log(
        `[${step}] PC=0x${hex4(pc2)} op=0x${hex2(op2)} ${iname.padEnd(8)}` +
        ` A=0x${hex2(r.A)} SP=0x${hex4(r.SP)} IME=${ime}`
      );
    }

    if (serialOutput.includes("Failed") || serialOutput.includes("Passed")) {
      console.log(`\nResult: "${serialOutput}"`);
      break;
    }
  }

  emu_stop();
  const cpu = cpu_get_context();
  console.log(`\nFinal: PC=0x${hex4(cpu.registers.PC)} A=0x${hex2(cpu.registers.A)} IME=${cpu.int_master_enabled}`);
  console.log(`Steps: ${stepped}, Serial: "${serialOutput}"`);
});
