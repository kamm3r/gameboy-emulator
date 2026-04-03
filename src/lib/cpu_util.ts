import { type cpu_context } from "@/lib/cpu";
import { type RegType } from "@/lib/instructions";

export function reverse(value: number): number {
  return ((value & 0xff00) >> 8) | ((value & 0xff) << 8);
}

export function cpu_read_register(ctx: cpu_context, reg: RegType): number {
  switch (reg) {
    case "RT_A":
      return ctx.registers.A;
    case "RT_F":
      return ctx.registers.F;
    case "RT_B":
      return ctx.registers.B;
    case "RT_C":
      return ctx.registers.C;
    case "RT_D":
      return ctx.registers.D;
    case "RT_E":
      return ctx.registers.E;
    case "RT_H":
      return ctx.registers.H;
    case "RT_L":
      return ctx.registers.L;
    case "RT_AF":
      return (ctx.registers.A << 8) | ctx.registers.F;
    case "RT_BC":
      return (ctx.registers.B << 8) | ctx.registers.C;
    case "RT_DE":
      return (ctx.registers.D << 8) | ctx.registers.E;
    case "RT_HL":
      return (ctx.registers.H << 8) | ctx.registers.L;
    case "RT_PC":
      return ctx.registers.PC;
    case "RT_SP":
      return ctx.registers.SP;
    default:
      return 0;
  }
}

export function cpu_set_register(
  ctx: cpu_context,
  reg: RegType,
  value: number
): void {
  switch (reg) {
    case "RT_A":
      ctx.registers.A = value & 0xff;
      break;
    case "RT_F":
      ctx.registers.F = value & 0xff;
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
      ctx.registers.PC = value;
      break;
    case "RT_SP":
      ctx.registers.SP = value;
      break;
    case "RT_NONE":
      break;
  }
}
