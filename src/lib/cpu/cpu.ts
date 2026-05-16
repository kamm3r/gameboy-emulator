import { bus_read } from "@/lib/memory/bus";
import { fetch_data } from "@/lib/cpu/cpu_fetch";
import { instruction_get_processor } from "@/lib/cpu/cpu_proc";
import { cpu_handle_interrupts } from "@/lib/interrupts";
import {
  type instruction,
  instruction_by_opcode,
  instruction_name,
} from "@/lib/cpu/instructions";
import { timer_get_context } from "@/lib/timer";
import { dbg_update, dbg_print } from "@/lib/dbg";
import { emu_cycles, emu_get_context } from "@/lib/emu";

export type cpu_registers = {
  A: number;
  F: number;
  B: number;
  C: number;
  D: number;
  E: number;
  H: number;
  L: number;
  PC: number;
  SP: number;
};

export type cpu_context = {
  registers: cpu_registers;

  fetched_data: number;
  memory_destination: number;
  destination_is_memory: boolean;
  current_opcode: number;
  current_instruction: instruction | null;

  halted: boolean;
  stepping: boolean;

  int_master_enabled: boolean;
  enabling_ime: boolean;
  ie_register: number;
  int_flags: number;
};

const registers: cpu_registers = {
  A: 0,
  F: 0,
  B: 0,
  C: 0,
  D: 0,
  E: 0,
  H: 0,
  L: 0,
  PC: 0,
  SP: 0,
};

const ctx: cpu_context = {
  registers,

  fetched_data: 0,
  memory_destination: 0,
  destination_is_memory: false,
  current_opcode: 0,
  current_instruction: null,

  halted: false,
  stepping: false,

  int_master_enabled: false,
  enabling_ime: false,
  ie_register: 0,
  int_flags: 0,
};

const CPU_DEBUG = false;

function hex2(value: number): string {
  return (value & 0xff).toString(16).padStart(2, "0");
}

function hex4(value: number): string {
  return (value & 0xffff).toString(16).padStart(4, "0");
}

export function cpu_init(): void {
  const r = ctx.registers;

  r.PC = 0x0100;
  r.SP = 0xfffe;
  r.A = 0x01;
  r.F = 0xb0;
  r.B = 0x00;
  r.C = 0x13;
  r.D = 0x00;
  r.E = 0xd8;
  r.H = 0x01;
  r.L = 0x4d;

  ctx.fetched_data = 0;
  ctx.memory_destination = 0;
  ctx.destination_is_memory = false;
  ctx.current_opcode = 0;
  ctx.current_instruction = null;

  ctx.halted = false;
  ctx.stepping = false;

  ctx.ie_register = 0;
  ctx.int_flags = 0;
  ctx.int_master_enabled = false;
  ctx.enabling_ime = false;

  timer_get_context().div = 0xabcc;
}

export function fetch_instruction(): void {
  const r = ctx.registers;
  const opcode = bus_read(r.PC) & 0xff;

  r.PC = (r.PC + 1) & 0xffff;
  ctx.current_opcode = opcode;
  ctx.current_instruction = instruction_by_opcode(opcode);
}

export function execute(): void {
  const inst = ctx.current_instruction;

  if (inst === null) {
    throw new Error(
      `Unknown instruction ${hex2(ctx.current_opcode)} at PC ${hex4(
        ctx.registers.PC - 1,
      )}`,
    );
  }

  const proc = instruction_get_processor(inst.type);

  if (proc === undefined) {
    throw new Error(
      `No processor for instruction ${instruction_name(inst.type)} opcode=${hex2(
        ctx.current_opcode,
      )}`,
    );
  }

  proc(ctx);
}

function cpu_debug_log(pc: number): void {
  const r = ctx.registers;
  const inst = ctx.current_instruction;

  if (inst === null) {
    return;
  }

  const f = r.F;
  const flags = `${f & 0x80 ? "Z" : "-"}${f & 0x40 ? "N" : "-"}${
    f & 0x20 ? "H" : "-"
  }${f & 0x10 ? "C" : "-"}`;

  console.log(
    `${emu_get_context().ticks
      .toString(16)
      .padStart(8, "0")
      .toUpperCase()} - ${hex4(pc).toUpperCase()}: ${instruction_name(
      inst.type,
    ).padEnd(12)} (${hex2(ctx.current_opcode).toUpperCase()} ${hex2(
      bus_read((pc + 1) & 0xffff),
    ).toUpperCase()} ${hex2(bus_read((pc + 2) & 0xffff)).toUpperCase()}) ` +
      `A: ${hex2(r.A).toUpperCase()} F: ${flags} ` +
      `BC: ${hex2(r.B).toUpperCase()}${hex2(r.C).toUpperCase()} ` +
      `DE: ${hex2(r.D).toUpperCase()}${hex2(r.E).toUpperCase()} ` +
      `HL: ${hex2(r.H).toUpperCase()}${hex2(r.L).toUpperCase()}`,
  );
}

export function cpu_step(): boolean {
  const r = ctx.registers;

  if (!ctx.halted) {
    const pc = r.PC;

    fetch_instruction();
    emu_cycles(1);
    fetch_data(ctx);

    if (CPU_DEBUG) {
      cpu_debug_log(pc);
    }

    if (ctx.current_instruction === null) {
      console.log(`Unknown Instruction! ${hex2(ctx.current_opcode)}`);
      return false;
    }

    dbg_update();
    dbg_print();

    execute();
  } else {
    emu_cycles(1);

    if (ctx.int_flags !== 0) {
      ctx.halted = false;
    }
  }

  if (ctx.int_master_enabled) {
    cpu_handle_interrupts();
    ctx.enabling_ime = false;
  }

  if (ctx.enabling_ime) {
    ctx.int_master_enabled = true;
  }

  return true;
}

export function cpu_ie_register(): number {
  return ctx.ie_register & 0xff;
}

export function cpu_set_ie_register(value: number): void {
  ctx.ie_register = value & 0xff;
}

export function cpu_get_registers(): cpu_registers {
  return ctx.registers;
}

export function cpu_get_int_flags(): number {
  return ctx.int_flags & 0xff;
}

export function cpu_set_int_flags(value: number): void {
  ctx.int_flags = value & 0xff;
}

export function cpu_get_context(): cpu_context {
  return ctx;
}

export function cpu_request_interrupt(interrupt: number): void {
  ctx.int_flags = (ctx.int_flags | interrupt) & 0xff;
}

export {
  INT_VBLANK,
  INT_LCD_STAT,
  INT_TIMER,
  INT_SERIAL,
  INT_JOYPAD,
  cpu_handle_interrupts,
} from "@/lib/interrupts";