import { bus_read } from "@/lib/bus";
import { formatter } from "@/lib/common";
import { fetch_data } from "@/lib/cpu_fetch";
import { instruction_get_processor } from "@/lib/cpu_proc";
import { cpu_handle_interrupts } from "@/lib/interrupts";
import {
  type instruction,
  instruction_by_opcode,
  instruction_name,
} from "@/lib/instructions";
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
  ctx.registers.PC = 0x0100;
  ctx.registers.SP = 0xfffe;

  // Matches C:
  // AF = 0xB001 -> A=0x01, F=0xB0 on little-endian layout
  // BC = 0x1300 -> B=0x00, C=0x13
  // DE = 0xD800 -> D=0x00, E=0xD8
  // HL = 0x4D01 -> H=0x01, L=0x4D
  ctx.registers.A = 0x01;
  ctx.registers.F = 0xb0;
  ctx.registers.B = 0x00;
  ctx.registers.C = 0x13;
  ctx.registers.D = 0x00;
  ctx.registers.E = 0xd8;
  ctx.registers.H = 0x01;
  ctx.registers.L = 0x4d;

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
  ctx.current_opcode = bus_read(ctx.registers.PC++);
  ctx.current_instruction = instruction_by_opcode(ctx.current_opcode) ?? null;
}

export function execute(): void {
  if (!ctx.current_instruction) {
    console.log(
      `Unknown instruction ${ctx.current_opcode
        .toString(16)
        .padStart(2, "0")} at PC ${(ctx.registers.PC - 1)
        .toString(16)
        .padStart(4, "0")}`,
    );
    return;
  }

  const proc = instruction_get_processor(ctx.current_instruction.type);

  if (!proc) {
    console.log(
      `INVALID INSTRUCTION! ${ctx.current_opcode
        .toString(16)
        .padStart(2, "0")} at PC ${(ctx.registers.PC - 1)
        .toString(16)
        .padStart(4, "0")}`,
    );
    return;
  }

  proc(ctx);
}

export function cpu_step(): boolean {
  if (!ctx.halted) {
    const pc = ctx.registers.PC;

    fetch_instruction();
    emu_cycles(1);

    if (!ctx.current_instruction) {
      console.log(
        formatter("Unknown Instruction! %02X\n", ctx.current_opcode),
      );
      return false;
    }

    fetch_data(ctx);

    if (CPU_DEBUG) {
      const flags = `${ctx.registers.F & (1 << 7) ? "Z" : "-"}${
        ctx.registers.F & (1 << 6) ? "N" : "-"
      }${ctx.registers.F & (1 << 5) ? "H" : "-"}${
        ctx.registers.F & (1 << 4) ? "C" : "-"
      }`;

      console.log(
        formatter(
          "%08lX - %04X: %-12s (%02X %02X %02X) A: %02X F: %s BC: %02X%02X DE: %02X%02X HL: %02X%02X\n",
          emu_get_context().ticks,
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
          ctx.registers.L,
        ),
      );
    }

    dbg_update();
    dbg_print();

    execute();
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
  return ctx.ie_register;
}

export function cpu_set_ie_register(value: number): void {
  ctx.ie_register = value & 0xff;
}

export function cpu_get_registers(): cpu_registers {
  return ctx.registers;
}

export function cpu_get_int_flags(): number {
  return ctx.int_flags;
}

export function cpu_set_int_flags(value: number): void {
  ctx.int_flags = value & 0xff;
}

export function cpu_get_context(): cpu_context {
  return ctx;
}

export function cpu_request_interrupt(interrupt: number): void {
  ctx.int_flags |= interrupt;
}

export {
  INT_VBLANK,
  INT_LCD_STAT,
  INT_TIMER,
  INT_SERIAL,
  INT_JOYPAD,
  cpu_handle_interrupts,
} from "@/lib/interrupts";