import { InType, type RegType } from "./instructions";
import { cpu_context } from "./cpu";
import { bus_read, bus_write } from "../memory/bus";
import {
  cpu_read_register,
  cpu_read_register8,
  cpu_set_register,
  cpu_set_flags,
  cpu_write_register8,
} from "./cpu_util";
import { stack_push16, stack_pop16 } from "../stack";
import { emu_cycles } from "../emu";

export function proc_none(ctx: cpu_context): void {
  throw new Error(
    `Unknown instruction opcode=${(ctx.current_opcode & 0xff).toString(16)}`,
  );
}

export function proc_nop(): void {}

function write_cb_result(ctx: cpu_context, reg: string, value: number): void {
  value &= 0xff;

  if (reg === "RT_HL") {
    bus_write(cpu_read_register(ctx, "RT_HL"), value);
  } else {
    cpu_set_register(ctx, reg as RegType, value);
  }
}

const rt_lookup = ["RT_B", "RT_C", "RT_D", "RT_E", "RT_H", "RT_L", "RT_HL", "RT_A"];

export function proc_cb(ctx: cpu_context): void {
  const op = ctx.fetched_data & 0xff;
  const reg = rt_lookup[op & 7];
  const bit = (op >>> 3) & 7;
  const bit_op = op >>> 6;

  let value = cpu_read_register8(ctx, reg as RegType);

  emu_cycles(1);

  if (reg === "RT_HL") {
    emu_cycles(2);
  }

  switch (bit_op) {
    case 1: // BIT
      cpu_set_flags(ctx, (value & (1 << bit)) === 0 ? 1 : 0, 0, 1, -1);
      return;

    case 2: // RES
      write_cb_result(ctx, reg, value & ~(1 << bit));
      return;

    case 3: // SET
      write_cb_result(ctx, reg, value | (1 << bit));
      return;
  }

  const carry = (ctx.registers.F & 0x10) !== 0 ? 1 : 0;

  switch (bit) {
    case 0: { // RLC
      const new_carry = (value >>> 7) & 1;
      value = ((value << 1) | new_carry) & 0xff;
      write_cb_result(ctx, reg, value);
      cpu_set_flags(ctx, value === 0 ? 1 : 0, 0, 0, new_carry);
      return;
    }
    case 1: { // RRC
      const new_carry = value & 1;
      value = ((value >>> 1) | (new_carry << 7)) & 0xff;
      write_cb_result(ctx, reg, value);
      cpu_set_flags(ctx, value === 0 ? 1 : 0, 0, 0, new_carry);
      return;
    }
    case 2: { // RL
      const new_carry = (value >>> 7) & 1;
      value = ((value << 1) | carry) & 0xff;
      write_cb_result(ctx, reg, value);
      cpu_set_flags(ctx, value === 0 ? 1 : 0, 0, 0, new_carry);
      return;
    }
    case 3: { // RR
      const new_carry = value & 1;
      value = ((value >>> 1) | (carry << 7)) & 0xff;
      write_cb_result(ctx, reg, value);
      cpu_set_flags(ctx, value === 0 ? 1 : 0, 0, 0, new_carry);
      return;
    }
    case 4: { // SLA
      const new_carry = (value >>> 7) & 1;
      value = (value << 1) & 0xff;
      write_cb_result(ctx, reg, value);
      cpu_set_flags(ctx, value === 0 ? 1 : 0, 0, 0, new_carry);
      return;
    }
    case 5: { // SRA
      const new_carry = value & 1;
      value = ((value >>> 1) | (value & 0x80)) & 0xff;
      write_cb_result(ctx, reg, value);
      cpu_set_flags(ctx, value === 0 ? 1 : 0, 0, 0, new_carry);
      return;
    }
    case 6: { // SWAP
      value = ((value & 0x0f) << 4) | (value >>> 4);
      write_cb_result(ctx, reg, value);
      cpu_set_flags(ctx, value === 0 ? 1 : 0, 0, 0, 0);
      return;
    }
    case 7: { // SRL
      const new_carry = value & 1;
      value = value >>> 1;
      write_cb_result(ctx, reg, value);
      cpu_set_flags(ctx, value === 0 ? 1 : 0, 0, 0, new_carry);
      return;
    }
  }
}

export function proc_rlca(ctx: cpu_context): void {
  const a = ctx.registers.A & 0xff;
  const c = (a >>> 7) & 1;
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
  const old_carry = (ctx.registers.F & 0x10) !== 0 ? 1 : 0;
  const new_carry = (a >>> 7) & 1;
  ctx.registers.A = ((a << 1) | old_carry) & 0xff;
  cpu_set_flags(ctx, 0, 0, 0, new_carry);
}

export function proc_rra(ctx: cpu_context): void {
  const a = ctx.registers.A & 0xff;
  const old_carry = (ctx.registers.F & 0x10) !== 0 ? 1 : 0;
  const new_carry = a & 1;
  ctx.registers.A = ((a >>> 1) | (old_carry << 7)) & 0xff;
  cpu_set_flags(ctx, 0, 0, 0, new_carry);
}

export function proc_stop(): void {
  // stop
}

export function proc_daa(ctx: cpu_context): void {
  let a = ctx.registers.A & 0xff;
  let adjust = 0;
  let carry = (ctx.registers.F & 0x10) !== 0 ? 1 : 0;
  const flag_n = (ctx.registers.F & 0x40) !== 0;
  const flag_h = (ctx.registers.F & 0x20) !== 0;

  if (flag_h || (!flag_n && (a & 0x0f) > 9)) {
    adjust |= 0x06;
  }

  if (carry !== 0 || (!flag_n && a > 0x99)) {
    adjust |= 0x60;
    carry = 1;
  }

  a = flag_n ? a - adjust : a + adjust;
  ctx.registers.A = a & 0xff;
  cpu_set_flags(ctx, ctx.registers.A === 0 ? 1 : 0, -1, 0, carry);
}

export function proc_cpl(ctx: cpu_context): void {
  ctx.registers.A = (~ctx.registers.A) & 0xff;
  cpu_set_flags(ctx, -1, 1, 1, -1);
}

export function proc_scf(ctx: cpu_context): void {
  cpu_set_flags(ctx, -1, 0, 0, 1);
}

export function proc_ccf(ctx: cpu_context): void {
  const c = (ctx.registers.F & 0x10) !== 0 ? 0 : 1;
  cpu_set_flags(ctx, -1, 0, 0, c);
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

function is_16_bit(reg: string): boolean {
  switch (reg) {
    case "RT_AF": case "RT_BC": case "RT_DE": case "RT_HL": case "RT_SP": case "RT_PC":
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
      bus_write((ctx.memory_destination + 1) & 0xffff, (value >>> 8) & 0xff);
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
    const signed_offset = offset & 0x80 ? offset - 0x100 : offset;

    cpu_set_flags(
      ctx,
      0, 0,
      (src & 0x0f) + (offset & 0x0f) > 0x0f ? 1 : 0,
      (src & 0xff) + offset > 0xff ? 1 : 0,
    );

    cpu_set_register(ctx, inst.reg_1!, (src + signed_offset) & 0xffff);
    return;
  }

  cpu_set_register(ctx, inst.reg_1!, ctx.fetched_data);
}

export function proc_ldh(ctx: cpu_context): void {
  const inst = ctx.current_instruction!;
  emu_cycles(1);

  if (inst.reg_1 === "RT_A") {
    ctx.registers.A = bus_read(ctx.memory_destination) & 0xff;
  } else {
    bus_write(ctx.memory_destination, ctx.registers.A & 0xff);
  }
}

function check_cond(ctx: cpu_context): boolean {
  const inst = ctx.current_instruction!;

  if (inst.cond === undefined || inst.cond === null || inst.cond === "CT_NONE") {
    return true;
  }

  const f = ctx.registers.F;

  switch (inst.cond) {
    case "CT_C":  return (f & 0x10) !== 0;
    case "CT_NC": return (f & 0x10) === 0;
    case "CT_Z":  return (f & 0x80) !== 0;
    case "CT_NZ": return (f & 0x80) === 0;
    default:      return true;
  }
}

function goto_address(ctx: cpu_context, address: number, pushpc: boolean): void {
  if (!check_cond(ctx)) {
    return;
  }

  if (pushpc) {
    emu_cycles(2);
    ctx.registers.SP = stack_push16(ctx.registers.SP, ctx.registers.PC);
  }

  ctx.registers.PC = address & 0xffff;
  emu_cycles(1);
}

export function proc_jp(ctx: cpu_context): void {
  goto_address(ctx, ctx.fetched_data, false);
}

export function proc_jr(ctx: cpu_context): void {
  const offset = ctx.fetched_data & 0xff;
  const signed_off = offset & 0x80 ? offset - 0x100 : offset;
  goto_address(ctx, (ctx.registers.PC + signed_off) & 0xffff, false);
}

export function proc_call(ctx: cpu_context): void {
  goto_address(ctx, ctx.fetched_data, true);
}

export function proc_rst(ctx: cpu_context): void {
  goto_address(ctx, ctx.current_instruction!.param!, true);
}

export function proc_ret(ctx: cpu_context): void {
  const inst = ctx.current_instruction!;

  if (inst.cond !== undefined && inst.cond !== null && inst.cond !== "CT_NONE") {
    emu_cycles(1);
  }

  if (!check_cond(ctx)) {
    return;
  }

  const result = stack_pop16(ctx.registers.SP);
  ctx.registers.SP = result.sp;
  ctx.registers.PC = result.value;
  emu_cycles(3);
}

export function proc_reti(ctx: cpu_context): void {
  ctx.int_master_enabled = true;
  proc_ret(ctx);
}

export function proc_pop(ctx: cpu_context): void {
  const inst = ctx.current_instruction!;
  const result = stack_pop16(ctx.registers.SP);
  ctx.registers.SP = result.sp;
  cpu_set_register(
    ctx,
    inst.reg_1!,
    inst.reg_1 === "RT_AF" ? result.value & 0xfff0 : result.value,
  );
}

export function proc_push(ctx: cpu_context): void {
  const value = cpu_read_register(ctx, ctx.current_instruction!.reg_1!);
  emu_cycles(1);
  ctx.registers.SP = stack_push16(ctx.registers.SP, value);
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

  cpu_set_flags(ctx, value === 0 ? 1 : 0, 1, (value & 0x0f) === 0x0f ? 1 : 0, -1);
}

export function proc_sub(ctx: cpu_context): void {
  const a = ctx.registers.A & 0xff;
  const v = ctx.fetched_data & 0xff;
  const result = a - v;
  ctx.registers.A = result & 0xff;
  cpu_set_flags(
    ctx,
    (result & 0xff) === 0 ? 1 : 0,
    1,
    (a & 0x0f) < (v & 0x0f) ? 1 : 0,
    a < v ? 1 : 0,
  );
}

export function proc_sbc(ctx: cpu_context): void {
  const a = ctx.registers.A & 0xff;
  const v = ctx.fetched_data & 0xff;
  const carry = (ctx.registers.F & 0x10) !== 0 ? 1 : 0;
  const total = v + carry;
  const result = a - total;
  ctx.registers.A = result & 0xff;
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
  const carry = (ctx.registers.F & 0x10) !== 0 ? 1 : 0;
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
    value = current + (offset & 0x80 ? offset - 0x100 : offset);
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

const processors: Record<number, (ctx: cpu_context) => void> = {
  [InType.IN_NONE]: proc_none,
  [InType.IN_NOP]: proc_nop,
  [InType.IN_LD]: proc_ld,
  [InType.IN_LDH]: proc_ldh,
  [InType.IN_JP]: proc_jp,
  [InType.IN_JR]: proc_jr,
  [InType.IN_CALL]: proc_call,
  [InType.IN_RET]: proc_ret,
  [InType.IN_RETI]: proc_reti,
  [InType.IN_RST]: proc_rst,
  [InType.IN_POP]: proc_pop,
  [InType.IN_PUSH]: proc_push,
  [InType.IN_DEC]: proc_dec,
  [InType.IN_INC]: proc_inc,
  [InType.IN_ADD]: proc_add,
  [InType.IN_ADC]: proc_adc,
  [InType.IN_SUB]: proc_sub,
  [InType.IN_SBC]: proc_sbc,
  [InType.IN_AND]: proc_and,
  [InType.IN_XOR]: proc_xor,
  [InType.IN_OR]: proc_or,
  [InType.IN_CP]: proc_cp,
  [InType.IN_CPL]: proc_cpl,
  [InType.IN_DAA]: proc_daa,
  [InType.IN_SCF]: proc_scf,
  [InType.IN_CCF]: proc_ccf,
  [InType.IN_DI]: proc_di,
  [InType.IN_EI]: proc_ei,
  [InType.IN_HALT]: proc_halt,
  [InType.IN_STOP]: proc_stop,
  [InType.IN_JPHL]: proc_jphl,
  [InType.IN_CB]: proc_cb,
  [InType.IN_RLC]: proc_cb,
  [InType.IN_RRC]: proc_cb,
  [InType.IN_RL]: proc_cb,
  [InType.IN_RR]: proc_cb,
  [InType.IN_SLA]: proc_cb,
  [InType.IN_SRA]: proc_cb,
  [InType.IN_SWAP]: proc_cb,
  [InType.IN_SRL]: proc_cb,
  [InType.IN_BIT]: proc_cb,
  [InType.IN_RES]: proc_cb,
  [InType.IN_SET]: proc_cb,
  [InType.IN_ERR]: proc_none,
};

export function instruction_get_processor(type: InType): (ctx: cpu_context) => void {
  return processors[type] || proc_none;
}
