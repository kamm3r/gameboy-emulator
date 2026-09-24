import { type RegType, type InType } from "@/lib/cpu/instructions";
import { type cpu_context } from "@/lib/cpu/cpu";
import { bus_read, bus_write } from "@/lib/memory/bus";
import {
  cpu_read_register,
  cpu_read_register8,
  cpu_set_register,
} from "@/lib/cpu/cpu_util";
import { stack_pop, stack_push, stack_push16 } from "@/lib/stack";
import { emu_cycles } from "@/lib/emu";

type processor = (ctx: cpu_context) => void;

// Pass -1 to leave a flag unchanged
function cpu_set_flags(
  ctx: cpu_context,
  z: number,
  n: number,
  h: number,
  c: number,
): void {
  let f = ctx.registers.F;
  if (z !== -1) f = z ? f | 0x80 : f & ~0x80;
  if (n !== -1) f = n ? f | 0x40 : f & ~0x40;
  if (h !== -1) f = h ? f | 0x20 : f & ~0x20;
  if (c !== -1) f = c ? f | 0x10 : f & ~0x10;
  ctx.registers.F = f & 0xf0;
}

function flag_c(ctx: cpu_context): number {
  return (ctx.registers.F >> 4) & 1;
}

function is_16_bit(rt: RegType): boolean {
  return (
    rt === "RT_AF" ||
    rt === "RT_BC" ||
    rt === "RT_DE" ||
    rt === "RT_HL" ||
    rt === "RT_SP" ||
    rt === "RT_PC"
  );
}

function to_signed8(value: number): number {
  const v = value & 0xff;
  return v & 0x80 ? v - 0x100 : v;
}

function proc_none(ctx: cpu_context): void {
  const pc = (ctx.registers.PC - 1) & 0xffff;
  throw new Error(
    `unknown or unimplemented instruction opcode=0x${ctx.current_opcode
      .toString(16)
      .padStart(2, "0")} pc=0x${pc.toString(16).padStart(4, "0")}`,
  );
}

// Shift/rotate kinds in CB order: RLC RRC RL RR SLA SRA SWAP SRL.
// Returns the result and leaves the new carry in shift_carry.
let shift_carry = 0;

function shift(kind: number, v: number, carry_in: number): number {
  switch (kind) {
    case 0:
      shift_carry = v >> 7;
      return ((v << 1) | shift_carry) & 0xff;
    case 1:
      shift_carry = v & 1;
      return (v >> 1) | (shift_carry << 7);
    case 2:
      shift_carry = v >> 7;
      return ((v << 1) | carry_in) & 0xff;
    case 3:
      shift_carry = v & 1;
      return (v >> 1) | (carry_in << 7);
    case 4:
      shift_carry = v >> 7;
      return (v << 1) & 0xff;
    case 5:
      shift_carry = v & 1;
      return (v >> 1) | (v & 0x80);
    case 6:
      shift_carry = 0;
      return ((v & 0x0f) << 4) | (v >> 4);
    default:
      shift_carry = v & 1;
      return v >> 1;
  }
}

const CB_REGS: RegType[] = [
  "RT_B", "RT_C", "RT_D", "RT_E", "RT_H", "RT_L", "RT_HL", "RT_A",
];

function proc_cb(ctx: cpu_context): void {
  const op = ctx.fetched_data & 0xff;
  const reg = CB_REGS[op & 7];
  const bit = (op >> 3) & 7;
  const group = op >> 6;

  // (HL) adds a read cycle, and a write cycle for everything except BIT
  if (reg === "RT_HL") emu_cycles(1);
  const value = cpu_read_register8(ctx, reg);
  if (reg === "RT_HL" && group !== 1) emu_cycles(1);

  let result: number;

  switch (group) {
    case 0:
      result = shift(bit, value, flag_c(ctx));
      cpu_set_flags(ctx, result === 0 ? 1 : 0, 0, 0, shift_carry);
      break;
    case 1:
      cpu_set_flags(ctx, value & (1 << bit) ? 0 : 1, 0, 1, -1);
      return;
    case 2:
      result = value & ~(1 << bit);
      break;
    default:
      result = value | (1 << bit);
  }

  if (reg === "RT_HL") {
    bus_write(cpu_read_register(ctx, "RT_HL"), result & 0xff);
  } else {
    cpu_set_register(ctx, reg, result);
  }
}

// RLCA / RRCA / RLA / RRA: like the CB versions on A, but Z is always cleared
function rotate_a(kind: number): processor {
  return (ctx) => {
    ctx.registers.A = shift(kind, ctx.registers.A & 0xff, flag_c(ctx));
    cpu_set_flags(ctx, 0, 0, 0, shift_carry);
  };
}

function proc_daa(ctx: cpu_context): void {
  const f = ctx.registers.F;
  const flag_n = (f & 0x40) !== 0;
  let u = 0;
  let fc = 0;

  if (f & 0x20 || (!flag_n && (ctx.registers.A & 0x0f) > 9)) u = 6;
  if (f & 0x10 || (!flag_n && ctx.registers.A > 0x99)) {
    u |= 0x60;
    fc = 1;
  }

  ctx.registers.A = (ctx.registers.A + (flag_n ? -u : u)) & 0xff;
  cpu_set_flags(ctx, ctx.registers.A === 0 ? 1 : 0, -1, 0, fc);
}

// AND / OR / XOR share the flag pattern Z 0 H 0
function logic(op: (a: number, b: number) => number, h: number): processor {
  return (ctx) => {
    ctx.registers.A = op(ctx.registers.A, ctx.fetched_data) & 0xff;
    cpu_set_flags(ctx, ctx.registers.A === 0 ? 1 : 0, 0, h, 0);
  };
}

// 8-bit A + operand (+ carry)
function add8(ctx: cpu_context, carry: number): void {
  const a = ctx.registers.A & 0xff;
  const u = ctx.fetched_data & 0xff;

  ctx.registers.A = (a + u + carry) & 0xff;
  cpu_set_flags(
    ctx,
    ctx.registers.A === 0 ? 1 : 0,
    0,
    (a & 0x0f) + (u & 0x0f) + carry > 0x0f ? 1 : 0,
    a + u + carry > 0xff ? 1 : 0,
  );
}

// 8-bit A - operand (- carry); CP discards the result
function sub8(ctx: cpu_context, carry: number, store: boolean): void {
  const a = ctx.registers.A & 0xff;
  const u = ctx.fetched_data & 0xff;
  const result = a - u - carry;

  if (store) ctx.registers.A = result & 0xff;
  cpu_set_flags(
    ctx,
    (result & 0xff) === 0 ? 1 : 0,
    1,
    (a & 0x0f) - (u & 0x0f) - carry < 0 ? 1 : 0,
    result < 0 ? 1 : 0,
  );
}

function proc_add(ctx: cpu_context): void {
  const reg = ctx.current_instruction!.reg_1!;

  if (reg === "RT_A") {
    add8(ctx, 0);
    return;
  }

  const current = cpu_read_register(ctx, reg);
  const u = ctx.fetched_data;
  emu_cycles(1);

  if (reg === "RT_SP") {
    // ADD SP,e8: flags from the unsigned low byte, two internal cycles
    emu_cycles(1);
    cpu_set_register(ctx, reg, (current + to_signed8(u)) & 0xffff);
    cpu_set_flags(
      ctx,
      0,
      0,
      (current & 0x0f) + (u & 0x0f) >= 0x10 ? 1 : 0,
      (current & 0xff) + (u & 0xff) >= 0x100 ? 1 : 0,
    );
    return;
  }

  // ADD HL,rr
  cpu_set_register(ctx, reg, (current + u) & 0xffff);
  cpu_set_flags(
    ctx,
    -1,
    0,
    (current & 0x0fff) + (u & 0x0fff) >= 0x1000 ? 1 : 0,
    current + u >= 0x10000 ? 1 : 0,
  );
}

function inc_dec(delta: number): processor {
  return (ctx) => {
    const inst = ctx.current_instruction!;
    const reg = inst.reg_1!;
    let value: number;

    // 16-bit ops take an internal cycle; for INC/DEC (HL) it's the write cycle
    if (is_16_bit(reg)) emu_cycles(1);

    if (inst.mode === "AM_MR") {
      value = (ctx.fetched_data + delta) & 0xff;
      bus_write(cpu_read_register(ctx, "RT_HL"), value);
    } else {
      cpu_set_register(ctx, reg, cpu_read_register(ctx, reg) + delta);
      if (is_16_bit(reg)) return; // 16-bit INC/DEC leave flags alone
      value = cpu_read_register(ctx, reg);
    }

    const half = delta > 0 ? (value & 0x0f) === 0 : (value & 0x0f) === 0x0f;
    cpu_set_flags(ctx, value === 0 ? 1 : 0, delta > 0 ? 0 : 1, half ? 1 : 0, -1);
  };
}

function proc_ld(ctx: cpu_context): void {
  const inst = ctx.current_instruction!;

  if (ctx.destination_is_memory) {
    emu_cycles(1);
    bus_write(ctx.memory_destination, ctx.fetched_data & 0xff);

    // LD (a16),SP writes the high byte too
    if (is_16_bit(inst.reg_2!)) {
      emu_cycles(1);
      bus_write(
        (ctx.memory_destination + 1) & 0xffff,
        (ctx.fetched_data >> 8) & 0xff,
      );
    }
    return;
  }

  if (inst.mode === "AM_HL_SPR") {
    // LD HL,SP+e8: flags from the unsigned low byte, one internal cycle
    const src = cpu_read_register(ctx, inst.reg_2!);
    const offset = ctx.fetched_data & 0xff;

    emu_cycles(1);
    cpu_set_flags(
      ctx,
      0,
      0,
      (src & 0x0f) + (offset & 0x0f) >= 0x10 ? 1 : 0,
      (src & 0xff) + offset >= 0x100 ? 1 : 0,
    );
    cpu_set_register(ctx, inst.reg_1!, (src + to_signed8(offset)) & 0xffff);
    return;
  }

  // LD SP,HL takes an extra internal cycle
  if (inst.reg_1 === "RT_SP" && inst.reg_2 === "RT_HL") emu_cycles(1);

  cpu_set_register(ctx, inst.reg_1!, ctx.fetched_data);
}

function proc_ldh(ctx: cpu_context): void {
  emu_cycles(1);

  if (ctx.current_instruction!.reg_1 === "RT_A") {
    ctx.registers.A = bus_read(0xff00 | (ctx.fetched_data & 0xff)) & 0xff;
  } else {
    bus_write(ctx.memory_destination, ctx.registers.A & 0xff);
  }
}

function check_cond(ctx: cpu_context): boolean {
  const f = ctx.registers.F;

  switch (ctx.current_instruction!.cond) {
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

function goto_address(
  ctx: cpu_context,
  address: number,
  push_pc: boolean,
): void {
  if (!check_cond(ctx)) return;

  if (push_pc) {
    emu_cycles(2);
    stack_push16(ctx.registers.PC);
  }

  ctx.registers.PC = address & 0xffff;

  // JP HL has no internal delay cycle
  if (ctx.current_instruction!.mode !== "AM_R") emu_cycles(1);
}

function proc_ret(ctx: cpu_context): void {
  const cond = ctx.current_instruction!.cond;

  // Conditional RET spends a cycle evaluating the condition
  if (cond != null && cond !== "CT_NONE") emu_cycles(1);
  if (!check_cond(ctx)) return;

  const lo = stack_pop();
  emu_cycles(1);
  const hi = stack_pop();
  emu_cycles(1);

  ctx.registers.PC = ((hi << 8) | lo) & 0xffff;
  emu_cycles(1);
}

function proc_pop(ctx: cpu_context): void {
  const lo = stack_pop();
  emu_cycles(1);
  const hi = stack_pop();
  emu_cycles(1);

  // cpu_set_register masks F's low nibble for AF
  cpu_set_register(ctx, ctx.current_instruction!.reg_1!, (hi << 8) | lo);
}

function proc_push(ctx: cpu_context): void {
  const value = cpu_read_register(ctx, ctx.current_instruction!.reg_1!);

  emu_cycles(1);
  stack_push((value >> 8) & 0xff);
  emu_cycles(1);
  stack_push(value & 0xff);
  emu_cycles(1);
}

const processors: Record<InType, processor> = {
  IN_NONE: proc_none,
  IN_NOP: () => {},
  IN_LD: proc_ld,
  IN_LDH: proc_ldh,
  IN_JP: (ctx) => goto_address(ctx, ctx.fetched_data, false),
  IN_JR: (ctx) =>
    goto_address(ctx, ctx.registers.PC + to_signed8(ctx.fetched_data), false),
  IN_CALL: (ctx) => goto_address(ctx, ctx.fetched_data, true),
  IN_RST: (ctx) => goto_address(ctx, ctx.current_instruction!.param!, true),
  IN_RET: proc_ret,
  IN_RETI: (ctx) => {
    ctx.int_master_enabled = true;
    proc_ret(ctx);
  },
  IN_DI: (ctx) => {
    ctx.int_master_enabled = false;
  },
  IN_EI: (ctx) => {
    ctx.enabling_ime = true;
  },
  IN_POP: proc_pop,
  IN_PUSH: proc_push,
  IN_INC: inc_dec(1),
  IN_DEC: inc_dec(-1),
  IN_ADD: proc_add,
  IN_ADC: (ctx) => add8(ctx, flag_c(ctx)),
  IN_SUB: (ctx) => sub8(ctx, 0, true),
  IN_SBC: (ctx) => sub8(ctx, flag_c(ctx), true),
  IN_CP: (ctx) => sub8(ctx, 0, false),
  IN_AND: logic((a, b) => a & b, 1),
  IN_OR: logic((a, b) => a | b, 0),
  IN_XOR: logic((a, b) => a ^ b, 0),
  IN_RLCA: rotate_a(0),
  IN_RRCA: rotate_a(1),
  IN_RLA: rotate_a(2),
  IN_RRA: rotate_a(3),
  IN_DAA: proc_daa,
  IN_CPL: (ctx) => {
    ctx.registers.A = ~ctx.registers.A & 0xff;
    cpu_set_flags(ctx, -1, 1, 1, -1);
  },
  IN_SCF: (ctx) => cpu_set_flags(ctx, -1, 0, 0, 1),
  IN_CCF: (ctx) => cpu_set_flags(ctx, -1, 0, 0, flag_c(ctx) ^ 1),
  IN_HALT: (ctx) => {
    ctx.halted = true;
  },
  IN_STOP: () => console.log("STOPPING!"),
  IN_CB: proc_cb,
};

export function instruction_get_processor(type: InType): processor {
  return processors[type];
}
