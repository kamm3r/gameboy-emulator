// const Flags = {
//   ZERO: 0b10000000,
//   ADD_SUBTRACT: 0b0100_0000,
//   HALF_CARRY: 0b00100000,
//   CARRY: 0b00010000,
// } as const;

import { bus_read } from "@/lib/bus";
import { reverse } from "@/lib/common";
import { emulation_cycles } from "@/lib/emulation";
import {
  addr_mode,
  instruction,
  instruction_by_opcode,
  reg_type,
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

type cpu_context = {
  registers: cpu_registers;

  fetched_data: number;
  memory_destination: number;
  destination_is_memory: boolean;
  current_opcode: number;
  current_instruction: instruction | undefined;

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
  current_instruction: undefined,
  halted: false,
  stepping: false,
  int_master_enabled: false,
};

function cpu_read_register(reg: keyof typeof reg_type): number {
  switch (reg) {
    case reg_type.RT_A:
      return ctx.registers.A;
    case reg_type.RT_F:
      return ctx.registers.F;
    case reg_type.RT_B:
      return ctx.registers.B;
    case reg_type.RT_C:
      return ctx.registers.C;
    case reg_type.RT_D:
      return ctx.registers.D;
    case reg_type.RT_E:
      return ctx.registers.E;
    case reg_type.RT_H:
      return ctx.registers.H;
    case reg_type.RT_L:
      return ctx.registers.L;
    case reg_type.RT_AF:
      return reverse((ctx.registers.A << 8) | ctx.registers.F);
    case reg_type.RT_BC:
      return reverse((ctx.registers.B << 8) | ctx.registers.C);
    case reg_type.RT_DE:
      return reverse((ctx.registers.D << 8) | ctx.registers.E);
    case reg_type.RT_HL:
      return reverse((ctx.registers.H << 8) | ctx.registers.L);
    case reg_type.RT_SP:
      return ctx.registers.SP;
    case reg_type.RT_PC:
      return ctx.registers.PC;
    default:
      return 0;
  }
}

export function fetch_instruction(): void {
  ctx.current_opcode = bus_read(ctx.registers.PC++);
  ctx.current_instruction = instruction_by_opcode(ctx.current_opcode);

  if (ctx.current_instruction === null) {
    console.log(`Unknown instruction  \n ${ctx.current_opcode}`);
    process.exit(-7);
  }
}
export function fetch_data(): void {
  ctx.memory_destination = 0;
  ctx.destination_is_memory = false;
  switch (ctx.current_instruction?.mode) {
    case addr_mode.AM_IMP:
      return;
    case addr_mode.AM_R:
      ctx.fetched_data = cpu_read_register(ctx.current_instruction!.reg_1!);
      return;
    case addr_mode.AM_R_D8:
      ctx.fetched_data = bus_read(ctx.registers.PC++);
      emulation_cycles(4);
      ctx.registers.PC++;
      return;
    case addr_mode.AM_D16:
      const low = bus_read(ctx.registers.PC);
      emulation_cycles(1);

      const high = bus_read(ctx.registers.PC + 1);
      emulation_cycles(1);

      ctx.fetched_data = low | (high << 8);
      ctx.registers.PC += 2;
      return;
    default:
      console.log(`Unknown addressing mode\n ${ctx.current_instruction?.mode}`);
      process.exit(-7);
      return;
  }
}
export function execute(): void {
  console.log(
    `Executing instruction \n ${ctx.current_opcode} PC: \n ${ctx.registers.PC}`
  );
  console.log("NOt executing yet...\n");
}

export function cpu_init(): void {}
export function cpu_step(): boolean {
  if (!ctx.halted) {
    fetch_instruction();
    fetch_data();
    execute();
  }
  return true;
}

// export class cpu {
//   REG = new Uint8Array(8);
//   PC = 0x0000;
//   SP = 0x0000;

//   A = 0x00;
//   F = 0x00;
//   B = 0x00;
//   C = 0x00;
//   D = 0x00;
//   E = 0x00;
//   H = 0x00;
//   L = 0x00;

//   constructor() {}
// }
