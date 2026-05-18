import { test } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { cpu_get_context, cpu_step } from "../src/lib/cpu/cpu.js";
import { bus_read, bus_write } from "../src/lib/memory/bus.js";
import { emu_init, emu_load_rom, emu_stop } from "../src/lib/emu.js";
import { dbg_get_message, dbg_clear } from "../src/lib/dbg.js";

const ROMS_DIR = path.join(import.meta.dirname, "..", "game-boy-test-roms-v7.0");

function hex2(v: number): string {
  return (v & 0xff).toString(16).padStart(2, "0");
}
function hex4(v: number): string {
  return (v & 0xffff).toString(16).padStart(4, "0");
}

test("dump 02-interrupts test2 code after interrupt", () => {
  const romPath = path.join(ROMS_DIR, "blargg/cpu_instrs/individual/02-interrupts.gb");
  const buffer = fs.readFileSync(romPath);
  const data = new Uint8Array(buffer);
  const rom = new Uint8Array(0x8000);
  rom.set(data);

  console.log("=== ROM bank 1 file offset 0x4200-0x42FF ===");
  console.log("This code gets copied to WRAM 0xC200-0xC2FF");
  for (let i = 0x4200; i < 0x4300; i++) {
    if ((i - 0x4200) % 16 === 0) {
      process.stdout.write(`\n0x${(i - 0x4000).toString(16)}: `);
    }
    process.stdout.write(`${hex2(rom[i])} `);
  }
  console.log("\n");

  emu_init();
  dbg_clear();
  const ok = emu_load_rom(rom, "02-interrupts.gb");
  if (!ok) {
    console.log("Failed to load ROM");
    return;
  }

  // Run until just before EI test
  const MAX = 175200;
  for (let step = 0; step < MAX; step++) {
    cpu_step();
  }

  // Now dump WRAM around 0xC2C0
  console.log("\n=== WRAM at 0xC2C0 (read via bus_read) after reaching EI test ===");
  for (let i = 0xC2C0; i < 0xC300; i++) {
    if ((i - 0xC2C0) % 16 === 0) {
      process.stdout.write(`\n0x${(i - 0xC000).toString(16)}: `);
    }
    process.stdout.write(`${hex2(bus_read(i))} `);
  }
  console.log();

  // Run 10 more steps (through EI, LD BC, PUSH, POP, INC B, LD A, LDH, INT)
  for (let i = 0; i < 20; i++) {
    cpu_step();
    const cpu = cpu_get_context();
    console.log(`step=${175200+i} PC=0x${hex4(cpu.registers.PC)} A=0x${hex2(cpu.registers.A)} SP=0x${hex4(cpu.registers.SP)} IME=${cpu.int_master_enabled}`);
  }

  // Now dump WRAM around where the test result might be stored
  console.log("\n=== WRAM at 0xD000 ===");
  for (let i = 0xD000; i < 0xD020; i++) {
    if ((i - 0xD000) % 16 === 0) {
      process.stdout.write(`\n0x${(i - 0xC000).toString(16)}: `);
    }
    process.stdout.write(`${hex2(bus_read(i))} `);
  }
  console.log();

  emu_stop();
});
