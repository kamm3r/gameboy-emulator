export const addr_mode = {
  AM_IMP: "AM_IMP",
  AM_R_D16: "AM_R_D16",
  AM_R_R: "AM_R_R",
  AM_MR_R: "AM_MR_R",
  AM_R: "AM_R",
  AM_R_D8: "AM_R_D8",
  AM_R_MR: "AM_R_MR",
  AM_R_HLI: "AM_R_HLI",
  AM_R_HLD: "AM_R_HLD",
  AM_HLI_R: "AM_HLI_R",
  AM_HLD_R: "AM_HLD_R",
  AM_R_A8: "AM_R_A8",
  AM_A8_R: "AM_A8_R",
  AM_HL_SPR: "AM_HL_SPR",
  AM_D16: "AM_D16",
  AM_D8: "AM_D8",
  AM_D16_R: "AM_D16_R",
  AM_MR_D8: "AM_MR_D8",
  AM_MR: "AM_MR",
  AM_A16_R: "AM_A16_R",
  AM_R_A16: "AM_R_A16",
} as const;

export type AddrMode = (typeof addr_mode)[keyof typeof addr_mode];

export const reg_type = {
  RT_NONE: "RT_NONE",
  RT_A: "RT_A",
  RT_F: "RT_F",
  RT_B: "RT_B",
  RT_C: "RT_C",
  RT_D: "RT_D",
  RT_E: "RT_E",
  RT_H: "RT_H",
  RT_L: "RT_L",
  RT_AF: "RT_AF",
  RT_BC: "RT_BC",
  RT_DE: "RT_DE",
  RT_HL: "RT_HL",
  RT_SP: "RT_SP",
  RT_PC: "RT_PC",
} as const;

export type RegType = (typeof reg_type)[keyof typeof reg_type];

export const in_type = {
  IN_NONE: "IN_NONE",
  IN_NOP: "IN_NOP",
  IN_LD: "IN_LD",
  IN_INC: "IN_INC",
  IN_DEC: "IN_DEC",
  IN_RLCA: "IN_RLCA",
  IN_ADD: "IN_ADD",
  IN_RRCA: "IN_RRCA",
  IN_STOP: "IN_STOP",
  IN_RLA: "IN_RLA",
  IN_JR: "IN_JR",
  IN_RRA: "IN_RRA",
  IN_DAA: "IN_DAA",
  IN_CPL: "IN_CPL",
  IN_SCF: "IN_SCF",
  IN_CCF: "IN_CCF",
  IN_HALT: "IN_HALT",
  IN_ADC: "IN_ADC",
  IN_SUB: "IN_SUB",
  IN_SBC: "IN_SBC",
  IN_AND: "IN_AND",
  IN_XOR: "IN_XOR",
  IN_OR: "IN_OR",
  IN_CP: "IN_CP",
  IN_POP: "IN_POP",
  IN_JP: "IN_JP",
  IN_PUSH: "IN_PUSH",
  IN_RET: "IN_RET",
  IN_CB: "IN_CB",
  IN_CALL: "IN_CALL",
  IN_RETI: "IN_RETI",
  IN_LDH: "IN_LDH",
  IN_JPHL: "IN_JPHL",
  IN_DI: "IN_DI",
  IN_EI: "IN_EI",
  IN_RST: "IN_RST",
  IN_ERR: "IN_ERR",
  //CB instructions...
  IN_RLC: "IN_RLC",
  IN_RRC: "IN_RRC",
  IN_RL: "IN_RL",
  IN_RR: "IN_RR",
  IN_SLA: "IN_SLA",
  IN_SRA: "IN_SRA",
  IN_SWAP: "IN_SWAP",
  IN_SRL: "IN_SRL",
  IN_BIT: "IN_BIT",
  IN_RES: "IN_RES",
  IN_SET: "IN_SET",
} as const;

export type InType = (typeof in_type)[keyof typeof in_type];

export const cond_type = {
  CT_NONE: "CT_NONE",
  CT_NZ: "CT_NZ",
  CT_Z: "CT_Z",
  CT_NC: "CT_NC",
  CT_C: "CT_C",
} as const;

export type CondType = (typeof cond_type)[keyof typeof cond_type];

export type instruction = {
  type: InType;
  mode: AddrMode;
  reg_1?: RegType;
  reg_2?: RegType;
  cond?: CondType;
  param?: number;
};

const instructions: instruction[] = new Array(0x100).fill(undefined);
instructions[0x00] = { type: in_type.IN_NOP, mode: addr_mode.AM_IMP };
instructions[0x01] = { type: in_type.IN_LD, mode: addr_mode.AM_R_D16, reg_1: reg_type.RT_BC };
instructions[0x02] = { type: in_type.IN_LD, mode: addr_mode.AM_MR_R, reg_1: reg_type.RT_BC, reg_2: reg_type.RT_A };
instructions[0x03] = { type: in_type.IN_INC, mode: addr_mode.AM_R, reg_1: reg_type.RT_BC };
instructions[0x04] = { type: in_type.IN_INC, mode: addr_mode.AM_R, reg_1: reg_type.RT_B };
instructions[0x05] = { type: in_type.IN_DEC, mode: addr_mode.AM_R, reg_1: reg_type.RT_B };
instructions[0x06] = { type: in_type.IN_LD, mode: addr_mode.AM_R_D8, reg_1: reg_type.RT_B };
instructions[0x07] = { type: in_type.IN_RLCA, mode: addr_mode.AM_IMP };
instructions[0x08] = { type: in_type.IN_LD, mode: addr_mode.AM_A16_R, reg_2: reg_type.RT_SP };
instructions[0x09] = { type: in_type.IN_ADD, mode: addr_mode.AM_R_R, reg_1: reg_type.RT_HL, reg_2: reg_type.RT_BC };
instructions[0x0a] = { type: in_type.IN_LD, mode: addr_mode.AM_R_MR, reg_1: reg_type.RT_A, reg_2: reg_type.RT_BC };
instructions[0x0b] = { type: in_type.IN_DEC, mode: addr_mode.AM_R, reg_1: reg_type.RT_BC };
instructions[0x0c] = { type: in_type.IN_INC, mode: addr_mode.AM_R, reg_1: reg_type.RT_C };
instructions[0x0d] = { type: in_type.IN_DEC, mode: addr_mode.AM_R, reg_1: reg_type.RT_C };
instructions[0x0e] = { type: in_type.IN_LD, mode: addr_mode.AM_R_D8, reg_1: reg_type.RT_C };
instructions[0x0f] = { type: in_type.IN_RRCA, mode: addr_mode.AM_IMP };

// 0x1X
instructions[0x10] = { type: in_type.IN_STOP, mode: addr_mode.AM_IMP };
instructions[0x11] = { type: in_type.IN_LD, mode: addr_mode.AM_R_D16, reg_1: reg_type.RT_DE };
instructions[0x12] = { type: in_type.IN_LD, mode: addr_mode.AM_MR_R, reg_1: reg_type.RT_DE, reg_2: reg_type.RT_A };
instructions[0x13] = { type: in_type.IN_INC, mode: addr_mode.AM_R, reg_1: reg_type.RT_DE };
instructions[0x14] = { type: in_type.IN_INC, mode: addr_mode.AM_R, reg_1: reg_type.RT_D };
instructions[0x15] = { type: in_type.IN_DEC, mode: addr_mode.AM_R, reg_1: reg_type.RT_D };
instructions[0x16] = { type: in_type.IN_LD, mode: addr_mode.AM_R_D8, reg_1: reg_type.RT_D };
instructions[0x17] = { type: in_type.IN_RLA, mode: addr_mode.AM_IMP };
instructions[0x18] = { type: in_type.IN_JR, mode: addr_mode.AM_D8 };
instructions[0x19] = { type: in_type.IN_ADD, mode: addr_mode.AM_R_R, reg_1: reg_type.RT_HL, reg_2: reg_type.RT_DE };
instructions[0x1a] = { type: in_type.IN_LD, mode: addr_mode.AM_R_MR, reg_1: reg_type.RT_A, reg_2: reg_type.RT_DE };
instructions[0x1b] = { type: in_type.IN_DEC, mode: addr_mode.AM_R, reg_1: reg_type.RT_DE };
instructions[0x1c] = { type: in_type.IN_INC, mode: addr_mode.AM_R, reg_1: reg_type.RT_E };
instructions[0x1d] = { type: in_type.IN_DEC, mode: addr_mode.AM_R, reg_1: reg_type.RT_E };
instructions[0x1e] = { type: in_type.IN_LD, mode: addr_mode.AM_R_D8, reg_1: reg_type.RT_E };
instructions[0x1f] = { type: in_type.IN_RRA, mode: addr_mode.AM_IMP };

// 0x2X
instructions[0x20] = { type: in_type.IN_JR, mode: addr_mode.AM_D8, cond: cond_type.CT_NZ };
instructions[0x21] = { type: in_type.IN_LD, mode: addr_mode.AM_R_D16, reg_1: reg_type.RT_HL };
instructions[0x22] = { type: in_type.IN_LD, mode: addr_mode.AM_HLI_R, reg_1: reg_type.RT_HL, reg_2: reg_type.RT_A };
instructions[0x23] = { type: in_type.IN_INC, mode: addr_mode.AM_R, reg_1: reg_type.RT_HL };
instructions[0x24] = { type: in_type.IN_INC, mode: addr_mode.AM_R, reg_1: reg_type.RT_H };
instructions[0x25] = { type: in_type.IN_DEC, mode: addr_mode.AM_R, reg_1: reg_type.RT_H };
instructions[0x26] = { type: in_type.IN_LD, mode: addr_mode.AM_R_D8, reg_1: reg_type.RT_H };
instructions[0x27] = { type: in_type.IN_DAA, mode: addr_mode.AM_IMP };
instructions[0x28] = { type: in_type.IN_JR, mode: addr_mode.AM_D8, cond: cond_type.CT_Z };
instructions[0x29] = { type: in_type.IN_ADD, mode: addr_mode.AM_R_R, reg_1: reg_type.RT_HL, reg_2: reg_type.RT_HL };
instructions[0x2a] = { type: in_type.IN_LD, mode: addr_mode.AM_R_HLI, reg_1: reg_type.RT_A, reg_2: reg_type.RT_HL };
instructions[0x2b] = { type: in_type.IN_DEC, mode: addr_mode.AM_R, reg_1: reg_type.RT_HL };
instructions[0x2c] = { type: in_type.IN_INC, mode: addr_mode.AM_R, reg_1: reg_type.RT_L };
instructions[0x2d] = { type: in_type.IN_DEC, mode: addr_mode.AM_R, reg_1: reg_type.RT_L };
instructions[0x2e] = { type: in_type.IN_LD, mode: addr_mode.AM_R_D8, reg_1: reg_type.RT_L };
instructions[0x2f] = { type: in_type.IN_CPL, mode: addr_mode.AM_IMP };

// 0x3X
instructions[0x30] = { type: in_type.IN_JR, mode: addr_mode.AM_D8, cond: cond_type.CT_NC };
instructions[0x31] = { type: in_type.IN_LD, mode: addr_mode.AM_R_D16, reg_1: reg_type.RT_SP };
instructions[0x32] = { type: in_type.IN_LD, mode: addr_mode.AM_HLD_R, reg_1: reg_type.RT_HL, reg_2: reg_type.RT_A };
instructions[0x33] = { type: in_type.IN_INC, mode: addr_mode.AM_R, reg_1: reg_type.RT_SP };
instructions[0x34] = { type: in_type.IN_INC, mode: addr_mode.AM_MR, reg_1: reg_type.RT_HL };
instructions[0x35] = { type: in_type.IN_DEC, mode: addr_mode.AM_MR, reg_1: reg_type.RT_HL };
instructions[0x36] = { type: in_type.IN_LD, mode: addr_mode.AM_MR_D8, reg_1: reg_type.RT_HL };
instructions[0x37] = { type: in_type.IN_SCF, mode: addr_mode.AM_IMP };
instructions[0x38] = { type: in_type.IN_JR, mode: addr_mode.AM_D8, cond: cond_type.CT_C };
instructions[0x39] = { type: in_type.IN_ADD, mode: addr_mode.AM_R_R, reg_1: reg_type.RT_HL, reg_2: reg_type.RT_SP };
instructions[0x3a] = { type: in_type.IN_LD, mode: addr_mode.AM_R_HLD, reg_1: reg_type.RT_A, reg_2: reg_type.RT_HL };
instructions[0x3b] = { type: in_type.IN_DEC, mode: addr_mode.AM_R, reg_1: reg_type.RT_SP };
instructions[0x3c] = { type: in_type.IN_INC, mode: addr_mode.AM_R, reg_1: reg_type.RT_A };
instructions[0x3d] = { type: in_type.IN_DEC, mode: addr_mode.AM_R, reg_1: reg_type.RT_A };
instructions[0x3e] = { type: in_type.IN_LD, mode: addr_mode.AM_R_D8, reg_1: reg_type.RT_A };
instructions[0x3f] = { type: in_type.IN_CCF, mode: addr_mode.AM_IMP };

// 0x4X - 0x7X: LD r,r instructions
for (let i = 0; i < 8; i++) {
  for (let j = 0; j < 8; j++) {
    const opcode = 0x40 + i * 8 + j;
    const regs = ['RT_B', 'RT_C', 'RT_D', 'RT_E', 'RT_H', 'RT_L', 'RT_HL', 'RT_A'] as const;
    instructions[opcode] = { type: in_type.IN_LD, mode: addr_mode.AM_R_R, reg_1: regs[i], reg_2: regs[j] };
  }
}

// 0x70-0x77: LD (HL), r
for (let i = 0; i < 8; i++) {
  const regs = ['RT_B', 'RT_C', 'RT_D', 'RT_E', 'RT_H', 'RT_L', 'RT_HL', 'RT_A'] as const;
  instructions[0x70 + i] = { type: in_type.IN_LD, mode: addr_mode.AM_MR_R, reg_1: reg_type.RT_HL, reg_2: regs[i] };
}
instructions[0x76] = { type: in_type.IN_HALT, mode: addr_mode.AM_IMP };

// 0x8X - 0xBF: ALU operations
for (let i = 0; i < 8; i++) {
  const regs = ['RT_B', 'RT_C', 'RT_D', 'RT_E', 'RT_H', 'RT_L', 'RT_HL', 'RT_A'] as const;
  // ADD
  instructions[0x80 + i] = { type: in_type.IN_ADD, mode: addr_mode.AM_R_R, reg_1: reg_type.RT_A, reg_2: regs[i] };
  // ADC
  instructions[0x88 + i] = { type: in_type.IN_ADC, mode: addr_mode.AM_R_R, reg_1: reg_type.RT_A, reg_2: regs[i] };
  // SUB
  instructions[0x90 + i] = { type: in_type.IN_SUB, mode: addr_mode.AM_R_R, reg_1: reg_type.RT_A, reg_2: regs[i] };
  // SBC
  instructions[0x98 + i] = { type: in_type.IN_SBC, mode: addr_mode.AM_R_R, reg_1: reg_type.RT_A, reg_2: regs[i] };
  // AND
  instructions[0xa0 + i] = { type: in_type.IN_AND, mode: addr_mode.AM_R_R, reg_1: reg_type.RT_A, reg_2: regs[i] };
  // XOR
  instructions[0xa8 + i] = { type: in_type.IN_XOR, mode: addr_mode.AM_R_R, reg_1: reg_type.RT_A, reg_2: regs[i] };
  // OR
  instructions[0xb0 + i] = { type: in_type.IN_OR, mode: addr_mode.AM_R_R, reg_1: reg_type.RT_A, reg_2: regs[i] };
  // CP
  instructions[0xb8 + i] = { type: in_type.IN_CP, mode: addr_mode.AM_R_R, reg_1: reg_type.RT_A, reg_2: regs[i] };
}
instructions[0xff] = {
  type: in_type.IN_RST,
  mode: addr_mode.AM_IMP,
  param: 0x38,
};

// Fill in missing instructions
instructions[0xc2] = { type: in_type.IN_JP, mode: addr_mode.AM_D16, cond: cond_type.CT_NZ };
instructions[0xc3] = { type: in_type.IN_JP, mode: addr_mode.AM_D16 };
instructions[0xc4] = { type: in_type.IN_CALL, mode: addr_mode.AM_D16, cond: cond_type.CT_NZ };
instructions[0xc5] = { type: in_type.IN_PUSH, mode: addr_mode.AM_R, reg_1: reg_type.RT_BC };
instructions[0xc6] = { type: in_type.IN_ADD, mode: addr_mode.AM_R_D8, reg_1: reg_type.RT_A };
instructions[0xc7] = { type: in_type.IN_RST, mode: addr_mode.AM_IMP, param: 0x00 };
instructions[0xc8] = { type: in_type.IN_RET, mode: addr_mode.AM_IMP, cond: cond_type.CT_Z };
instructions[0xca] = { type: in_type.IN_JP, mode: addr_mode.AM_D16, cond: cond_type.CT_Z };
instructions[0xcb] = { type: in_type.IN_CB, mode: addr_mode.AM_D8 };
instructions[0xcc] = { type: in_type.IN_CALL, mode: addr_mode.AM_D16, cond: cond_type.CT_Z };
instructions[0xcd] = { type: in_type.IN_CALL, mode: addr_mode.AM_D16 };
instructions[0xce] = { type: in_type.IN_ADC, mode: addr_mode.AM_R_D8, reg_1: reg_type.RT_A };
instructions[0xcf] = { type: in_type.IN_RST, mode: addr_mode.AM_IMP, param: 0x08 };

instructions[0xd0] = { type: in_type.IN_RET, mode: addr_mode.AM_IMP, cond: cond_type.CT_NC };
instructions[0xd1] = { type: in_type.IN_POP, mode: addr_mode.AM_R, reg_1: reg_type.RT_DE };
instructions[0xd2] = { type: in_type.IN_JP, mode: addr_mode.AM_D16, cond: cond_type.CT_NC };
instructions[0xd4] = { type: in_type.IN_CALL, mode: addr_mode.AM_D16, cond: cond_type.CT_NC };
instructions[0xd5] = { type: in_type.IN_PUSH, mode: addr_mode.AM_R, reg_1: reg_type.RT_DE };
instructions[0xd6] = { type: in_type.IN_SUB, mode: addr_mode.AM_R_D8, reg_1: reg_type.RT_A };
instructions[0xd7] = { type: in_type.IN_RST, mode: addr_mode.AM_IMP, param: 0x10 };
instructions[0xd8] = { type: in_type.IN_RET, mode: addr_mode.AM_IMP, cond: cond_type.CT_C };
instructions[0xd9] = { type: in_type.IN_RETI, mode: addr_mode.AM_IMP };
instructions[0xda] = { type: in_type.IN_JP, mode: addr_mode.AM_D16, cond: cond_type.CT_C };
instructions[0xdc] = { type: in_type.IN_CALL, mode: addr_mode.AM_D16, cond: cond_type.CT_C };
instructions[0xde] = { type: in_type.IN_SBC, mode: addr_mode.AM_R_D8, reg_1: reg_type.RT_A };
instructions[0xdf] = { type: in_type.IN_RST, mode: addr_mode.AM_IMP, param: 0x18 };

instructions[0xe0] = { type: in_type.IN_LDH, mode: addr_mode.AM_A8_R, reg_2: reg_type.RT_A };
instructions[0xe1] = { type: in_type.IN_POP, mode: addr_mode.AM_R, reg_1: reg_type.RT_HL };
instructions[0xe2] = { type: in_type.IN_LD, mode: addr_mode.AM_MR_R, reg_1: reg_type.RT_C, reg_2: reg_type.RT_A };
instructions[0xe5] = { type: in_type.IN_PUSH, mode: addr_mode.AM_R, reg_1: reg_type.RT_HL };
instructions[0xe6] = { type: in_type.IN_AND, mode: addr_mode.AM_R_D8, reg_1: reg_type.RT_A };
instructions[0xe7] = { type: in_type.IN_RST, mode: addr_mode.AM_IMP, param: 0x20 };
instructions[0xe8] = { type: in_type.IN_ADD, mode: addr_mode.AM_R_D8, reg_1: reg_type.RT_SP };
instructions[0xe9] = { type: in_type.IN_JP, mode: addr_mode.AM_R, reg_1: reg_type.RT_HL };
instructions[0xea] = { type: in_type.IN_LD, mode: addr_mode.AM_A16_R, reg_2: reg_type.RT_A };
instructions[0xee] = { type: in_type.IN_XOR, mode: addr_mode.AM_R_D8, reg_1: reg_type.RT_A };
instructions[0xef] = { type: in_type.IN_RST, mode: addr_mode.AM_IMP, param: 0x28 };

instructions[0xf0] = { type: in_type.IN_LDH, mode: addr_mode.AM_R_A8, reg_1: reg_type.RT_A };
instructions[0xf1] = { type: in_type.IN_POP, mode: addr_mode.AM_R, reg_1: reg_type.RT_AF };
instructions[0xf2] = { type: in_type.IN_LD, mode: addr_mode.AM_R_MR, reg_1: reg_type.RT_A, reg_2: reg_type.RT_C };
instructions[0xf5] = { type: in_type.IN_PUSH, mode: addr_mode.AM_R, reg_1: reg_type.RT_AF };
instructions[0xf6] = { type: in_type.IN_OR, mode: addr_mode.AM_R_D8, reg_1: reg_type.RT_A };
instructions[0xf7] = { type: in_type.IN_RST, mode: addr_mode.AM_IMP, param: 0x30 };
instructions[0xf8] = { type: in_type.IN_LD, mode: addr_mode.AM_HL_SPR, reg_1: reg_type.RT_HL, reg_2: reg_type.RT_SP };
instructions[0xf9] = { type: in_type.IN_LD, mode: addr_mode.AM_R_R, reg_1: reg_type.RT_SP, reg_2: reg_type.RT_HL };
instructions[0xfa] = { type: in_type.IN_LD, mode: addr_mode.AM_R_A16, reg_1: reg_type.RT_A };

// const instructions: Record<number, instruction> = {
//   0x00: { type: in_type.IN_NOP, mode: addr_mode.AM_IMP },
//   0x05: { type: in_type.IN_DEC, mode: addr_mode.AM_R, reg_1: reg_type.RT_B },
//   0x0e: { type: in_type.IN_LD, mode: addr_mode.AM_R_D8, reg_1: reg_type.RT_C },
//   0xaf: { type: in_type.IN_XOR, mode: addr_mode.AM_R, reg_1: reg_type.RT_A },
//   0xc3: { type: in_type.IN_JP, mode: addr_mode.AM_D16 },
//   0xf3: { type: in_type.IN_DI },
// };

// CB prefix opcodes - fill in when needed
const cb_instructions: instruction[] = new Array(0x100).fill(undefined);
for (let i = 0; i < 8; i++) {
  cb_instructions[i] = { type: in_type.IN_RLC, mode: addr_mode.AM_R };
  cb_instructions[i + 8] = { type: in_type.IN_RRC, mode: addr_mode.AM_R };
  cb_instructions[i + 16] = { type: in_type.IN_RL, mode: addr_mode.AM_R };
  cb_instructions[i + 24] = { type: in_type.IN_RR, mode: addr_mode.AM_R };
  cb_instructions[i + 32] = { type: in_type.IN_SLA, mode: addr_mode.AM_R };
  cb_instructions[i + 40] = { type: in_type.IN_SRA, mode: addr_mode.AM_R };
  cb_instructions[i + 48] = { type: in_type.IN_SWAP, mode: addr_mode.AM_R };
  cb_instructions[i + 56] = { type: in_type.IN_SRL, mode: addr_mode.AM_R };
}
for (let i = 0; i < 64; i++) {
  if (cb_instructions[i + 64] === undefined) {
    const bit = (i + 64) >> 3;
    cb_instructions[i + 64] = { type: in_type.IN_BIT, mode: addr_mode.AM_R };
  }
}
for (let i = 0; i < 64; i++) {
  if (cb_instructions[i + 128] === undefined) {
    cb_instructions[i + 128] = { type: in_type.IN_RES, mode: addr_mode.AM_R };
  }
}
for (let i = 0; i < 64; i++) {
  if (cb_instructions[i + 192] === undefined) {
    cb_instructions[i + 192] = { type: in_type.IN_SET, mode: addr_mode.AM_R };
  }
}

export function instruction_by_opcode(opcode: number): instruction {
  const inst = instructions[opcode];
  if (inst === undefined) {
    return { type: in_type.IN_NONE, mode: addr_mode.AM_IMP };
  }
  return inst;
}

export function cb_instruction_by_opcode(opcode: number): instruction {
  const inst = cb_instructions[opcode];
  if (inst === undefined) {
    return { type: in_type.IN_NONE, mode: addr_mode.AM_IMP };
  }
  return inst;
}

const inst_lookup: string[] = [
  "<NONE>",
  "NOP",
  "LD",
  "INC",
  "DEC",
  "RLCA",
  "ADD",
  "RRCA",
  "STOP",
  "RLA",
  "JR",
  "RRA",
  "DAA",
  "CPL",
  "SCF",
  "CCF",
  "HALT",
  "ADC",
  "SUB",
  "SBC",
  "AND",
  "XOR",
  "OR",
  "CP",
  "POP",
  "JP",
  "PUSH",
  "RET",
  "CB",
  "CALL",
  "RETI",
  "LDH",
  "JPHL",
  "DI",
  "EI",
  "RST",
  "IN_ERR",
  "IN_RLC",
  "IN_RRC",
  "IN_RL",
  "IN_RR",
  "IN_SLA",
  "IN_SRA",
  "IN_SWAP",
  "IN_SRL",
  "IN_BIT",
  "IN_RES",
  "IN_SET",
];

const instructionNames = Object.keys(in_type) as Array<InType>;
const instructionIndexMap = instructionNames.reduce((map, name, index) => {
  map[in_type[name as keyof typeof in_type]] = index;
  return map;
}, {} as { [key in InType]: number });

export function instruction_name(t: InType): string {
  const index = instructionIndexMap[t];
  return inst_lookup[index];
}
