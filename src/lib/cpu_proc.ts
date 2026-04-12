import { in_type, RegType, type InType } from "@/lib/instructions";
import { type cpu_context } from "@/lib/cpu";
import { bus_read, bus_write, bus_write16 } from "@/lib/bus";
import { cpu_read_register, cpu_read_register8, cpu_set_register, cpu_set_register8 } from "@/lib/cpu_util";
import { stack_pop, stack_push, stack_push16 } from "@/lib/stack";
import { emu_cycles } from "@/lib/emu";

export function cpu_set_flags(
  ctx: cpu_context,
  z: number,
  n: number,
  h: number,
  c: number,
): void {
  if (z !== -1) {
    ctx.registers.F = z ? ctx.registers.F | 0x80 : ctx.registers.F & ~0x80;
  }

  if (n !== -1) {
    ctx.registers.F = n ? ctx.registers.F | 0x40 : ctx.registers.F & ~0x40;
  }

  if (h !== -1) {
    ctx.registers.F = h ? ctx.registers.F | 0x20 : ctx.registers.F & ~0x20;
  }

  if (c !== -1) {
    ctx.registers.F = c ? ctx.registers.F | 0x10 : ctx.registers.F & ~0x10;
  }

  ctx.registers.F &= 0xf0;
}

export function proc_none(): void {
    console.log("INVALID INSTRUCTION!\n");
    throw new Error("unknown or unimplemented instruction");
}

export function proc_nop(): void {}

const rt_lookup: RegType[] = [
  "RT_B",
  "RT_C",
  "RT_D",
  "RT_E",
  "RT_H",
  "RT_L",
  "RT_HL",
  "RT_A",
];

export function decode_reg(reg: number): RegType {
  if (reg > 0b111) {
    return "RT_NONE";
  }

  return rt_lookup[reg];
}

function write_cb_result(ctx: cpu_context, reg: RegType, value: number): void {
  value &= 0xff;

  if (reg === "RT_HL") {
    bus_write(cpu_read_register(ctx, "RT_HL"), value);
  } else {
    cpu_set_register(ctx, reg, value);
  }
}

export function proc_cb(ctx: cpu_context): void {
  const op = ctx.fetched_data & 0xff;
  const reg = decode_reg(op & 0b111);
  const bit = (op >> 3) & 0b111;
  const bit_op = (op >> 6) & 0b11;
  let regVal = cpu_read_register8(ctx, reg);

  emu_cycles(1);

  if (reg === "RT_HL") {
    emu_cycles(2);
  }

  switch (bit_op) {
    case 1:
      cpu_set_flags(ctx, (regVal & (1 << bit)) === 0 ? 1 : 0, 0, 1, -1);
      return;

    case 2:
      regVal &= ~(1 << bit);
      cpu_set_register8(ctx, reg, regVal);
      return;

    case 3:
      regVal |= 1 << bit;
      cpu_set_register8(ctx, reg, regVal);
      return;
  }

  const flagC = (ctx.registers.F & 0x10) !== 0 ? 1 : 0;

  switch (bit) {
    case 0: {
      let result = (regVal << 1) & 0xff;
      const setC = (regVal & 0x80) !== 0;

      if (setC) {
        result |= 1;
      }

      cpu_set_register8(ctx, reg, result);
      cpu_set_flags(ctx, result === 0 ? 1 : 0, 0, 0, setC ? 1 : 0);
      return;
    }

    case 1: {
      const old = regVal;
      regVal = ((regVal >> 1) | (old << 7)) & 0xff;
      cpu_set_register8(ctx, reg, regVal);
      cpu_set_flags(ctx, regVal === 0 ? 1 : 0, 0, 0, old & 1 ? 1 : 0);
      return;
    }

    case 2: {
      const old = regVal;
      regVal = ((regVal << 1) | flagC) & 0xff;
      cpu_set_register8(ctx, reg, regVal);
      cpu_set_flags(ctx, regVal === 0 ? 1 : 0, 0, 0, old & 0x80 ? 1 : 0);
      return;
    }

    case 3: {
      const old = regVal;
      regVal = ((regVal >> 1) | (flagC << 7)) & 0xff;
      cpu_set_register8(ctx, reg, regVal);
      cpu_set_flags(ctx, regVal === 0 ? 1 : 0, 0, 0, old & 1 ? 1 : 0);
      return;
    }

    case 4: {
      const old = regVal;
      regVal = (regVal << 1) & 0xff;
      cpu_set_register8(ctx, reg, regVal);
      cpu_set_flags(ctx, regVal === 0 ? 1 : 0, 0, 0, old & 0x80 ? 1 : 0);
      return;
    }

    case 5: {
      const result = ((regVal >> 1) | (regVal & 0x80)) & 0xff;
      cpu_set_register8(ctx, reg, result);
      cpu_set_flags(ctx, result === 0 ? 1 : 0, 0, 0, regVal & 1 ? 1 : 0);
      return;
    }

    case 6: {
      regVal = ((regVal & 0xf0) >> 4) | ((regVal & 0x0f) << 4);
      cpu_set_register8(ctx, reg, regVal);
      cpu_set_flags(ctx, regVal === 0 ? 1 : 0, 0, 0, 0);
      return;
    }

    case 7: {
      const result = (regVal >> 1) & 0xff;
      cpu_set_register8(ctx, reg, result);
      cpu_set_flags(ctx, result === 0 ? 1 : 0, 0, 0, regVal & 1 ? 1 : 0);
      return;
    }
  }

  throw new Error(`ERROR: INVALID CB: ${op.toString(16).padStart(2, "0")}`);
}

export function proc_rlca(ctx: cpu_context): void {
  const u = ctx.registers.A & 0xff;
  const c = (u >> 7) & 1;
  ctx.registers.A = ((u << 1) | c) & 0xff;
  cpu_set_flags(ctx, 0, 0, 0, c);
}

export function proc_rrca(ctx: cpu_context): void {
  const b = ctx.registers.A & 1;
  ctx.registers.A = ((ctx.registers.A >> 1) | (b << 7)) & 0xff;
  cpu_set_flags(ctx, 0, 0, 0, b);
}

export function proc_rla(ctx: cpu_context): void {
  const u = ctx.registers.A & 0xff;
  const cf = (ctx.registers.F & 0x10) !== 0 ? 1 : 0;
  const c = (u >> 7) & 1;

  ctx.registers.A = ((u << 1) | cf) & 0xff;
  cpu_set_flags(ctx, 0, 0, 0, c);
}

export function proc_stop(): void {
  console.log("STOPPING!");
}

export function proc_daa(ctx: cpu_context): void {
  let u = 0;
  let fc = 0;

  const flagH = (ctx.registers.F & 0x20) !== 0;
  const flagN = (ctx.registers.F & 0x40) !== 0;
  const flagC = (ctx.registers.F & 0x10) !== 0;

  if (flagH || (!flagN && (ctx.registers.A & 0x0f) > 9)) {
    u = 6;
  }

  if (flagC || (!flagN && ctx.registers.A > 0x99)) {
    u |= 0x60;
    fc = 1;
  }

  ctx.registers.A = (ctx.registers.A + (flagN ? -u : u)) & 0xff;
  cpu_set_flags(ctx, ctx.registers.A === 0 ? 1 : 0, -1, 0, fc);
}

export function proc_cpl(ctx: cpu_context): void {
  ctx.registers.A = (~ctx.registers.A) & 0xff;
  cpu_set_flags(ctx, -1, 1, 1, -1);
}

export function proc_scf(ctx: cpu_context): void {
  cpu_set_flags(ctx, -1, 0, 0, 1);
}

export function proc_ccf(ctx: cpu_context): void {
  const oldC = (ctx.registers.F & 0x10) !== 0 ? 1 : 0;
  cpu_set_flags(ctx, -1, 0, 0, oldC ^ 1);
}

export function proc_halt(ctx: cpu_context): void {
  ctx.halted = true;
}

export function proc_rra(ctx: cpu_context): void {
  const carry = (ctx.registers.F & 0x10) !== 0 ? 1 : 0;
  const newC = ctx.registers.A & 1;

  ctx.registers.A = ((ctx.registers.A >> 1) | (carry << 7)) & 0xff;
  cpu_set_flags(ctx, 0, 0, 0, newC);
}

export function proc_and(ctx: cpu_context): void {
  ctx.registers.A = (ctx.registers.A & (ctx.fetched_data & 0xff)) & 0xff;
  cpu_set_flags(ctx, ctx.registers.A === 0 ? 1 : 0, 0, 1, 0);
}

export function proc_xor(ctx: cpu_context): void {
  ctx.registers.A = (ctx.registers.A ^ (ctx.fetched_data & 0xff)) & 0xff;
  cpu_set_flags(ctx, ctx.registers.A === 0 ? 1 : 0, 0, 0, 0);
}

export function proc_or(ctx: cpu_context): void {
  ctx.registers.A = (ctx.registers.A | (ctx.fetched_data & 0xff)) & 0xff;
  cpu_set_flags(ctx, ctx.registers.A === 0 ? 1 : 0, 0, 0, 0);
}

export function proc_cp(ctx: cpu_context): void {
  const a = ctx.registers.A & 0xff;
  const fetched = ctx.fetched_data & 0xff;
  const n = a - fetched;

  cpu_set_flags(
    ctx,
    n === 0 ? 1 : 0,
    1,
    ((a & 0x0f) - (fetched & 0x0f)) < 0 ? 1 : 0,
    n < 0 ? 1 : 0,
  );
}

export function proc_di(ctx: cpu_context): void {
  ctx.int_master_enabled = false;
}

export function proc_ei(ctx: cpu_context): void {
  ctx.enabling_ime = true;
}

export function is_16_bit(rt: RegType): boolean {
  return (
    rt === "RT_AF" ||
    rt === "RT_BC" ||
    rt === "RT_DE" ||
    rt === "RT_HL" ||
    rt === "RT_SP" ||
    rt === "RT_PC"
  );
}

export function proc_ld(ctx: cpu_context): void {
  if (ctx.destination_is_memory) {
    if (is_16_bit(ctx.current_instruction?.reg_2!)) {
      emu_cycles(1);
      bus_write16(ctx.memory_destination, ctx.fetched_data & 0xffff);
    } else {
      bus_write(ctx.memory_destination, ctx.fetched_data & 0xff);
    }

    emu_cycles(1);
    return;
  }

  if (ctx.current_instruction?.mode === "AM_HL_SPR") {
    const src = cpu_read_register(ctx, ctx.current_instruction?.reg_2!);
    const offset = ctx.fetched_data & 0xff;

    const hflag = (src & 0x0f) + (offset & 0x0f) >= 0x10;
    const cflag = (src & 0xff) + (offset & 0xff) >= 0x100;

    cpu_set_flags(ctx, 0, 0, hflag ? 1 : 0, cflag ? 1 : 0);
    cpu_set_register(
      ctx,
      ctx.current_instruction?.reg_1!,
      (src + ((offset & 0x80) ? offset - 0x100 : offset)) & 0xffff,
    );
    return;
  }

  cpu_set_register(ctx, ctx.current_instruction?.reg_1!, ctx.fetched_data);
}

export function proc_ldh(ctx: cpu_context): void {
  if (ctx.current_instruction?.reg_1 === "RT_A") {
    cpu_set_register(
      ctx,
      ctx.current_instruction?.reg_1,
      bus_read(0xff00 | (ctx.fetched_data & 0xff)),
    );
  } else {
    bus_write(ctx.memory_destination, ctx.registers.A);
  }

  emu_cycles(1);
}

export function check_cond(ctx: cpu_context): boolean {
  const z = (ctx.registers.F & 0x80) !== 0;
  const c = (ctx.registers.F & 0x10) !== 0;

  switch (ctx.current_instruction?.cond) {
    case "CT_NONE":
      return true;
    case "CT_C":
      return c;
    case "CT_NC":
      return !c;
    case "CT_Z":
      return z;
    case "CT_NZ":
      return !z;
  }

  return false;
}

export function goto_address(
  ctx: cpu_context,
  address: number,
  pushpc: boolean,
): void {
  if (check_cond(ctx)) {
    if (pushpc) {
      emu_cycles(2);
      stack_push16(ctx.registers.PC);
    }

    ctx.registers.PC = address & 0xffff;
    emu_cycles(1);
  }
}

export function proc_jp(ctx: cpu_context): void {
  goto_address(ctx, ctx.fetched_data, false);
}

export function toSigned8(value: number): number {
  const v = value & 0xff;
  return v & 0x80 ? v - 0x100 : v;
}

export function proc_jr(ctx: cpu_context): void {
  const rel = toSigned8(ctx.fetched_data);
  const address = (ctx.registers.PC + rel) & 0xffff;
  goto_address(ctx, address, false);
}

export function proc_call(ctx: cpu_context): void {
  goto_address(ctx, ctx.fetched_data, true);
}

export function proc_rst(ctx: cpu_context): void {
  goto_address(ctx, ctx.current_instruction?.param!, true);
}

export function proc_ret(ctx: cpu_context): void {
  if (ctx.current_instruction?.cond !== "CT_NONE") {
    emu_cycles(1);
  }

  if (check_cond(ctx)) {
    const lo = stack_pop();
    emu_cycles(1);
    const hi = stack_pop();
    emu_cycles(1);

    ctx.registers.PC = ((hi << 8) | lo) & 0xffff;
    emu_cycles(1);
  }
}

export function proc_reti(ctx: cpu_context): void {
  ctx.int_master_enabled = true;
  proc_ret(ctx);
}

export function proc_pop(ctx: cpu_context): void {
  const lo = stack_pop();
  emu_cycles(1);
  const hi = stack_pop();
  emu_cycles(1);

  const n = ((hi << 8) | lo) & 0xffff;

  if (ctx.current_instruction?.reg_1 === "RT_AF") {
    cpu_set_register(ctx, ctx.current_instruction?.reg_1, n & 0xfff0);
  } else {
    cpu_set_register(ctx, ctx.current_instruction?.reg_1!, n);
  }
}

export function proc_push(ctx: cpu_context): void {
  const value = cpu_read_register(ctx, ctx.current_instruction?.reg_1!);
  const hi = (value >> 8) & 0xff;
  emu_cycles(1);
  stack_push(hi);

  const lo = value & 0xff;
  emu_cycles(1);
  stack_push(lo);

  emu_cycles(1);
}

export function proc_inc(ctx: cpu_context): void {
  let value = cpu_read_register(ctx, ctx.current_instruction?.reg_1!) + 1;

  if (is_16_bit(ctx.current_instruction?.reg_1!)) {
    emu_cycles(1);
  }

  if (
    ctx.current_instruction?.reg_1 === "RT_HL" &&
    ctx.current_instruction?.mode === "AM_MR"
  ) {
    value = (bus_read(cpu_read_register(ctx, "RT_HL")) + 1) & 0xff;
    bus_write(cpu_read_register(ctx, "RT_HL"), value);
  } else {
    cpu_set_register(ctx, ctx.current_instruction?.reg_1!, value);
    value = cpu_read_register(ctx, ctx.current_instruction?.reg_1!);
  }

  if ((ctx.current_opcode & 0x03) === 0x03) {
    return;
  }

  cpu_set_flags(
    ctx,
    value === 0 ? 1 : 0,
    0,
    (value & 0x0f) === 0 ? 1 : 0,
    -1,
  );
}

export function proc_dec(ctx: cpu_context): void {
  let value = cpu_read_register(ctx, ctx.current_instruction?.reg_1!) - 1;

  if (is_16_bit(ctx.current_instruction?.reg_1!)) {
    emu_cycles(1);
  }

  if (
    ctx.current_instruction?.reg_1 === "RT_HL" &&
    ctx.current_instruction?.mode === "AM_MR"
  ) {
    value = (bus_read(cpu_read_register(ctx, "RT_HL")) - 1) & 0xff;
    bus_write(cpu_read_register(ctx, "RT_HL"), value);
  } else {
    cpu_set_register(ctx, ctx.current_instruction?.reg_1!, value);
    value = cpu_read_register(ctx, ctx.current_instruction?.reg_1!);
  }

  if ((ctx.current_opcode & 0x0b) === 0x0b) {
    return;
  }

  cpu_set_flags(
    ctx,
    value === 0 ? 1 : 0,
    1,
    (value & 0x0f) === 0x0f ? 1 : 0,
    -1,
  );
}

export function proc_sub(ctx: cpu_context): void {
  const reg = ctx.current_instruction?.reg_1!;
  const regValue = cpu_read_register(ctx, reg);
  const value = regValue - ctx.fetched_data;

  const z = value === 0 ? 1 : 0;
  const h = ((regValue & 0x0f) - (ctx.fetched_data & 0x0f)) < 0 ? 1 : 0;
  const c = regValue - ctx.fetched_data < 0 ? 1 : 0;

  cpu_set_register(ctx, reg, value);
  cpu_set_flags(ctx, z, 1, h, c);
}

export function proc_sbc(ctx: cpu_context): void {
  const reg = ctx.current_instruction?.reg_1!;
  const regValue = cpu_read_register(ctx, reg);
  const carry = (ctx.registers.F & 0x10) !== 0 ? 1 : 0;
  const value = (ctx.fetched_data & 0xff) + carry;

  const z = regValue - value === 0 ? 1 : 0;
  const h =
    ((regValue & 0x0f) - (ctx.fetched_data & 0x0f) - carry) < 0 ? 1 : 0;
  const c = regValue - (ctx.fetched_data & 0xff) - carry < 0 ? 1 : 0;

  cpu_set_register(ctx, reg, regValue - value);
  cpu_set_flags(ctx, z, 1, h, c);
}

export function proc_adc(ctx: cpu_context): void {
  const u = ctx.fetched_data & 0xff;
  const a = ctx.registers.A & 0xff;
  const c = (ctx.registers.F & 0x10) !== 0 ? 1 : 0;

  ctx.registers.A = (a + u + c) & 0xff;

  cpu_set_flags(
    ctx,
    ctx.registers.A === 0 ? 1 : 0,
    0,
    (a & 0x0f) + (u & 0x0f) + c > 0x0f ? 1 : 0,
    a + u + c > 0xff ? 1 : 0,
  );
}

export function proc_add(ctx: cpu_context): void {
  const reg = ctx.current_instruction?.reg_1;
  const current = cpu_read_register(ctx, reg!);
  let value = current + ctx.fetched_data;

  const is16bit = is_16_bit(reg!);

  if (is16bit) {
    emu_cycles(1);
  }

  if (reg === "RT_SP") {
    value = current + toSigned8(ctx.fetched_data);
  }

  let z = (value & 0xff) === 0 ? 1 : 0;
  let h = (current & 0x0f) + (ctx.fetched_data & 0x0f) >= 0x10 ? 1 : 0;
  let c = (current & 0xff) + (ctx.fetched_data & 0xff) >= 0x100 ? 1 : 0;

  if (is16bit) {
    z = -1;
    h = (current & 0x0fff) + (ctx.fetched_data & 0x0fff) >= 0x1000 ? 1 : 0;
    c = current + ctx.fetched_data >= 0x10000 ? 1 : 0;
  }

  if (reg === "RT_SP") {
    z = 0;
    h = (current & 0x0f) + (ctx.fetched_data & 0x0f) >= 0x10 ? 1 : 0;
    c = (current & 0xff) + (ctx.fetched_data & 0xff) >= 0x100 ? 1 : 0;
  }

  cpu_set_register(ctx, reg!, value & 0xffff);
  cpu_set_flags(ctx, z, 0, h, c);
}

function proc_jphl(ctx: cpu_context): void {
  ctx.registers.PC = cpu_read_register(ctx, "RT_HL") & 0xffff;
}

const processors: Record<InType, (ctx: cpu_context) => void> = {
  [in_type.IN_NONE]: proc_none,
  [in_type.IN_NOP]: proc_nop,
  [in_type.IN_LD]: proc_ld,
  [in_type.IN_LDH]: proc_ldh,
  [in_type.IN_JP]: proc_jp,
  [in_type.IN_DI]: proc_di,
  [in_type.IN_POP]: proc_pop,
  [in_type.IN_PUSH]: proc_push,
  [in_type.IN_JR]: proc_jr,
  [in_type.IN_CALL]: proc_call,
  [in_type.IN_RET]: proc_ret,
  [in_type.IN_RST]: proc_rst,
  [in_type.IN_DEC]: proc_dec,
  [in_type.IN_INC]: proc_inc,
  [in_type.IN_ADD]: proc_add,
  [in_type.IN_ADC]: proc_adc,
  [in_type.IN_SUB]: proc_sub,
  [in_type.IN_SBC]: proc_sbc,
  [in_type.IN_RETI]: proc_reti,
  [in_type.IN_XOR]: proc_xor,
  [in_type.IN_AND]: proc_and,
  [in_type.IN_OR]: proc_or,
  [in_type.IN_CP]: proc_cp,
  [in_type.IN_RLCA]: proc_rlca,
  [in_type.IN_RRCA]: proc_rrca,
  [in_type.IN_RLA]: proc_rla,
  [in_type.IN_RRA]: proc_rra,
  [in_type.IN_DAA]: proc_daa,
  [in_type.IN_CPL]: proc_cpl,
  [in_type.IN_SCF]: proc_scf,
  [in_type.IN_CCF]: proc_ccf,
  [in_type.IN_HALT]: proc_halt,
  [in_type.IN_STOP]: proc_stop,
  [in_type.IN_EI]: proc_ei,
  [in_type.IN_JPHL]: proc_jphl,
  [in_type.IN_CB]: proc_cb,
  [in_type.IN_RLC]: proc_cb,
  [in_type.IN_RRC]: proc_cb,
  [in_type.IN_RL]: proc_cb,
  [in_type.IN_RR]: proc_cb,
  [in_type.IN_SLA]: proc_cb,
  [in_type.IN_SRA]: proc_cb,
  [in_type.IN_SWAP]: proc_cb,
  [in_type.IN_SRL]: proc_cb,
  [in_type.IN_BIT]: proc_cb,
  [in_type.IN_RES]: proc_cb,
  [in_type.IN_SET]: proc_cb,
  [in_type.IN_ERR]: proc_none,
};

export function instruction_get_processor(type: InType) {
  return processors[type];
}