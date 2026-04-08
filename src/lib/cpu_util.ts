import { bus_read, bus_write } from "@/lib/bus";
import { type cpu_context } from "@/lib/cpu";
import { type RegType } from "@/lib/instructions";

export function reverse(value: number): number {
  value &= 0xffff;
  return ((value & 0xff00) >> 8) | ((value & 0x00ff) << 8);
}

export function cpu_read_register(ctx: cpu_context, reg: RegType): number {
  switch (reg) {
    case "RT_A":
      return ctx.registers.A & 0xff;
    case "RT_F":
      return ctx.registers.F & 0xf0;
    case "RT_B":
      return ctx.registers.B & 0xff;
    case "RT_C":
      return ctx.registers.C & 0xff;
    case "RT_D":
      return ctx.registers.D & 0xff;
    case "RT_E":
      return ctx.registers.E & 0xff;
    case "RT_H":
      return ctx.registers.H & 0xff;
    case "RT_L":
      return ctx.registers.L & 0xff;

    case "RT_AF":
      return (((ctx.registers.A & 0xff) << 8) | (ctx.registers.F & 0xf0)) & 0xffff;
    case "RT_BC":
      return (((ctx.registers.B & 0xff) << 8) | (ctx.registers.C & 0xff)) & 0xffff;
    case "RT_DE":
      return (((ctx.registers.D & 0xff) << 8) | (ctx.registers.E & 0xff)) & 0xffff;
    case "RT_HL":
      return (((ctx.registers.H & 0xff) << 8) | (ctx.registers.L & 0xff)) & 0xffff;

    case "RT_PC":
      return ctx.registers.PC & 0xffff;
    case "RT_SP":
      return ctx.registers.SP & 0xffff;

    case "RT_NONE":
    default:
      return 0;
  }
}

export function cpu_set_register(
  ctx: cpu_context,
  reg: RegType,
  value: number,
): void {
  value &= 0xffff;

  switch (reg) {
    case "RT_A":
      ctx.registers.A = value & 0xff;
      break;
    case "RT_F":
      ctx.registers.F = value & 0xf0;
      break;
    case "RT_B":
      ctx.registers.B = value & 0xff;
      break;
    case "RT_C":
      ctx.registers.C = value & 0xff;
      break;
    case "RT_D":
      ctx.registers.D = value & 0xff;
      break;
    case "RT_E":
      ctx.registers.E = value & 0xff;
      break;
    case "RT_H":
      ctx.registers.H = value & 0xff;
      break;
    case "RT_L":
      ctx.registers.L = value & 0xff;
      break;

    case "RT_AF":
      ctx.registers.A = (value >> 8) & 0xff;
      ctx.registers.F = value & 0xf0;
      break;
    case "RT_BC":
      ctx.registers.B = (value >> 8) & 0xff;
      ctx.registers.C = value & 0xff;
      break;
    case "RT_DE":
      ctx.registers.D = (value >> 8) & 0xff;
      ctx.registers.E = value & 0xff;
      break;
    case "RT_HL":
      ctx.registers.H = (value >> 8) & 0xff;
      ctx.registers.L = value & 0xff;
      break;

    case "RT_PC":
      ctx.registers.PC = value & 0xffff;
      break;
    case "RT_SP":
      ctx.registers.SP = value & 0xffff;
      break;

    case "RT_NONE":
      break;
  }
}

export function cpu_read_register8(ctx: cpu_context, reg: RegType): number {
  switch (reg) {
    case "RT_A":
      return ctx.registers.A & 0xff;
    case "RT_F":
      return ctx.registers.F & 0xf0;
    case "RT_B":
      return ctx.registers.B & 0xff;
    case "RT_C":
      return ctx.registers.C & 0xff;
    case "RT_D":
      return ctx.registers.D & 0xff;
    case "RT_E":
      return ctx.registers.E & 0xff;
    case "RT_H":
      return ctx.registers.H & 0xff;
    case "RT_L":
      return ctx.registers.L & 0xff;

    case "RT_HL":
      return bus_read(cpu_read_register(ctx, "RT_HL")) & 0xff;

    default:
      throw new Error(`ERR INVALID REG8: ${String(reg)}`);
  }
}

export function cpu_set_register8(
  ctx: cpu_context,
  reg: RegType,
  value: number,
): void {
  value &= 0xff;

  switch (reg) {
    case "RT_A":
      ctx.registers.A = value;
      break;
    case "RT_F":
      ctx.registers.F = value & 0xf0;
      break;
    case "RT_B":
      ctx.registers.B = value;
      break;
    case "RT_C":
      ctx.registers.C = value;
      break;
    case "RT_D":
      ctx.registers.D = value;
      break;
    case "RT_E":
      ctx.registers.E = value;
      break;
    case "RT_H":
      ctx.registers.H = value;
      break;
    case "RT_L":
      ctx.registers.L = value;
      break;

    case "RT_HL":
      bus_write(cpu_read_register(ctx, "RT_HL"), value);
      break;

    default:
      throw new Error(`ERR INVALID REG8: ${String(reg)}`);
  }
}