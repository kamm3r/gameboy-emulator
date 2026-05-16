import { in_type, type InType, type RegType } from "@/lib/cpu/instructions";
import { type cpu_context } from "@/lib/cpu/cpu";
import { bus_read, bus_write } from "@/lib/memory/bus";
import {
  cpu_read_register,
  cpu_read_register8,
  cpu_set_register,
} from "@/lib/cpu/cpu_util";
import { stack_pop, stack_push, stack_push16 } from "@/lib/stack";
import { emu_cycles } from "@/lib/emu";

export function cpu_set_flags(
  ctx: cpu_context,
  z: number,
  n: number,
  h: number,
  c: number,
): void {
  let f = ctx.registers.F & 0xf0;

  if (z !== -1) {
    f = z ? f | 0x80 : f & 0x7f;
  }

  if (n !== -1) {
    f = n ? f | 0x40 : f & 0xbf;
  }

  if (h !== -1) {
    f = h ? f | 0x20 : f & 0xdf;
  }

  if (c !== -1) {
    f = c ? f | 0x10 : f & 0xef;
  }

  ctx.registers.F = f & 0xf0;
}

function hex8(value: number): string {
  return `0x${(value & 0xff).toString(16).padStart(2, "0")}`;
}

function hex16(value: number): string {
  return `0x${(value & 0xffff).toString(16).padStart(4, "0")}`;
}

function isInvalidOpcode(opcode: number): boolean {
  switch (opcode & 0xff) {
    case 0xd3:
    case 0xdb:
    case 0xdd:
    case 0xe3:
    case 0xe4:
    case 0xeb:
    case 0xec:
    case 0xed:
    case 0xf4:
    case 0xfc:
    case 0xfd:
      return true;
    default:
      return false;
  }
}

export function proc_none(ctx: cpu_context): void {
  const pc = ctx.registers.PC & 0xffff;
  const opcode = ctx.current_opcode & 0xff;

  console.error("INVALID INSTRUCTION");
  console.error({
    pc: hex16(pc),
    opcode: hex8(opcode),
    fetched_data: hex16(ctx.fetched_data),
    legal_sm83_opcode: !isInvalidOpcode(opcode),
    instruction: ctx.current_instruction,
    registers: { ...ctx.registers },
    next0: hex8(bus_read(pc)),
    next1: hex8(bus_read((pc + 1) & 0xffff)),
    next2: hex8(bus_read((pc + 2) & 0xffff)),
  });

  throw new Error(
    `unknown or unimplemented instruction opcode=${hex8(opcode)} pc=${hex16(
      pc,
    )}`,
  );
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
  return rt_lookup[reg & 7];
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
  const reg = rt_lookup[op & 7];
  const bit = (op >>> 3) & 7;
  const bitOp = op >>> 6;

  let value = cpu_read_register8(ctx, reg);

  emu_cycles(1);

  if (reg === "RT_HL") {
    emu_cycles(2);
  }

  switch (bitOp) {
    case 1:
      cpu_set_flags(ctx, value & (1 << bit) ? 0 : 1, 0, 1, -1);
      return;

    case 2:
      write_cb_result(ctx, reg, value & ~(1 << bit));
      return;

    case 3:
      write_cb_result(ctx, reg, value | (1 << bit));
      return;
  }

  const carry = ctx.registers.F & 0x10 ? 1 : 0;

  switch (bit) {
    case 0: {
      const newCarry = value >>> 7;
      value = ((value << 1) | newCarry) & 0xff;
      write_cb_result(ctx, reg, value);
      cpu_set_flags(ctx, value === 0 ? 1 : 0, 0, 0, newCarry);
      return;
    }

    case 1: {
      const newCarry = value & 1;
      value = ((value >>> 1) | (newCarry << 7)) & 0xff;
      write_cb_result(ctx, reg, value);
      cpu_set_flags(ctx, value === 0 ? 1 : 0, 0, 0, newCarry);
      return;
    }

    case 2: {
      const newCarry = value >>> 7;
      value = ((value << 1) | carry) & 0xff;
      write_cb_result(ctx, reg, value);
      cpu_set_flags(ctx, value === 0 ? 1 : 0, 0, 0, newCarry);
      return;
    }

    case 3: {
      const newCarry = value & 1;
      value = ((value >>> 1) | (carry << 7)) & 0xff;
      write_cb_result(ctx, reg, value);
      cpu_set_flags(ctx, value === 0 ? 1 : 0, 0, 0, newCarry);
      return;
    }

    case 4: {
      const newCarry = value >>> 7;
      value = (value << 1) & 0xff;
      write_cb_result(ctx, reg, value);
      cpu_set_flags(ctx, value === 0 ? 1 : 0, 0, 0, newCarry);
      return;
    }

    case 5: {
      const newCarry = value & 1;
      value = ((value >>> 1) | (value & 0x80)) & 0xff;
      write_cb_result(ctx, reg, value);
      cpu_set_flags(ctx, value === 0 ? 1 : 0, 0, 0, newCarry);
      return;
    }

    case 6:
      value = ((value & 0x0f) << 4) | (value >>> 4);
      write_cb_result(ctx, reg, value);
      cpu_set_flags(ctx, value === 0 ? 1 : 0, 0, 0, 0);
      return;

    case 7: {
      const newCarry = value & 1;
      value = value >>> 1;
      write_cb_result(ctx, reg, value);
      cpu_set_flags(ctx, value === 0 ? 1 : 0, 0, 0, newCarry);
      return;
    }
  }
}

export function proc_rlca(ctx: cpu_context): void {
  const a = ctx.registers.A & 0xff;
  const c = a >>> 7;

  ctx.registers.A = ((a << 1) | c) & 0xff;
  cpu_set_flags(ctx, 0, 0, 0, c);
}

export function proc_rrca(ctx: cpu_context): void {
  const a = ctx.registers.A & 0xff;
  const c = a & 1;

  ctx.registers.A = ((a >>> 1) | (c << 7)) & 0xff;
  cpu_set_flags(ctx, 0, 0, 0, c);
}

export function proc_rla(ctx: cpu_context): void {
  const a = ctx.registers.A & 0xff;
  const oldCarry = ctx.registers.F & 0x10 ? 1 : 0;
  const newCarry = a >>> 7;

  ctx.registers.A = ((a << 1) | oldCarry) & 0xff;
  cpu_set_flags(ctx, 0, 0, 0, newCarry);
}

export function proc_rra(ctx: cpu_context): void {
  const a = ctx.registers.A & 0xff;
  const oldCarry = ctx.registers.F & 0x10 ? 1 : 0;
  const newCarry = a & 1;

  ctx.registers.A = ((a >>> 1) | (oldCarry << 7)) & 0xff;
  cpu_set_flags(ctx, 0, 0, 0, newCarry);
}

export function proc_stop(): void {
  console.log("STOPPING!");
}

export function proc_daa(ctx: cpu_context): void {
  const r = ctx.registers;
  let a = r.A & 0xff;
  let adjust = 0;
  let carry = r.F & 0x10 ? 1 : 0;

  const flagN = r.F & 0x40;
  const flagH = r.F & 0x20;

  if (flagH || (!flagN && (a & 0x0f) > 9)) {
    adjust |= 0x06;
  }

  if (carry || (!flagN && a > 0x99)) {
    adjust |= 0x60;
    carry = 1;
  }

  a = flagN ? a - adjust : a + adjust;
  r.A = a & 0xff;

  cpu_set_flags(ctx, r.A === 0 ? 1 : 0, -1, 0, carry);
}

export function proc_cpl(ctx: cpu_context): void {
  ctx.registers.A = ~ctx.registers.A & 0xff;
  cpu_set_flags(ctx, -1, 1, 1, -1);
}

export function proc_scf(ctx: cpu_context): void {
  cpu_set_flags(ctx, -1, 0, 0, 1);
}

export function proc_ccf(ctx: cpu_context): void {
  cpu_set_flags(ctx, -1, 0, 0, ctx.registers.F & 0x10 ? 0 : 1);
}

export function proc_halt(ctx: cpu_context): void {
  ctx.halted = true;
}

export function proc_and(ctx: cpu_context): void {
  const a = ctx.registers.A & ctx.fetched_data & 0xff;

  ctx.registers.A = a;
  cpu_set_flags(ctx, a === 0 ? 1 : 0, 0, 1, 0);
}

export function proc_xor(ctx: cpu_context): void {
  const a = (ctx.registers.A ^ ctx.fetched_data) & 0xff;

  ctx.registers.A = a;
  cpu_set_flags(ctx, a === 0 ? 1 : 0, 0, 0, 0);
}

export function proc_or(ctx: cpu_context): void {
  const a = (ctx.registers.A | ctx.fetched_data) & 0xff;

  ctx.registers.A = a;
  cpu_set_flags(ctx, a === 0 ? 1 : 0, 0, 0, 0);
}

export function proc_cp(ctx: cpu_context): void {
  const a = ctx.registers.A & 0xff;
  const v = ctx.fetched_data & 0xff;
  const result = a - v;

  cpu_set_flags(
    ctx,
    (result & 0xff) === 0 ? 1 : 0,
    1,
    (a & 0x0f) < (v & 0x0f) ? 1 : 0,
    a < v ? 1 : 0,
  );
}

export function proc_di(ctx: cpu_context): void {
  ctx.int_master_enabled = false;
  ctx.enabling_ime = false;
}

export function proc_ei(ctx: cpu_context): void {
  ctx.enabling_ime = true;
}

export function is_16_bit(rt: RegType): boolean {
  switch (rt) {
    case "RT_AF":
    case "RT_BC":
    case "RT_DE":
    case "RT_HL":
    case "RT_SP":
    case "RT_PC":
      return true;
    default:
      return false;
  }
}

export function proc_ld(ctx: cpu_context): void {
  const inst = ctx.current_instruction!;

  if (ctx.destination_is_memory) {
    if (is_16_bit(inst.reg_2!)) {
      const value = ctx.fetched_data & 0xffff;

      bus_write(ctx.memory_destination, value & 0xff);
      emu_cycles(1);

      bus_write((ctx.memory_destination + 1) & 0xffff, value >>> 8);
      emu_cycles(1);
    } else {
      bus_write(ctx.memory_destination, ctx.fetched_data & 0xff);
      emu_cycles(1);
    }

    return;
  }

  if (inst.mode === "AM_HL_SPR") {
    const src = cpu_read_register(ctx, inst.reg_2!);
    const offset = ctx.fetched_data & 0xff;
    const signed = offset & 0x80 ? offset - 0x100 : offset;

    cpu_set_flags(
      ctx,
      0,
      0,
      (src & 0x0f) + (offset & 0x0f) > 0x0f ? 1 : 0,
      (src & 0xff) + offset > 0xff ? 1 : 0,
    );

    cpu_set_register(ctx, inst.reg_1!, (src + signed) & 0xffff);
    return;
  }

  cpu_set_register(ctx, inst.reg_1!, ctx.fetched_data);
}

export function proc_ldh(ctx: cpu_context): void {
  const inst = ctx.current_instruction!;

  emu_cycles(1);

  if (inst.reg_1 === "RT_A") {
    ctx.registers.A = bus_read(0xff00 | (ctx.fetched_data & 0xff)) & 0xff;
  } else {
    bus_write(ctx.memory_destination, ctx.registers.A & 0xff);
  }
}

export function check_cond(ctx: cpu_context): boolean {
  const cond = ctx.current_instruction!.cond;

  if (cond === undefined || cond === "CT_NONE") {
    return true;
  }

  const f = ctx.registers.F;

  switch (cond) {
    case "CT_C":
      return (f & 0x10) !== 0;
    case "CT_NC":
      return (f & 0x10) === 0;
    case "CT_Z":
      return (f & 0x80) !== 0;
    case "CT_NZ":
      return (f & 0x80) === 0;
    default:
      return true;
  }
}

export function goto_address(
  ctx: cpu_context,
  address: number,
  pushpc: boolean,
): void {
  if (!check_cond(ctx)) {
    return;
  }

  if (pushpc) {
    emu_cycles(2);
    stack_push16(ctx.registers.PC);
  }

  ctx.registers.PC = address & 0xffff;
  emu_cycles(1);
}

export function proc_jp(ctx: cpu_context): void {
  goto_address(ctx, ctx.fetched_data, false);
}

export function toSigned8(value: number): number {
  value &= 0xff;
  return value & 0x80 ? value - 0x100 : value;
}

export function proc_jr(ctx: cpu_context): void {
  goto_address(ctx, (ctx.registers.PC + toSigned8(ctx.fetched_data)) & 0xffff, false);
}

export function proc_call(ctx: cpu_context): void {
  goto_address(ctx, ctx.fetched_data, true);
}

export function proc_rst(ctx: cpu_context): void {
  goto_address(ctx, ctx.current_instruction!.param!, true);
}

export function proc_ret(ctx: cpu_context): void {
  const inst = ctx.current_instruction!;

  if (inst.cond !== undefined && inst.cond !== "CT_NONE") {
    emu_cycles(1);
  }

  if (!check_cond(ctx)) {
    return;
  }

  const lo = stack_pop();
  emu_cycles(1);

  const hi = stack_pop();
  emu_cycles(1);

  ctx.registers.PC = ((hi << 8) | lo) & 0xffff;
  emu_cycles(1);
}

export function proc_reti(ctx: cpu_context): void {
  ctx.int_master_enabled = true;
  proc_ret(ctx);
}

export function proc_pop(ctx: cpu_context): void {
  const inst = ctx.current_instruction!;

  const lo = stack_pop();
  emu_cycles(1);

  const hi = stack_pop();
  emu_cycles(1);

  const value = ((hi << 8) | lo) & 0xffff;

  cpu_set_register(
    ctx,
    inst.reg_1!,
    inst.reg_1 === "RT_AF" ? value & 0xfff0 : value,
  );
}

export function proc_push(ctx: cpu_context): void {
  const value = cpu_read_register(ctx, ctx.current_instruction!.reg_1!);

  emu_cycles(1);
  stack_push((value >>> 8) & 0xff);

  emu_cycles(1);
  stack_push(value & 0xff);

  emu_cycles(1);
}

export function proc_inc(ctx: cpu_context): void {
  const inst = ctx.current_instruction!;
  const reg = inst.reg_1!;

  if (is_16_bit(reg)) {
    cpu_set_register(ctx, reg, (cpu_read_register(ctx, reg) + 1) & 0xffff);
    emu_cycles(1);
    return;
  }

  let value: number;

  if (reg === "RT_HL" && inst.mode === "AM_MR") {
    const address = cpu_read_register(ctx, "RT_HL");
    value = (bus_read(address) + 1) & 0xff;
    bus_write(address, value);
  } else {
    value = (cpu_read_register(ctx, reg) + 1) & 0xff;
    cpu_set_register(ctx, reg, value);
  }

  cpu_set_flags(ctx, value === 0 ? 1 : 0, 0, (value & 0x0f) === 0 ? 1 : 0, -1);
}

export function proc_dec(ctx: cpu_context): void {
  const inst = ctx.current_instruction!;
  const reg = inst.reg_1!;

  if (is_16_bit(reg)) {
    cpu_set_register(ctx, reg, (cpu_read_register(ctx, reg) - 1) & 0xffff);
    emu_cycles(1);
    return;
  }

  let value: number;

  if (reg === "RT_HL" && inst.mode === "AM_MR") {
    const address = cpu_read_register(ctx, "RT_HL");
    value = (bus_read(address) - 1) & 0xff;
    bus_write(address, value);
  } else {
    value = (cpu_read_register(ctx, reg) - 1) & 0xff;
    cpu_set_register(ctx, reg, value);
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
  const reg = ctx.current_instruction!.reg_1!;
  const a = cpu_read_register(ctx, reg) & 0xff;
  const v = ctx.fetched_data & 0xff;
  const result = a - v;

  cpu_set_register(ctx, reg, result & 0xff);
  cpu_set_flags(
    ctx,
    (result & 0xff) === 0 ? 1 : 0,
    1,
    (a & 0x0f) < (v & 0x0f) ? 1 : 0,
    a < v ? 1 : 0,
  );
}

export function proc_sbc(ctx: cpu_context): void {
  const reg = ctx.current_instruction!.reg_1!;
  const a = cpu_read_register(ctx, reg) & 0xff;
  const v = ctx.fetched_data & 0xff;
  const carry = ctx.registers.F & 0x10 ? 1 : 0;
  const total = v + carry;
  const result = a - total;

  cpu_set_register(ctx, reg, result & 0xff);
  cpu_set_flags(
    ctx,
    (result & 0xff) === 0 ? 1 : 0,
    1,
    (a & 0x0f) < ((v & 0x0f) + carry) ? 1 : 0,
    a < total ? 1 : 0,
  );
}

export function proc_adc(ctx: cpu_context): void {
  const a = ctx.registers.A & 0xff;
  const v = ctx.fetched_data & 0xff;
  const carry = ctx.registers.F & 0x10 ? 1 : 0;
  const result = a + v + carry;

  ctx.registers.A = result & 0xff;

  cpu_set_flags(
    ctx,
    (result & 0xff) === 0 ? 1 : 0,
    0,
    (a & 0x0f) + (v & 0x0f) + carry > 0x0f ? 1 : 0,
    result > 0xff ? 1 : 0,
  );
}

export function proc_add(ctx: cpu_context): void {
  const inst = ctx.current_instruction!;
  const reg = inst.reg_1!;
  const current = cpu_read_register(ctx, reg);
  const fetched = ctx.fetched_data;
  const is16 = is_16_bit(reg);

  let value = current + fetched;
  let z = (value & 0xff) === 0 ? 1 : 0;
  let h = (current & 0x0f) + (fetched & 0x0f) > 0x0f ? 1 : 0;
  let c = (current & 0xff) + (fetched & 0xff) > 0xff ? 1 : 0;

  if (is16) {
    emu_cycles(1);

    z = -1;
    h = (current & 0x0fff) + (fetched & 0x0fff) > 0x0fff ? 1 : 0;
    c = current + fetched > 0xffff ? 1 : 0;
  }

  if (reg === "RT_SP") {
    const offset = fetched & 0xff;

    value = current + toSigned8(offset);
    z = 0;
    h = (current & 0x0f) + (offset & 0x0f) > 0x0f ? 1 : 0;
    c = (current & 0xff) + offset > 0xff ? 1 : 0;
  }

  cpu_set_register(ctx, reg, value & 0xffff);
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

export function instruction_get_processor(
  type: InType,
): ((ctx: cpu_context) => void) | undefined {
  return processors[type];
}