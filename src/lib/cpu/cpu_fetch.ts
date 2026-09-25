import { bus_read } from "@/lib/memory/bus";
import { formatter } from "@/lib/common";
import { type cpu_context } from "@/lib/cpu/cpu";
import { cpu_read_register, cpu_set_register } from "@/lib/cpu/cpu_util";
import { emu_cycles } from "@/lib/emu";

// Immediate operand fetches: read at PC, then advance the clock
function read_pc8(ctx: cpu_context): number {
  const value = bus_read(ctx.registers.PC) & 0xff;
  emu_cycles(1);
  ctx.registers.PC = (ctx.registers.PC + 1) & 0xffff;
  return value;
}

function read_pc16(ctx: cpu_context): number {
  const lo = read_pc8(ctx);
  return lo | (read_pc8(ctx) << 8);
}

// Memory operand reads: advance the clock, then read
function read_mem(address: number): number {
  emu_cycles(1);
  return bus_read(address) & 0xff;
}

function set_memory_destination(ctx: cpu_context, address: number): void {
  ctx.memory_destination = address & 0xffff;
  ctx.destination_is_memory = true;
}

function step_hl(ctx: cpu_context, delta: number): void {
  const hl = cpu_read_register(ctx, "RT_HL");
  cpu_set_register(ctx, "RT_HL", (hl + delta) & 0xffff);
}

function reg_1(ctx: cpu_context): number {
  return cpu_read_register(ctx, ctx.current_instruction!.reg_1!);
}

function reg_2(ctx: cpu_context): number {
  return cpu_read_register(ctx, ctx.current_instruction!.reg_2!);
}

export function fetch_data(ctx: cpu_context): void {
  ctx.fetched_data = 0;
  ctx.memory_destination = 0;
  ctx.destination_is_memory = false;

  const inst = ctx.current_instruction;

  if (!inst) {
    return;
  }

  switch (inst.mode) {
    case "AM_IMP":
      return;

    case "AM_R":
      ctx.fetched_data = reg_1(ctx);
      return;

    case "AM_R_R":
      ctx.fetched_data = reg_2(ctx);
      return;

    case "AM_R_D8":
    case "AM_R_A8":
    case "AM_HL_SPR":
    case "AM_D8":
      ctx.fetched_data = read_pc8(ctx);
      return;

    case "AM_R_D16":
    case "AM_D16":
      ctx.fetched_data = read_pc16(ctx);
      return;

    case "AM_MR_R":
      ctx.fetched_data = reg_2(ctx);
      // LD (C),A writes to 0xff00 + C
      set_memory_destination(
        ctx,
        inst.reg_1 === "RT_C" ? reg_1(ctx) | 0xff00 : reg_1(ctx),
      );
      return;

    case "AM_R_MR":
      // LD A,(C) reads from 0xff00 + C
      ctx.fetched_data = read_mem(
        inst.reg_2 === "RT_C" ? reg_2(ctx) | 0xff00 : reg_2(ctx),
      );
      return;

    case "AM_R_HLI":
    case "AM_R_HLD":
      ctx.fetched_data = read_mem(reg_2(ctx));
      step_hl(ctx, inst.mode === "AM_R_HLI" ? 1 : -1);
      return;

    case "AM_HLI_R":
    case "AM_HLD_R":
      ctx.fetched_data = reg_2(ctx);
      set_memory_destination(ctx, reg_1(ctx));
      step_hl(ctx, inst.mode === "AM_HLI_R" ? 1 : -1);
      return;

    case "AM_MR":
      set_memory_destination(ctx, reg_1(ctx));
      ctx.fetched_data = read_mem(ctx.memory_destination);
      return;

    case "AM_MR_D8":
      ctx.fetched_data = read_pc8(ctx);
      set_memory_destination(ctx, reg_1(ctx));
      return;

    case "AM_A8_R":
      set_memory_destination(ctx, read_pc8(ctx) | 0xff00);
      return;

    case "AM_A16_R":
    case "AM_D16_R":
      set_memory_destination(ctx, read_pc16(ctx));
      ctx.fetched_data = reg_2(ctx);
      return;

    case "AM_R_A16":
      ctx.fetched_data = read_mem(read_pc16(ctx));
      return;

    default:
      throw new Error(
        formatter(
          "Unknown Addressing Mode! %s (%02X)",
          String(inst.mode),
          ctx.current_opcode,
        ),
      );
  }
}
