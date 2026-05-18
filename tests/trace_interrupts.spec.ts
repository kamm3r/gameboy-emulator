import { test } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { cpu_get_context, cpu_step } from "../src/lib/cpu/cpu.js";
import { bus_read, bus_write } from "../src/lib/memory/bus.js";
import { emu_init, emu_load_rom, emu_stop } from "../src/lib/emu.js";
import { dbg_get_message, dbg_clear } from "../src/lib/dbg.js";
import { instruction_name } from "../src/lib/cpu/instructions.js";

const ROMS_DIR = path.join(
  import.meta.dirname,
  "..",
  "game-boy-test-roms-v7.0",
);

function hex2(v: number): string {
  return (v & 0xff).toString(16).padStart(2, "0");
}

function hex4(v: number): string {
  return (v & 0xffff).toString(16).padStart(4, "0");
}

const INT_VECTORS = [0x40, 0x48, 0x50, 0x58, 0x60];

test("trace 02-interrupts EI/DI/interrupt behavior", () => {
  const romPath = path.join(
    ROMS_DIR,
    "blargg/cpu_instrs/individual/02-interrupts.gb",
  );
  const buffer = fs.readFileSync(romPath);
  const data = new Uint8Array(buffer);

  emu_init();
  dbg_clear();

  const ok = emu_load_rom(data, "02-interrupts.gb");
  if (!ok) {
    console.log("FAILED: Could not load ROM");
    return;
  }

  const MAX_STEPS = 500000;
  let serialOutput = "";
  const serialWrites: number[] = [];

  interface TraceEvent {
    step: number;
    pc: number;
    type: string;
    detail: string;
  }
  const events: TraceEvent[] = [];

  console.log("\n=== Starting trace of 02-interrupts.gb ===\n");

  for (let step = 0; step < MAX_STEPS; step++) {
    const cpu = cpu_get_context();
    const r = cpu.registers;
    const pc = r.PC;

    // Check serial output before stepping
    const serialCtrl = bus_read(0xff02);
    if ((serialCtrl & 0x81) === 0x81) {
      const c = bus_read(0xff01);
      serialWrites.push(c);
      if (c >= 0x20 && c <= 0x7e) {
        serialOutput += String.fromCharCode(c);
      }
      bus_write(0xff02, 0);
    }

    if (
      serialOutput.includes("Failed") || serialOutput.includes("Passed")
    ) {
      console.log(`Result in serial output: "${serialOutput}"`);
      break;
    }

    const opcode = bus_read(pc);

    if (opcode === 0xFB) {
      events.push({
        step,
        pc,
        type: "EI",
        detail: `EI opcode at PC=0x${hex4(pc)}`,
      });
    } else if (opcode === 0xF3) {
      events.push({
        step,
        pc,
        type: "DI",
        detail: `DI opcode at PC=0x${hex4(pc)}`,
      });
    }

    const imeBefore = cpu.int_master_enabled;
    const enablingBefore = cpu.enabling_ime;
    const intFlagsBefore = bus_read(0xff0f);
    const ieBefore = bus_read(0xffff);
    const haltedBefore = cpu.halted;

    const stepOk = cpu_step();
    if (!stepOk) {
      console.log(`CPU stopped at step ${step}, PC=0x${hex4(r.PC)}`);
      break;
    }

    const cpuAfter = cpu_get_context();
    const imeAfter = cpuAfter.int_master_enabled;
    const enablingAfter = cpuAfter.enabling_ime;
    const haltedAfter = cpuAfter.halted;
    const handlerAddr = cpuAfter.registers.PC;

    // Detect interrupt service by checking if PC jumped to a vector address
    if (
      INT_VECTORS.includes(handlerAddr) && handlerAddr !== pc
    ) {
      events.push({
        step,
        pc: handlerAddr,
        type: "INT_SERVICE",
        detail:
          `Servicing interrupt → 0x${hex4(handlerAddr)} (was at 0x${hex4(pc)})`,
      });
    }

    // Log on interesting state changes
    const interestingOpcode = opcode === 0xFB || opcode === 0xF3 ||
      opcode === 0x76;
    const stateChanged = imeBefore !== imeAfter ||
      enablingBefore !== enablingAfter || haltedBefore !== haltedAfter;
    const atHandler = INT_VECTORS.includes(handlerAddr);

    if (interestingOpcode || stateChanged || atHandler) {
      const inst = cpuAfter.current_instruction;
      const instName = inst ? instruction_name(inst.type) : "???";
      console.log(
        `[${step}] PC=0x${hex4(pc)} op=0x${hex2(opcode)} ${instName.padEnd(6)}` +
        ` IME=${imeBefore}→${imeAfter} enab=${enablingBefore}→${enablingAfter}` +
        ` halt=${haltedBefore}→${haltedAfter} IF=0x${hex2(intFlagsBefore)} IE=0x${hex2(ieBefore)}` +
        ` A=0x${hex2(r.A)} SP=0x${hex4(r.SP)} PC→0x${hex4(handlerAddr)}`,
      );
    }
  }

  emu_stop();

  const dbgMessage = dbg_get_message();

  console.log("\n=== TRACE SUMMARY ===");
  console.log(`Serial output: "${serialOutput}"`);
  console.log(`DBG message: "${dbgMessage}"`);

  console.log("\n--- Interrupt-related events ---");
  for (const ev of events) {
    console.log(`  [${ev.step}] ${ev.type}: ${ev.detail}`);
  }

  const cpu = cpu_get_context();
  console.log(`\nFinal state:`);
  console.log(
    `  PC=0x${hex4(cpu.registers.PC)} A=0x${hex2(cpu.registers.A)} SP=0x${hex4(cpu.registers.SP)}`,
  );
  console.log(
    `  IME=${cpu.int_master_enabled} enabling_ime=${cpu.enabling_ime} halted=${cpu.halted}`,
  );
  console.log(
    `  IF=0x${hex2(bus_read(0xff0f))} IE=0x${hex2(bus_read(0xffff))}`,
  );
  console.log(
    `  Serial bytes (${serialWrites.length}): ${
      serialWrites.length > 0
        ? serialWrites.map((c) => `0x${hex2(c)}`).join(" ")
        : "(none)"
    }`,
  );
});
