// import { BIT_SET } from "@/lib/common";
import { in_type, RegType, type InType } from "@/lib/instructions";
import { type cpu_context } from "@/lib/cpu";
import { emulation_cycles } from "@/lib/emu";
import { bus_read, bus_write } from "@/lib/bus";
import { cpu_read_register, cpu_set_register } from "@/lib/cpu_util";
import { stack_pop, stack_push, stack_push16 } from "@/lib/stack";

function cpu_set_flags(
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
function proc_none(ctx: cpu_context): void {
  console.log("INVALID INSTRUCTION!\n");
  process.exit(-7);
}

function proc_nop(ctx: cpu_context): void {}

function proc_di(ctx: cpu_context): void {
  ctx.int_master_enabled = false;
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

function proc_ld(ctx: cpu_context): void {
  if (ctx.destination_is_memory) {
    // LD (BC), A for instance

    if (is_16_bit(ctx.current_instruction.reg_2!)) {
      emulation_cycles(1);
      bus_write(ctx.memory_destination, ctx.fetched_data);
    } else {
      bus_write(ctx.memory_destination, ctx.fetched_data);
    }

    emulation_cycles(1);
    return;
  }
  if (ctx.current_instruction.mode === "AM_HL_SPR") {
    const hflag =
      (cpu_read_register(ctx, ctx.current_instruction.reg_2!) & 0xf) +
        (ctx.fetched_data & 0xf) >=
      0x10;
    const cflag =
      (cpu_read_register(ctx, ctx.current_instruction.reg_2!) & 0xff) +
        (ctx.fetched_data & 0xff) >=
      0x100;

    cpu_set_flags(ctx, 0, 0, hflag ? 1 : 0, cflag ? 1 : 0);
    cpu_set_register(
      ctx,
      ctx.current_instruction.reg_1!,
      cpu_read_register(ctx, ctx.current_instruction.reg_2!) + ctx.fetched_data,
    );
    return;
  }
  cpu_set_register(ctx, ctx.current_instruction.reg_1!, ctx.fetched_data);
}

function proc_ldh(ctx: cpu_context): void {
  if (ctx.current_instruction.reg_1 === "RT_A") {
    cpu_set_register(
      ctx,
      ctx.current_instruction.reg_1,
      bus_read(0xff00 | ctx.fetched_data),
    );
  } else {
    bus_write(0xff00 | ctx.fetched_data, ctx.registers.A);
  }
  emulation_cycles(1);
}

function proc_xor(ctx: cpu_context): void {
  ctx.registers.A ^= ctx.fetched_data & 0xff;
  cpu_set_flags(ctx, ctx.registers.A == 0 ? 1 : 0, 0, 0, 0);
}

function proc_and(ctx: cpu_context): void {
  ctx.registers.A &= ctx.fetched_data & 0xff;
  cpu_set_flags(ctx, ctx.registers.A == 0 ? 1 : 0, 0, 1, 0);
}

function proc_or(ctx: cpu_context): void {
  ctx.registers.A |= ctx.fetched_data & 0xff;
  cpu_set_flags(ctx, ctx.registers.A == 0 ? 1 : 0, 0, 0, 0);
}

function proc_cp(ctx: cpu_context): void {
  const result = ctx.registers.A - ctx.fetched_data;
  cpu_set_flags(
    ctx,
    (result & 0xff) === 0 ? 1 : 0,
    1,
    (ctx.registers.A & 0xf) < (ctx.fetched_data & 0xf) ? 1 : 0,
    result < 0 ? 1 : 0
  );
}

// Rotate/Shift operations
function proc_rlca(ctx: cpu_context): void {
  const a = ctx.registers.A;
  const c = (a >> 7) & 1;
  ctx.registers.A = ((a << 1) | c) & 0xff;
  cpu_set_flags(ctx, 0, 0, 0, c);
}

function proc_rrca(ctx: cpu_context): void {
  const a = ctx.registers.A;
  const c = a & 1;
  ctx.registers.A = ((a >> 1) | (c << 7)) & 0xff;
  cpu_set_flags(ctx, 0, 0, 0, c);
}

function proc_rla(ctx: cpu_context): void {
  const a = ctx.registers.A;
  const old_c = (ctx.registers.F & 0x10) !== 0 ? 1 : 0;
  const c = (a >> 7) & 1;
  ctx.registers.A = ((a << 1) | old_c) & 0xff;
  cpu_set_flags(ctx, 0, 0, 0, c);
}

function proc_rra(ctx: cpu_context): void {
  const a = ctx.registers.A;
  const old_c = (ctx.registers.F & 0x10) !== 0 ? 1 : 0;
  const c = a & 1;
  ctx.registers.A = ((a >> 1) | (old_c << 7)) & 0xff;
  cpu_set_flags(ctx, 0, 0, 0, c);
}

// DAA - Decimal Adjust Accumulator
function proc_daa(ctx: cpu_context): void {
  let a = ctx.registers.A;
  let c = (ctx.registers.F & 0x10) !== 0;
  let h = (ctx.registers.F & 0x20) !== 0;
  let n = (ctx.registers.F & 0x40) !== 0;

  if (n) {
    if (c) {
      a = (a - 0x60) & 0xff;
    }
    if (h) {
      a = (a - 0x06) & 0xff;
    }
  } else {
    if (c || a > 0x99) {
      a = (a + 0x60) & 0xff;
      c = true;
    }
    if (h || (a & 0x0f) > 0x09) {
      a = (a + 0x06) & 0xff;
    }
  }

  ctx.registers.A = a;
  cpu_set_flags(ctx, a === 0 ? 1 : 0, n ? 1 : -1, 0, c ? 1 : 0);
}

function proc_cpl(ctx: cpu_context): void {
  ctx.registers.A = (~ctx.registers.A) & 0xff;
  cpu_set_flags(ctx, -1, 1, 1, -1);
}

function proc_scf(ctx: cpu_context): void {
  cpu_set_flags(ctx, -1, 0, 0, 1);
}

function proc_ccf(ctx: cpu_context): void {
  const old_c = (ctx.registers.F & 0x10) !== 0 ? 1 : 0;
  cpu_set_flags(ctx, -1, 0, 0, old_c ? 0 : 1);
}

// Halt and control
function proc_halt(ctx: cpu_context): void {
  ctx.halted = true;
}

function proc_stop(ctx: cpu_context): void {
  console.log("STOP instruction not fully implemented");
}

function proc_ei(ctx: cpu_context): void {
  ctx.int_master_enabled = true;
}

function proc_jphl(ctx: cpu_context): void {
  ctx.registers.PC = cpu_read_register(ctx, "RT_HL");
}

// CB prefix instruction processor
const cb_registers: RegType[] = [
  "RT_B", "RT_C", "RT_D", "RT_E", "RT_H", "RT_L", "RT_HL", "RT_A"
];

function proc_cb(ctx: cpu_context): void {
  const cb_opcode = ctx.fetched_data & 0xff;
  const op = (cb_opcode >> 3) & 0x1f;
  const bit = (cb_opcode >> 3) & 0x7;
  const reg_index = cb_opcode & 0x7;
  const reg = cb_registers[reg_index];

  let value: number;
  let is_hl = reg === "RT_HL";

  if (is_hl) {
    value = bus_read(cpu_read_register(ctx, "RT_HL"));
    emulation_cycles(1);
  } else {
    value = cpu_read_register(ctx, reg);
  }

  // Bit operations based on CB opcode range
  if (cb_opcode < 0x40) {
    // RLC, RRC, RL, RR, SLA, SRA, SWAP, SRL
    switch (op) {
      case 0: // RLC
        {
          const c = (value >> 7) & 1;
          value = ((value << 1) | c) & 0xff;
          cpu_set_flags(ctx, value === 0 ? 1 : 0, 0, 0, c);
        }
        break;
      case 1: // RRC
        {
          const c = value & 1;
          value = ((value >> 1) | (c << 7)) & 0xff;
          cpu_set_flags(ctx, value === 0 ? 1 : 0, 0, 0, c);
        }
        break;
      case 2: // RL
        {
          const old_c = (ctx.registers.F & 0x10) !== 0 ? 1 : 0;
          const c = (value >> 7) & 1;
          value = ((value << 1) | old_c) & 0xff;
          cpu_set_flags(ctx, value === 0 ? 1 : 0, 0, 0, c);
        }
        break;
      case 3: // RR
        {
          const old_c = (ctx.registers.F & 0x10) !== 0 ? 1 : 0;
          const c = value & 1;
          value = ((value >> 1) | (old_c << 7)) & 0xff;
          cpu_set_flags(ctx, value === 0 ? 1 : 0, 0, 0, c);
        }
        break;
      case 4: // SLA
        {
          const c = (value >> 7) & 1;
          value = (value << 1) & 0xff;
          cpu_set_flags(ctx, value === 0 ? 1 : 0, 0, 0, c);
        }
        break;
      case 5: // SRA
        {
          const c = value & 1;
          const msb = value & 0x80;
          value = ((value >> 1) | msb) & 0xff;
          cpu_set_flags(ctx, value === 0 ? 1 : 0, 0, 0, c);
        }
        break;
      case 6: // SWAP
        {
          value = ((value & 0xf) << 4) | ((value >> 4) & 0xf);
          cpu_set_flags(ctx, value === 0 ? 1 : 0, 0, 0, 0);
        }
        break;
      case 7: // SRL
        {
          const c = value & 1;
          value = (value >> 1) & 0xff;
          cpu_set_flags(ctx, value === 0 ? 1 : 0, 0, 0, c);
        }
        break;
    }

    if (is_hl) {
      bus_write(cpu_read_register(ctx, "RT_HL"), value);
      emulation_cycles(1);
    } else {
      cpu_set_register(ctx, reg, value);
    }
  } else if (cb_opcode < 0x80) {
    // BIT
    const bit_value = (value >> bit) & 1;
    cpu_set_flags(ctx, bit_value ? 0 : 1, 0, 1, -1);
  } else if (cb_opcode < 0xc0) {
    // RES
    value &= ~(1 << bit);
    if (is_hl) {
      bus_write(cpu_read_register(ctx, "RT_HL"), value);
      emulation_cycles(1);
    } else {
      cpu_set_register(ctx, reg, value);
    }
  } else {
    // SET
    value |= (1 << bit);
    if (is_hl) {
      bus_write(cpu_read_register(ctx, "RT_HL"), value);
      emulation_cycles(1);
    } else {
      cpu_set_register(ctx, reg, value);
    }
  }
}

function check_cond(ctx: cpu_context): boolean {
  const z = (ctx.registers.F & 0x80) !== 0;
  const c = (ctx.registers.F & 0x10) !== 0;

  switch (ctx.current_instruction.cond) {
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

function goto_address(
  ctx: cpu_context,
  address: number,
  pushpc: boolean,
): void {
  if (check_cond(ctx)) {
    if (pushpc) {
      emulation_cycles(2);
      stack_push16(ctx.registers.PC);
    }
    ctx.registers.PC = address;
    emulation_cycles(1);
  }
}

function proc_jp(ctx: cpu_context): void {
  goto_address(ctx, ctx.fetched_data, false);
}

function toSigned8(value: number): number {
  return value & 0x80 ? value - 0x100 : value;
}

function proc_jr(ctx: cpu_context): void {
  const rel = toSigned8(ctx.fetched_data & 0xff);
  const address = (ctx.registers.PC + rel) & 0xffff;
  goto_address(ctx, address, false);
}

function proc_call(ctx: cpu_context): void {
  goto_address(ctx, ctx.fetched_data, true);
}

function proc_rst(ctx: cpu_context): void {
  goto_address(ctx, ctx.current_instruction.param!, true);
}

function proc_ret(ctx: cpu_context): void {
  if (ctx.current_instruction.cond === "CT_NONE") {
    emulation_cycles(1);
  }

  if (check_cond(ctx)) {
    const lo = stack_pop();
    emulation_cycles(1);
    const hi = stack_pop();
    emulation_cycles(1);

    const n = (hi << 8) | lo;
    ctx.registers.PC = n;

    emulation_cycles(1);
  }
}

function proc_reti(ctx: cpu_context): void {
  ctx.int_master_enabled = true;
  proc_ret(ctx);
}

function proc_pop(ctx: cpu_context): void {
  const lo = stack_pop();
  emulation_cycles(1);
  const hi = stack_pop();
  emulation_cycles(1);

  const n = (hi << 8) | lo;

  cpu_set_register(ctx, ctx.current_instruction.reg_1!, n);

  if (ctx.current_instruction.reg_1 == "RT_AF") {
    cpu_set_register(ctx, ctx.current_instruction.reg_1, n & 0xfff0);
  }
}

function proc_push(ctx: cpu_context): void {
  const hi =
    (cpu_read_register(ctx, ctx.current_instruction.reg_1!) >> 8) & 0xff;
  emulation_cycles(1);
  stack_push(hi);

  const lo = cpu_read_register(ctx, ctx.current_instruction.reg_1!) & 0xff;
  emulation_cycles(1);
  stack_push(lo);

  emulation_cycles(1);
}

function proc_inc(ctx: cpu_context): void {
  let value = cpu_read_register(ctx, ctx.current_instruction.reg_1!) + 1;

  if (is_16_bit(ctx.current_instruction.reg_1!)) {
    emulation_cycles(1);
  }

  if (
    ctx.current_instruction.reg_1 === "RT_HL" &&
    ctx.current_instruction.mode === "AM_MR"
  ) {
    value = bus_read(cpu_read_register(ctx, "RT_HL")) + 1;
    value &= 0xff;
    bus_write(cpu_read_register(ctx, "RT_HL"), value);
  } else {
    cpu_set_register(ctx, ctx.current_instruction.reg_1!, value);
    value = cpu_read_register(ctx, ctx.current_instruction.reg_1!);
  }

  if ((ctx.current_opcode & 0x03) == 0x03) {
    return;
  }

  cpu_set_flags(ctx, value === 0 ? 1 : 0, 0, (value & 0x0f) === 0 ? 1 : 0, -1);
}

function proc_dec(ctx: cpu_context): void {
  let value = cpu_read_register(ctx, ctx.current_instruction.reg_1!) - 1;

  if (is_16_bit(ctx.current_instruction.reg_1!)) {
    emulation_cycles(1);
  }

  if (
    ctx.current_instruction.reg_1 === "RT_HL" &&
    ctx.current_instruction.mode === "AM_MR"
  ) {
    value = bus_read(cpu_read_register(ctx, "RT_HL")) - 1;
    value &= 0xff;
    bus_write(cpu_read_register(ctx, "RT_HL"), value);
  } else {
    cpu_set_register(ctx, ctx.current_instruction.reg_1!, value);
    value = cpu_read_register(ctx, ctx.current_instruction.reg_1!);
  }

  if ((ctx.current_opcode & 0x0b) == 0x0b) {
    return;
  }

  cpu_set_flags(ctx, value === 0 ? 1 : 0, 1, (value & 0x0f) === 0x0f ? 1 : 0, -1);
}

function proc_sub(ctx: cpu_context): void {
  const value =
    cpu_read_register(ctx, ctx.current_instruction.reg_1!) - ctx.fetched_data;

  const z = value === 0 ? 1 : 0;
  const h =
    (cpu_read_register(ctx, ctx.current_instruction.reg_1!) & 0xf) -
      (ctx.fetched_data & 0xf) <
    0
      ? 1
      : 0;
  const c =
    cpu_read_register(ctx, ctx.current_instruction.reg_1!) - ctx.fetched_data <
    0
      ? 1
      : 0;

  cpu_set_register(ctx, ctx.current_instruction.reg_1!, value);
  cpu_set_flags(ctx, z, 1, h, c);
}

function proc_sbc(ctx: cpu_context): void {
  const a = cpu_read_register(ctx, ctx.current_instruction.reg_1!);
  const carry = (ctx.registers.F & 0x10) !== 0 ? 1 : 0;
  const u = ctx.fetched_data;
  const result = a - u - carry;

  cpu_set_register(ctx, ctx.current_instruction.reg_1!, result & 0xff);
  cpu_set_flags(
    ctx,
    (result & 0xff) === 0 ? 1 : 0,
    1,
    (a & 0xf) < (u & 0xf) + carry ? 1 : 0,
    a < u + carry ? 1 : 0,
  );
}

function proc_adc(ctx: cpu_context): void {
  const u = ctx.fetched_data;
  const a = ctx.registers.A;
  const c = (ctx.registers.F & 0x10) !== 0 ? 1 : 0;

  ctx.registers.A = (a + u + c) & 0xff;

  cpu_set_flags(
    ctx,
    ctx.registers.A == 0 ? 1 : 0,
    0,
    (a & 0xf) + (u & 0xf) + c > 0xf ? 1 : 0,
    a + u + c > 0xff ? 1 : 0,
  );
}

function proc_add(ctx: cpu_context): void {
  let value =
    cpu_read_register(ctx, ctx.current_instruction.reg_1!) + ctx.fetched_data;

  const is_16bit = is_16_bit(ctx.current_instruction.reg_1!);

  if (is_16bit) {
    emulation_cycles(1);
  }

  if (ctx.current_instruction.reg_1 === "RT_SP") {
    value = cpu_read_register(
      ctx,
      ctx.current_instruction.reg_1!
    )  + ctx.fetched_data;
  }

  let z = (value & 0xff) === 0 ? 1 : 0;
  let h =
    (cpu_read_register(ctx, ctx.current_instruction.reg_1!) & 0xf) +
      (ctx.fetched_data & 0xf) >=
    0x10
      ? 1
      : 0;
  let c =
    (cpu_read_register(ctx, ctx.current_instruction.reg_1!) & 0xff) +
      (ctx.fetched_data & 0xff) >=
    0x100
      ? 1
      : 0;

  if (is_16bit) {
    z = -1;
    h =
      (cpu_read_register(ctx, ctx.current_instruction.reg_1!) & 0xfff) +
        (ctx.fetched_data & 0xfff) >=
      0x1000
        ? 1
        : 0;
    const n =
      cpu_read_register(ctx, ctx.current_instruction.reg_1!) + ctx.fetched_data;
    c = n >= 0x10000 ? 1 : 0;
  }

  if (ctx.current_instruction.reg_1 === "RT_SP") {
    z = 0;
    h =
      (cpu_read_register(ctx, ctx.current_instruction.reg_1) & 0xf) +
        (ctx.fetched_data & 0xf) >=
      0x10
        ? 1
        : 0;
    c =
      (cpu_read_register(ctx, ctx.current_instruction.reg_1) & 0xff) +
        (ctx.fetched_data & 0xff) >=
      0x100
        ? 1
        : 0;
  }

  cpu_set_register(ctx, ctx.current_instruction.reg_1!, value & 0xffff);
  cpu_set_flags(ctx, z, 0, h, c);
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
  [in_type.IN_RLC]: proc_none,
  [in_type.IN_RRC]: proc_none,
  [in_type.IN_RL]: proc_none,
  [in_type.IN_RR]: proc_none,
  [in_type.IN_SLA]: proc_none,
  [in_type.IN_SRA]: proc_none,
  [in_type.IN_SWAP]: proc_none,
  [in_type.IN_SRL]: proc_none,
  [in_type.IN_BIT]: proc_none,
  [in_type.IN_RES]: proc_none,
  [in_type.IN_SET]: proc_none,
  [in_type.IN_ERR]: proc_none,
};

function instruction_get_processor(type: InType) {
  return processors[type];
}

export {
  proc_none,
  proc_nop,
  proc_ld,
  proc_ldh,
  proc_jp,
  proc_di,
  proc_pop,
  proc_push,
  proc_jr,
  proc_call,
  proc_ret,
  proc_rst,
  proc_dec,
  proc_inc,
  proc_add,
  proc_adc,
  proc_sub,
  proc_sbc,
  proc_reti,
  proc_xor,
  instruction_get_processor,
};
