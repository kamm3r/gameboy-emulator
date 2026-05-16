import { bus_read, bus_write } from "@/lib/memory/bus";
import { type cpu_context } from "@/lib/cpu/cpu";
import { type RegType } from "@/lib/cpu/instructions";

export function reverse(value: number): number {
  value &= 0xffff;
  return ((value & 0xff) << 8) | (value >>> 8);
}

export function cpu_read_register(ctx: cpu_context, reg: RegType): number {
  const r = ctx.registers;

  switch (reg) {
    case "RT_A":
      return r.A & 0xff;
    case "RT_F":
      return r.F & 0xf0;
    case "RT_B":
      return r.B & 0xff;
    case "RT_C":
      return r.C & 0xff;
    case "RT_D":
      return r.D & 0xff;
    case "RT_E":
      return r.E & 0xff;
    case "RT_H":
      return r.H & 0xff;
    case "RT_L":
      return r.L & 0xff;

    case "RT_AF":
      return ((r.A & 0xff) << 8) | (r.F & 0xf0);
    case "RT_BC":
      return ((r.B & 0xff) << 8) | (r.C & 0xff);
    case "RT_DE":
      return ((r.D & 0xff) << 8) | (r.E & 0xff);
    case "RT_HL":
      return ((r.H & 0xff) << 8) | (r.L & 0xff);

    case "RT_PC":
      return r.PC & 0xffff;
    case "RT_SP":
      return r.SP & 0xffff;

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
  const r = ctx.registers;
  value &= 0xffff;

  switch (reg) {
    case "RT_A":
      r.A = value & 0xff;
      return;
    case "RT_F":
      r.F = value & 0xf0;
      return;
    case "RT_B":
      r.B = value & 0xff;
      return;
    case "RT_C":
      r.C = value & 0xff;
      return;
    case "RT_D":
      r.D = value & 0xff;
      return;
    case "RT_E":
      r.E = value & 0xff;
      return;
    case "RT_H":
      r.H = value & 0xff;
      return;
    case "RT_L":
      r.L = value & 0xff;
      return;

    case "RT_AF":
      r.A = value >>> 8;
      r.F = value & 0xf0;
      return;
    case "RT_BC":
      r.B = value >>> 8;
      r.C = value & 0xff;
      return;
    case "RT_DE":
      r.D = value >>> 8;
      r.E = value & 0xff;
      return;
    case "RT_HL":
      r.H = value >>> 8;
      r.L = value & 0xff;
      return;

    case "RT_PC":
      r.PC = value;
      return;
    case "RT_SP":
      r.SP = value;
      return;

    case "RT_NONE":
      return;
  }
}

export function cpu_read_register8(ctx: cpu_context, reg: RegType): number {
  const r = ctx.registers;

  switch (reg) {
    case "RT_A":
      return r.A & 0xff;
    case "RT_F":
      return r.F & 0xf0;
    case "RT_B":
      return r.B & 0xff;
    case "RT_C":
      return r.C & 0xff;
    case "RT_D":
      return r.D & 0xff;
    case "RT_E":
      return r.E & 0xff;
    case "RT_H":
      return r.H & 0xff;
    case "RT_L":
      return r.L & 0xff;
    case "RT_HL":
      return bus_read(((r.H & 0xff) << 8) | (r.L & 0xff)) & 0xff;
    default:
      throw new Error(`ERR INVALID REG8: ${String(reg)}`);
  }
}

export function cpu_set_register8(
  ctx: cpu_context,
  reg: RegType,
  value: number,
): void {
  const r = ctx.registers;
  value &= 0xff;

  switch (reg) {
    case "RT_A":
      r.A = value;
      return;
    case "RT_F":
      r.F = value & 0xf0;
      return;
    case "RT_B":
      r.B = value;
      return;
    case "RT_C":
      r.C = value;
      return;
    case "RT_D":
      r.D = value;
      return;
    case "RT_E":
      r.E = value;
      return;
    case "RT_H":
      r.H = value;
      return;
    case "RT_L":
      r.L = value;
      return;
    case "RT_HL":
      bus_write(((r.H & 0xff) << 8) | (r.L & 0xff), value);
      return;
    default:
      throw new Error(`ERR INVALID REG8: ${String(reg)}`);
  }
}