import { BIT_SET } from "@/lib/common";
import { in_type, type InType } from "@/lib/instructions";
import { type cpu_context } from "@/lib/cpu";
import { emulation_cycles } from "@/lib/emulation";
import { bus_write } from "@/lib/bus";
import { cpu_read_register, cpu_set_register } from "@/lib/cpu_util";

function cpu_set_flags(
  ctx: cpu_context,
  z: number,
  n: number,
  h: number,
  c: number
): void {
  if (z != -1) {
    BIT_SET(ctx.registers.F, 7, z);
  }
  if (n != -1) {
    BIT_SET(ctx.registers.F, 6, n);
  }
  if (h != -1) {
    BIT_SET(ctx.registers.F, 5, h);
  }
  if (c != -1) {
    BIT_SET(ctx.registers.F, 4, c);
  }
}
function proc_none(ctx: cpu_context): void {
  console.log("INVALID INSTRUCTION!\n");
  process.exit(-7);
}

function proc_nop(ctx: cpu_context): void {}
function proc_di(ctx: cpu_context): void {
  ctx.int_master_enabled = false;
}
function proc_ld(ctx: cpu_context): void {
  if (ctx.destination_is_memory) {
    // LD (BC), A for instance

    if (ctx.current_instruction.reg_2 >= "RT_AF") {
      emulation_cycles(1);
      bus_write(ctx.memory_destination, ctx.fetched_data);
    } else {
      bus_write(ctx.memory_destination, ctx.fetched_data);
    }
    return;
  }
  if (ctx.current_instruction.mode === "AM_HL_SPR") {
    const hflag =
      (cpu_read_register(ctx, ctx.current_instruction.reg_2) & 0xf) +
        (ctx.fetched_data & 0xf) >=
      0x10;
    const cflag =
      (cpu_read_register(ctx, ctx.current_instruction.reg_2) & 0xff) +
        (ctx.fetched_data & 0xff) >=
      0x100;

    cpu_set_flags(ctx, 0, 0, hflag, cflag);
    cpu_set_flags(
      ctx,
      ctx.current_instruction.reg_1,
      cpu_read_register(ctx, ctx.current_instruction.reg_2) + ctx.fetched_data
    );
    return;
  }
  cpu_set_register(ctx, ctx.current_instruction.reg_1, ctx.fetched_data);
}

function proc_xor(ctx: cpu_context): void {
  ctx.registers.A ^= ctx.fetched_data & 0xff;
  cpu_set_flags(ctx, ctx.registers.A == 0 ? 1 : 0, 0, 0, 0);
}

function check_cond(ctx: cpu_context): boolean {
  const z = (ctx.registers.F >> 7) & 1;
  const c = (ctx.registers.F >> 4) & 1;

  switch (ctx.current_instruction.cond) {
    case "CT_NONE":
      return true;
    case "CT_C":
      return c === 1;
    case "CT_NC":
      return c === 0;
    case "CT_Z":
      return z === 1;
    case "CT_NZ":
      return z === 0;
  }
  return false;
}

function proc_jp(ctx: cpu_context): void {
  if (check_cond(ctx)) {
    ctx.registers.PC = ctx.fetched_data;
    emulation_cycles(1);
  }
}

const processors: Record<InType, (ctx: cpu_context) => void> = {
  [in_type.IN_NONE]: proc_none,
  [in_type.IN_NOP]: proc_nop,
  [in_type.IN_LD]: proc_ld,
  [in_type.IN_JP]: proc_jp,
  [in_type.IN_DI]: proc_di,
  [in_type.IN_XOR]: proc_xor,
};

function instruction_get_processor(type: InType) {
  console.log(`Getting processor for ${type}`);
  return processors[type];
}

export {
  proc_none,
  proc_nop,
  proc_ld,
  proc_di,
  proc_jp,
  proc_xor,
  instruction_get_processor,
};
