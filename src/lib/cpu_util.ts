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
      return reverse((ctx.registers.A << 8) | ctx.registers.F);
    case "RT_BC":
      return reverse((ctx.registers.B << 8) | ctx.registers.C);
    case "RT_DE":
      return reverse((ctx.registers.D << 8) | ctx.registers.E);
    case "RT_HL":
      return reverse((ctx.registers.H << 8) | ctx.registers.L);
    case "RT_PC":
      return ctx.registers.SP;
    case "RT_SP":
      return ctx.registers.PC;
    default:
      return 0;
  }
}
