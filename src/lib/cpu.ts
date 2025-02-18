// const Flags = {
//   ZERO: 0b10000000,
//   ADD_SUBTRACT: 0b0100_0000,
//   HALF_CARRY: 0b00100000,
//   CARRY: 0b00010000,
// } as const;

import { bus_read } from "@/lib/bus";
import { formatter, NO_IMPL } from "@/lib/common";
import { fetch_data } from "@/lib/cpu_fetch";
import { instruction_get_processor } from "@/lib/cpu_proc";
import { cpu_read_register } from "@/lib/cpu_util";
import { emulation_cycles } from "@/lib/emulation";
import {
  addr_mode,
  instruction,
  instruction_by_opcode,
  instruction_name,
} from "@/lib/instructions";

type cpu_registers = {
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
};

const ctx: cpu_context = {
  registers: {
    A: 0x00,
    F: 0x00,
    B: 0x00,
    C: 0x00,
    D: 0x00,
    E: 0x00,
    H: 0x00,
    L: 0x00,
    PC: 0x0000,
    SP: 0x0000,
  },
  fetched_data: 0,
  memory_destination: 0,
  destination_is_memory: false,
  current_opcode: 0,
  current_instruction: {},
  halted: false,
  stepping: false,
  int_master_enabled: false,
};

export function cpu_init(): void {
  ctx.registers.PC = 0x100;
  ctx.registers.A = 0x01;
}

export function fetch_instruction(): void {
  ctx.current_opcode = bus_read(ctx.registers.PC++);
  ctx.current_instruction = instruction_by_opcode(ctx.current_opcode);
}

export function execute(): void {
  const proc = instruction_get_processor(ctx.current_instruction.type);

  if (!proc) {
    NO_IMPL();
  }
  proc(ctx);
}

export function cpu_step(): boolean {
  if (!ctx.halted) {
    const pc = ctx.registers.PC;

    fetch_instruction();
    fetch_data(ctx);
    if (
      ctx.current_instruction === null ||
      ctx.current_instruction === undefined
    ) {
      console.log(formatter("Unknown instruction  %02X\n", ctx.current_opcode));
      process.exit(-7);
    }

    console.log(
      formatter(
        "%04X: %-7s (%02X %02X %02X) A: %02X B: %02X C: %02X",
        pc,
        instruction_name(ctx.current_instruction.type),
        ctx.current_opcode,
        bus_read(pc + 1),
        bus_read(pc + 2),
        ctx.registers.A,
        ctx.registers.B,
        ctx.registers.C
      )
    );

    execute();
  }
  return true;
}
