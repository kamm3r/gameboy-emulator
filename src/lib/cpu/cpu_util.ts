import { cpu_context, cpu_registers } from "./cpu";
import { bus_read, bus_write } from "../memory/bus";
import { RegType } from "./instructions";

export function cpu_read_register(ctx: cpu_context, reg: RegType): number {
  const r = ctx.registers;

  switch (reg) {
    case "RT_A":  return r.A;
    case "RT_F":  return r.F;
    case "RT_AF": return (r.A << 8) | r.F;
    case "RT_B":  return r.B;
    case "RT_C":  return r.C;
    case "RT_BC": return (r.B << 8) | r.C;
    case "RT_D":  return r.D;
    case "RT_E":  return r.E;
    case "RT_DE": return (r.D << 8) | r.E;
    case "RT_H":  return r.H;
    case "RT_L":  return r.L;
    case "RT_HL": return (r.H << 8) | r.L;
    case "RT_SP": return r.SP;
    case "RT_PC": return r.PC;
    default:      return 0;
  }
}

export function cpu_set_register(ctx: cpu_context, reg: RegType, value: number): void {
  const r = ctx.registers;
  value &= 0xffff;

  switch (reg) {
    case "RT_A":  r.A = value & 0xff; break;
    case "RT_F":  r.F = value & 0xf0; break;
    case "RT_AF": r.A = (value >> 8) & 0xff; r.F = value & 0xf0; break;
    case "RT_B":  r.B = value & 0xff; break;
    case "RT_C":  r.C = value & 0xff; break;
    case "RT_BC": r.B = (value >> 8) & 0xff; r.C = value & 0xff; break;
    case "RT_D":  r.D = value & 0xff; break;
    case "RT_E":  r.E = value & 0xff; break;
    case "RT_DE": r.D = (value >> 8) & 0xff; r.E = value & 0xff; break;
    case "RT_H":  r.H = value & 0xff; break;
    case "RT_L":  r.L = value & 0xff; break;
    case "RT_HL": r.H = (value >> 8) & 0xff; r.L = value & 0xff; break;
    case "RT_SP": r.SP = value & 0xffff; break;
    case "RT_PC": r.PC = value & 0xffff; break;
  }
}

export function cpu_read_register8(ctx: cpu_context, reg: RegType): number {
  if (reg === "RT_HL") {
    return bus_read(cpu_read_register(ctx, "RT_HL"));
  }
  return cpu_read_register(ctx, reg);
}

export function cpu_write_register8(ctx: cpu_context, reg: RegType, value: number): void {
  value &= 0xff;

  if (reg === "RT_HL") {
    bus_write(cpu_read_register(ctx, "RT_HL"), value);
  } else {
    cpu_set_register(ctx, reg, value);
  }
}

export function cpu_set_flags(
  ctx: cpu_context,
  z: number,
  n: number,
  h: number,
  c: number,
): void {
  let f = ctx.registers.F & 0xf0;

  if (z !== -1) f = z ? f | 0x80 : f & 0x7f;
  if (n !== -1) f = n ? f | 0x40 : f & 0xbf;
  if (h !== -1) f = h ? f | 0x20 : f & 0xdf;
  if (c !== -1) f = c ? f | 0x10 : f & 0xef;

  ctx.registers.F = f & 0xf0;
}
