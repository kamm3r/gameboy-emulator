import { bus_read } from "@/lib/memory/bus";
import { type cpu_context, type cpu_registers } from "@/lib/cpu/cpu";
import { type RegType } from "@/lib/cpu/instructions";

type reg8 = "A" | "F" | "B" | "C" | "D" | "E" | "H" | "L";

const REG8: Partial<Record<RegType, reg8>> = {
  RT_A: "A", RT_F: "F", RT_B: "B", RT_C: "C",
  RT_D: "D", RT_E: "E", RT_H: "H", RT_L: "L",
};

const REG16: Partial<Record<RegType, [reg8, reg8]>> = {
  RT_AF: ["A", "F"], RT_BC: ["B", "C"], RT_DE: ["D", "E"], RT_HL: ["H", "L"],
};

// F keeps only the upper 4 flag bits
function mask_of(r: keyof cpu_registers): number {
  return r === "F" ? 0xf0 : r === "PC" || r === "SP" ? 0xffff : 0xff;
}

export function cpu_read_register(ctx: cpu_context, reg: RegType): number {
  const r = ctx.registers;
  const single = REG8[reg];
  if (single) return r[single] & mask_of(single);

  const pair = REG16[reg];
  if (pair) return ((r[pair[0]] & 0xff) << 8) | (r[pair[1]] & mask_of(pair[1]));

  if (reg === "RT_PC") return r.PC & 0xffff;
  if (reg === "RT_SP") return r.SP & 0xffff;
  return 0;
}

export function cpu_set_register(
  ctx: cpu_context,
  reg: RegType,
  value: number,
): void {
  const r = ctx.registers;
  const single = REG8[reg];
  if (single) {
    r[single] = value & mask_of(single);
    return;
  }

  const pair = REG16[reg];
  if (pair) {
    r[pair[0]] = (value >> 8) & 0xff;
    r[pair[1]] = value & mask_of(pair[1]);
    return;
  }

  if (reg === "RT_PC") r.PC = value & 0xffff;
  else if (reg === "RT_SP") r.SP = value & 0xffff;
}

// 8-bit operand read; RT_HL means the byte at (HL)
export function cpu_read_register8(ctx: cpu_context, reg: RegType): number {
  if (reg === "RT_HL") {
    return bus_read(cpu_read_register(ctx, "RT_HL")) & 0xff;
  }

  const single = REG8[reg];
  if (!single) throw new Error(`ERR INVALID REG8: ${String(reg)}`);
  return ctx.registers[single] & mask_of(single);
}
