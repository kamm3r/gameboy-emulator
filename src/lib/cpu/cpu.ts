import { bus_read } from "@/lib/memory/bus";
import { formatter } from "@/lib/common";
import { fetch_data } from "@/lib/cpu/cpu_fetch";
import { instruction_get_processor } from "@/lib/cpu/cpu_proc";
import { cpu_handle_interrupts } from "@/lib/interrupts";
import {
  type instruction,
  instruction_by_opcode,
  instruction_name,
} from "@/lib/cpu/instructions";
import { timer_get_context } from "@/lib/timer";
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

const ctx: cpu_context = {
  registers: { A: 0, F: 0, B: 0, C: 0, D: 0, E: 0, H: 0, L: 0, PC: 0, SP: 0 },

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

export function cpu_init(): void {
  // DMG register state after the boot ROM
  Object.assign(ctx.registers, {
    A: 0x01, F: 0xb0, B: 0x00, C: 0x13, D: 0x00,
    E: 0xd8, H: 0x01, L: 0x4d, PC: 0x0100, SP: 0xfffe,
  });

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

function trace(pc: number): void {
  const r = ctx.registers;
  const flags = ["Z", "N", "H", "C"]
    .map((f, i) => (r.F & (0x80 >> i) ? f : "-"))
    .join("");

  console.log(
    formatter(
      "%08lX - %04X: %-12s (%02X %02X %02X) A: %02X F: %s BC: %02X%02X DE: %02X%02X HL: %02X%02X\n",
      emu_get_context().ticks,
      pc,
      instruction_name(ctx.current_instruction!.type),
      ctx.current_opcode,
      bus_read((pc + 1) & 0xffff),
      bus_read((pc + 2) & 0xffff),
      r.A, flags, r.B, r.C, r.D, r.E, r.H, r.L,
    ),
  );
}

export function cpu_step(): boolean {
  if (!ctx.halted) {
    const pc = ctx.registers.PC;

    ctx.current_opcode = bus_read(pc) & 0xff;
    ctx.registers.PC = (pc + 1) & 0xffff;
    ctx.current_instruction = instruction_by_opcode(ctx.current_opcode);
    emu_cycles(1);
    fetch_data(ctx);

    if (CPU_DEBUG) {
      trace(pc);
    }

    instruction_get_processor(ctx.current_instruction.type)(ctx);
  } else {
    emu_cycles(1);

    if (ctx.int_flags) {
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

export { INT_VBLANK, INT_LCD_STAT } from "@/lib/interrupts";