// const Flags = {
//   ZERO: 0b10000000,
//   ADD_SUBTRACT: 0b0100_0000,
//   HALF_CARRY: 0b00100000,
//   CARRY: 0b00010000,
// } as const;

import { bus_read, bus_write } from "@/lib/bus";
import { formatter, NO_IMPL } from "@/lib/common";
import { fetch_data } from "@/lib/cpu_fetch";
import { instruction_get_processor } from "@/lib/cpu_proc";
import { emulation_cycles, emulation_get_context } from "@/lib/emu";
import {
  instruction,
  instruction_by_opcode,
  instruction_name,
} from "@/lib/instructions";

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
  current_instruction: instruction;

  halted: boolean;
  stepping: boolean;

  int_master_enabled: boolean;
  enabling_ime: boolean;
  ie_register: number;
  int_flags: number;
};

const ctx: cpu_context = {
  registers: {
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
  },
  fetched_data: 0,
  memory_destination: 0,
  destination_is_memory: false,
  current_opcode: 0,
  current_instruction: { type: "IN_NONE" as const, mode: "AM_IMP" as const },
  halted: false,
  stepping: false,
  int_master_enabled: false,
  enabling_ime: false,
  ie_register: 0,
  int_flags: 0,
};

export function cpu_init(): void {
  ctx.registers.PC = 0x100;
  ctx.registers.SP = 0xfffe;
  ctx.registers.A = 0x01;
  ctx.registers.B = 0x00;
  ctx.registers.C = 0x13;
  ctx.registers.D = 0x00;
  ctx.registers.E = 0xd8;
  ctx.registers.H = 0x01;
  ctx.registers.L = 0x4d;
  ctx.ie_register = 0;
  ctx.int_flags = 0;
  ctx.int_master_enabled = false;
  ctx.enabling_ime = false;
}

export function fetch_instruction(): void {
  ctx.current_opcode = bus_read(ctx.registers.PC++);
  ctx.current_instruction = instruction_by_opcode(ctx.current_opcode);
}

export function execute(): void {
  const proc = instruction_get_processor(ctx.current_instruction.type);

  if (!proc) {
    console.log(formatter("Unknown instruction type %02X\n", ctx.current_opcode));
    NO_IMPL();
  }
  proc(ctx);
}

export function cpu_step(): boolean {
  if (!ctx.halted) {
    const pc = ctx.registers.PC;

    fetch_instruction();
    emulation_cycles(1);
    fetch_data(ctx);
    if (
      ctx.current_instruction === null ||
      ctx.current_instruction === undefined
    ) {
      console.log(formatter("Unknown instruction  %02X\n", ctx.current_opcode));
      process.exit(-7);
    }
    const flags: string = `${ctx.registers.F & (1 << 7) ? "Z" : "-"}${
      ctx.registers.F & (1 << 6) ? "N" : "-"
    }${ctx.registers.F & (1 << 5) ? "H" : "-"}${
      ctx.registers.F & (1 << 4) ? "C" : "-"
    }`;

    console.log(
      formatter(
        "%08lX - %04X: %-7s (%02X %02X %02X) A: %02X F: %s BC: %02X%02X DE: %02X%02X HL: %02X%02X\n",
        emulation_get_context().ticks,
        pc,
        instruction_name(ctx.current_instruction.type),
        ctx.current_opcode,
        bus_read(pc + 1),
        bus_read(pc + 2),
        ctx.registers.A,
        flags,
        ctx.registers.B,
        ctx.registers.C,
        ctx.registers.D,
        ctx.registers.E,
        ctx.registers.H,
        ctx.registers.L
      )
    );

    execute();
  }
  return true;
}

export function cpu_ie_register(): number {
  return ctx.ie_register;
}

export function cpu_set_ie_register(value: number): void {
  ctx.ie_register = value;
}

export function cpu_get_register(): cpu_registers {
  return ctx.registers;
}

export function cpu_get_int_flags(): number {
  return ctx.int_flags;
}

export function cpu_set_int_flags(value: number): void {
  ctx.int_flags = value;
}

export function cpu_get_context(): cpu_context {
  return ctx;
}

export function cpu_request_interrupt(interrupt: number): void {
  ctx.int_flags |= interrupt;
}

const INT_VBLANK = 0x01;
const INT_LCD_STAT = 0x02;
const INT_TIMER = 0x04;
const INT_SERIAL = 0x08;
const INT_JOYPAD = 0x10;

function int_handle(address: number): void {
  ctx.registers.SP--;
  bus_write(ctx.registers.SP, (ctx.registers.PC >> 8) & 0xff);
  ctx.registers.SP--;
  bus_write(ctx.registers.SP, ctx.registers.PC & 0xff);
  ctx.registers.PC = address;
}

function int_check(address: number, it: number): boolean {
  if ((ctx.int_flags & it) && (ctx.ie_register & it)) {
    int_handle(address);
    ctx.int_flags &= ~it;
    ctx.halted = false;
    ctx.int_master_enabled = false;
    return true;
  }
  return false;
}

export function cpu_handle_interrupts(): void {
  if (int_check(0x40, INT_VBLANK)) {
    // VBlank
  } else if (int_check(0x48, INT_LCD_STAT)) {
    // LCD STAT
  } else if (int_check(0x50, INT_TIMER)) {
    // Timer
  } else if (int_check(0x58, INT_SERIAL)) {
    // Serial
  } else if (int_check(0x60, INT_JOYPAD)) {
    // Joypad
  }
}
