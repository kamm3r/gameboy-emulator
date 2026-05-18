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

const instructions: Array<instruction | undefined> = new Array(0x100).fill(
  undefined,
);

instructions[0x00] = { type: in_type.IN_NOP, mode: addr_mode.AM_IMP };
instructions[0x01] = {
  type: in_type.IN_LD,
  mode: addr_mode.AM_R_D16,
  reg_1: reg_type.RT_BC,
};
instructions[0x02] = {
  type: in_type.IN_LD,
  mode: addr_mode.AM_MR_R,
  reg_1: reg_type.RT_BC,
  reg_2: reg_type.RT_A,
};
instructions[0x03] = {
  type: in_type.IN_INC,
  mode: addr_mode.AM_R,
  reg_1: reg_type.RT_BC,
};
instructions[0x04] = {
  type: in_type.IN_INC,
  mode: addr_mode.AM_R,
  reg_1: reg_type.RT_B,
};
instructions[0x05] = {
  type: in_type.IN_DEC,
  mode: addr_mode.AM_R,
  reg_1: reg_type.RT_B,
};
instructions[0x06] = {
  type: in_type.IN_LD,
  mode: addr_mode.AM_R_D8,
  reg_1: reg_type.RT_B,
};
instructions[0x07] = { type: in_type.IN_RLCA, mode: addr_mode.AM_IMP };
instructions[0x08] = {
  type: in_type.IN_LD,
  mode: addr_mode.AM_A16_R,
  reg_2: reg_type.RT_SP,
};
instructions[0x09] = {
  type: in_type.IN_ADD,
  mode: addr_mode.AM_R_R,
  reg_1: reg_type.RT_HL,
  reg_2: reg_type.RT_BC,
};
instructions[0x0a] = {
  type: in_type.IN_LD,
  mode: addr_mode.AM_R_MR,
  reg_1: reg_type.RT_A,
  reg_2: reg_type.RT_BC,
};
instructions[0x0b] = {
  type: in_type.IN_DEC,
  mode: addr_mode.AM_R,
  reg_1: reg_type.RT_BC,
};
instructions[0x0c] = {
  type: in_type.IN_INC,
  mode: addr_mode.AM_R,
  reg_1: reg_type.RT_C,
};
instructions[0x0d] = {
  type: in_type.IN_DEC,
  mode: addr_mode.AM_R,
  reg_1: reg_type.RT_C,
};
instructions[0x0e] = {
  type: in_type.IN_LD,
  mode: addr_mode.AM_R_D8,
  reg_1: reg_type.RT_C,
};
instructions[0x0f] = { type: in_type.IN_RRCA, mode: addr_mode.AM_IMP };

// 0x1x
instructions[0x10] = { type: in_type.IN_STOP, mode: addr_mode.AM_IMP };
instructions[0x11] = {
  type: in_type.IN_LD,
  mode: addr_mode.AM_R_D16,
  reg_1: reg_type.RT_DE,
};
instructions[0x12] = {
  type: in_type.IN_LD,
  mode: addr_mode.AM_MR_R,
  reg_1: reg_type.RT_DE,
  reg_2: reg_type.RT_A,
};
instructions[0x13] = {
  type: in_type.IN_INC,
  mode: addr_mode.AM_R,
  reg_1: reg_type.RT_DE,
};
instructions[0x14] = {
  type: in_type.IN_INC,
  mode: addr_mode.AM_R,
  reg_1: reg_type.RT_D,
};
instructions[0x15] = {
  type: in_type.IN_DEC,
  mode: addr_mode.AM_R,
  reg_1: reg_type.RT_D,
};
instructions[0x16] = {
  type: in_type.IN_LD,
  mode: addr_mode.AM_R_D8,
  reg_1: reg_type.RT_D,
};
instructions[0x17] = { type: in_type.IN_RLA, mode: addr_mode.AM_IMP };
instructions[0x18] = { type: in_type.IN_JR, mode: addr_mode.AM_D8 };
instructions[0x19] = {
  type: in_type.IN_ADD,
  mode: addr_mode.AM_R_R,
  reg_1: reg_type.RT_HL,
  reg_2: reg_type.RT_DE,
};
instructions[0x1a] = {
  type: in_type.IN_LD,
  mode: addr_mode.AM_R_MR,
  reg_1: reg_type.RT_A,
  reg_2: reg_type.RT_DE,
};
instructions[0x1b] = {
  type: in_type.IN_DEC,
  mode: addr_mode.AM_R,
  reg_1: reg_type.RT_DE,
};
instructions[0x1c] = {
  type: in_type.IN_INC,
  mode: addr_mode.AM_R,
  reg_1: reg_type.RT_E,
};
instructions[0x1d] = {
  type: in_type.IN_DEC,
  mode: addr_mode.AM_R,
  reg_1: reg_type.RT_E,
};
instructions[0x1e] = {
  type: in_type.IN_LD,
  mode: addr_mode.AM_R_D8,
  reg_1: reg_type.RT_E,
};
instructions[0x1f] = { type: in_type.IN_RRA, mode: addr_mode.AM_IMP };

// 0x2x
instructions[0x20] = {
  type: in_type.IN_JR,
  mode: addr_mode.AM_D8,
  cond: cond_type.CT_NZ,
};
instructions[0x21] = {
  type: in_type.IN_LD,
  mode: addr_mode.AM_R_D16,
  reg_1: reg_type.RT_HL,
};
instructions[0x22] = {
  type: in_type.IN_LD,
  mode: addr_mode.AM_HLI_R,
  reg_1: reg_type.RT_HL,
  reg_2: reg_type.RT_A,
};
instructions[0x23] = {
  type: in_type.IN_INC,
  mode: addr_mode.AM_R,
  reg_1: reg_type.RT_HL,
};
instructions[0x24] = {
  type: in_type.IN_INC,
  mode: addr_mode.AM_R,
  reg_1: reg_type.RT_H,
};
instructions[0x25] = {
  type: in_type.IN_DEC,
  mode: addr_mode.AM_R,
  reg_1: reg_type.RT_H,
};
instructions[0x26] = {
  type: in_type.IN_LD,
  mode: addr_mode.AM_R_D8,
  reg_1: reg_type.RT_H,
};
instructions[0x27] = { type: in_type.IN_DAA, mode: addr_mode.AM_IMP };
instructions[0x28] = {
  type: in_type.IN_JR,
  mode: addr_mode.AM_D8,
  cond: cond_type.CT_Z,
};
instructions[0x29] = {
  type: in_type.IN_ADD,
  mode: addr_mode.AM_R_R,
  reg_1: reg_type.RT_HL,
  reg_2: reg_type.RT_HL,
};
instructions[0x2a] = {
  type: in_type.IN_LD,
  mode: addr_mode.AM_R_HLI,
  reg_1: reg_type.RT_A,
  reg_2: reg_type.RT_HL,
};
instructions[0x2b] = {
  type: in_type.IN_DEC,
  mode: addr_mode.AM_R,
  reg_1: reg_type.RT_HL,
};
instructions[0x2c] = {
  type: in_type.IN_INC,
  mode: addr_mode.AM_R,
  reg_1: reg_type.RT_L,
};
instructions[0x2d] = {
  type: in_type.IN_DEC,
  mode: addr_mode.AM_R,
  reg_1: reg_type.RT_L,
};
instructions[0x2e] = {
  type: in_type.IN_LD,
  mode: addr_mode.AM_R_D8,
  reg_1: reg_type.RT_L,
};
instructions[0x2f] = { type: in_type.IN_CPL, mode: addr_mode.AM_IMP };

// 0x3x
instructions[0x30] = {
  type: in_type.IN_JR,
  mode: addr_mode.AM_D8,
  cond: cond_type.CT_NC,
};
instructions[0x31] = {
  type: in_type.IN_LD,
  mode: addr_mode.AM_R_D16,
  reg_1: reg_type.RT_SP,
};
instructions[0x32] = {
  type: in_type.IN_LD,
  mode: addr_mode.AM_HLD_R,
  reg_1: reg_type.RT_HL,
  reg_2: reg_type.RT_A,
};
instructions[0x33] = {
  type: in_type.IN_INC,
  mode: addr_mode.AM_R,
  reg_1: reg_type.RT_SP,
};
instructions[0x34] = {
  type: in_type.IN_INC,
  mode: addr_mode.AM_MR,
  reg_1: reg_type.RT_HL,
};
instructions[0x35] = {
  type: in_type.IN_DEC,
  mode: addr_mode.AM_MR,
  reg_1: reg_type.RT_HL,
};
instructions[0x36] = {
  type: in_type.IN_LD,
  mode: addr_mode.AM_MR_D8,
  reg_1: reg_type.RT_HL,
};
instructions[0x37] = { type: in_type.IN_SCF, mode: addr_mode.AM_IMP };
instructions[0x38] = {
  type: in_type.IN_JR,
  mode: addr_mode.AM_D8,
  cond: cond_type.CT_C,
};
instructions[0x39] = {
  type: in_type.IN_ADD,
  mode: addr_mode.AM_R_R,
  reg_1: reg_type.RT_HL,
  reg_2: reg_type.RT_SP,
};
instructions[0x3a] = {
  type: in_type.IN_LD,
  mode: addr_mode.AM_R_HLD,
  reg_1: reg_type.RT_A,
  reg_2: reg_type.RT_HL,
};
instructions[0x3b] = {
  type: in_type.IN_DEC,
  mode: addr_mode.AM_R,
  reg_1: reg_type.RT_SP,
};
instructions[0x3c] = {
  type: in_type.IN_INC,
  mode: addr_mode.AM_R,
  reg_1: reg_type.RT_A,
};
instructions[0x3d] = {
  type: in_type.IN_DEC,
  mode: addr_mode.AM_R,
  reg_1: reg_type.RT_A,
};
instructions[0x3e] = {
  type: in_type.IN_LD,
  mode: addr_mode.AM_R_D8,
  reg_1: reg_type.RT_A,
};
instructions[0x3f] = { type: in_type.IN_CCF, mode: addr_mode.AM_IMP };

const regs = [
  reg_type.RT_B,
  reg_type.RT_C,
  reg_type.RT_D,
  reg_type.RT_E,
  reg_type.RT_H,
  reg_type.RT_L,
  reg_type.RT_HL,
  reg_type.RT_A,
] as const;

// 0x4x - 0x7x
for (let i = 0; i < 8; i++) {
  for (let j = 0; j < 8; j++) {
    const opcode = 0x40 + i * 8 + j;
    const dst = regs[i];
    const src = regs[j];

    if (opcode === 0x76) {
      instructions[opcode] = {
        type: in_type.IN_HALT,
        mode: addr_mode.AM_IMP,
      };
      continue;
    }

    if (dst === reg_type.RT_HL) {
      instructions[opcode] = {
        type: in_type.IN_LD,
        mode: addr_mode.AM_MR_R,
        reg_1: reg_type.RT_HL,
        reg_2: src,
      };
    } else if (src === reg_type.RT_HL) {
      instructions[opcode] = {
        type: in_type.IN_LD,
        mode: addr_mode.AM_R_MR,
        reg_1: dst,
        reg_2: reg_type.RT_HL,
      };
    } else {
      instructions[opcode] = {
        type: in_type.IN_LD,
        mode: addr_mode.AM_R_R,
        reg_1: dst,
        reg_2: src,
      };
    }
  }
}

// 0x8x - 0xbf
const alu_ops = [
  in_type.IN_ADD,
  in_type.IN_ADC,
  in_type.IN_SUB,
  in_type.IN_SBC,
  in_type.IN_AND,
  in_type.IN_XOR,
  in_type.IN_OR,
  in_type.IN_CP,
] as const;

for (let group = 0; group < alu_ops.length; group++) {
  for (let i = 0; i < 8; i++) {
    const opcode = 0x80 + group * 8 + i;
    const src = regs[i];

    instructions[opcode] = {
      type: alu_ops[group],
      mode:
        src === reg_type.RT_HL ? addr_mode.AM_R_MR : addr_mode.AM_R_R,
      reg_1: reg_type.RT_A,
      reg_2: src,
    };
  }
}

// 0xc0 - 0xcf
instructions[0xc0] = {
  type: in_type.IN_RET,
  mode: addr_mode.AM_IMP,
  cond: cond_type.CT_NZ,
};
instructions[0xc1] = {
  type: in_type.IN_POP,
  mode: addr_mode.AM_R,
  reg_1: reg_type.RT_BC,
};
instructions[0xc2] = {
  type: in_type.IN_JP,
  mode: addr_mode.AM_D16,
  cond: cond_type.CT_NZ,
};
instructions[0xc3] = { type: in_type.IN_JP, mode: addr_mode.AM_D16 };
instructions[0xc4] = {
  type: in_type.IN_CALL,
  mode: addr_mode.AM_D16,
  cond: cond_type.CT_NZ,
};
instructions[0xc5] = {
  type: in_type.IN_PUSH,
  mode: addr_mode.AM_R,
  reg_1: reg_type.RT_BC,
};
instructions[0xc6] = {
  type: in_type.IN_ADD,
  mode: addr_mode.AM_R_D8,
  reg_1: reg_type.RT_A,
};
instructions[0xc7] = {
  type: in_type.IN_RST,
  mode: addr_mode.AM_IMP,
  param: 0x00,
};
instructions[0xc8] = {
  type: in_type.IN_RET,
  mode: addr_mode.AM_IMP,
  cond: cond_type.CT_Z,
};
instructions[0xc9] = { type: in_type.IN_RET, mode: addr_mode.AM_IMP };
instructions[0xca] = {
  type: in_type.IN_JP,
  mode: addr_mode.AM_D16,
  cond: cond_type.CT_Z,
};
instructions[0xcb] = { type: in_type.IN_CB, mode: addr_mode.AM_D8 };
instructions[0xcc] = {
  type: in_type.IN_CALL,
  mode: addr_mode.AM_D16,
  cond: cond_type.CT_Z,
};
instructions[0xcd] = { type: in_type.IN_CALL, mode: addr_mode.AM_D16 };
instructions[0xce] = {
  type: in_type.IN_ADC,
  mode: addr_mode.AM_R_D8,
  reg_1: reg_type.RT_A,
};
instructions[0xcf] = {
  type: in_type.IN_RST,
  mode: addr_mode.AM_IMP,
  param: 0x08,
};

// 0xd0 - 0xdf
instructions[0xd0] = {
  type: in_type.IN_RET,
  mode: addr_mode.AM_IMP,
  cond: cond_type.CT_NC,
};
instructions[0xd1] = {
  type: in_type.IN_POP,
  mode: addr_mode.AM_R,
  reg_1: reg_type.RT_DE,
};
instructions[0xd2] = {
  type: in_type.IN_JP,
  mode: addr_mode.AM_D16,
  cond: cond_type.CT_NC,
};
instructions[0xd3] = { type: in_type.IN_NONE, mode: addr_mode.AM_IMP };
instructions[0xd4] = {
  type: in_type.IN_CALL,
  mode: addr_mode.AM_D16,
  cond: cond_type.CT_NC,
};
instructions[0xd5] = {
  type: in_type.IN_PUSH,
  mode: addr_mode.AM_R,
  reg_1: reg_type.RT_DE,
};
instructions[0xd6] = {
  type: in_type.IN_SUB,
  mode: addr_mode.AM_R_D8,
  reg_1: reg_type.RT_A,
};
instructions[0xd7] = {
  type: in_type.IN_RST,
  mode: addr_mode.AM_IMP,
  param: 0x10,
};
instructions[0xd8] = {
  type: in_type.IN_RET,
  mode: addr_mode.AM_IMP,
  cond: cond_type.CT_C,
};
instructions[0xd9] = { type: in_type.IN_RETI, mode: addr_mode.AM_IMP };
instructions[0xda] = {
  type: in_type.IN_JP,
  mode: addr_mode.AM_D16,
  cond: cond_type.CT_C,
};
instructions[0xdb] = { type: in_type.IN_NONE, mode: addr_mode.AM_IMP };
instructions[0xdc] = {
  type: in_type.IN_CALL,
  mode: addr_mode.AM_D16,
  cond: cond_type.CT_C,
};
instructions[0xdd] = { type: in_type.IN_NONE, mode: addr_mode.AM_IMP };
instructions[0xde] = {
  type: in_type.IN_SBC,
  mode: addr_mode.AM_R_D8,
  reg_1: reg_type.RT_A,
};
instructions[0xdf] = {
  type: in_type.IN_RST,
  mode: addr_mode.AM_IMP,
  param: 0x18,
};

// 0xe0 - 0xef
instructions[0xe0] = {
  type: in_type.IN_LDH,
  mode: addr_mode.AM_A8_R,
  reg_2: reg_type.RT_A,
};
instructions[0xe1] = {
  type: in_type.IN_POP,
  mode: addr_mode.AM_R,
  reg_1: reg_type.RT_HL,
};
instructions[0xe2] = {
  type: in_type.IN_LD,
  mode: addr_mode.AM_MR_R,
  reg_1: reg_type.RT_C,
  reg_2: reg_type.RT_A,
};
instructions[0xe3] = { type: in_type.IN_NONE, mode: addr_mode.AM_IMP };
instructions[0xe4] = { type: in_type.IN_NONE, mode: addr_mode.AM_IMP };
instructions[0xe5] = {
  type: in_type.IN_PUSH,
  mode: addr_mode.AM_R,
  reg_1: reg_type.RT_HL,
};
instructions[0xe6] = {
  type: in_type.IN_AND,
  mode: addr_mode.AM_R_D8,
  reg_1: reg_type.RT_A,
};
instructions[0xe7] = {
  type: in_type.IN_RST,
  mode: addr_mode.AM_IMP,
  param: 0x20,
};
instructions[0xe8] = {
  type: in_type.IN_ADD,
  mode: addr_mode.AM_R_D8,
  reg_1: reg_type.RT_SP,
};
instructions[0xe9] = {
  type: in_type.IN_JP,
  mode: addr_mode.AM_R,
  reg_1: reg_type.RT_HL,
};
instructions[0xea] = {
  type: in_type.IN_LD,
  mode: addr_mode.AM_A16_R,
  reg_2: reg_type.RT_A,
};
instructions[0xeb] = { type: in_type.IN_NONE, mode: addr_mode.AM_IMP };
instructions[0xec] = { type: in_type.IN_NONE, mode: addr_mode.AM_IMP };
instructions[0xed] = { type: in_type.IN_NONE, mode: addr_mode.AM_IMP };
instructions[0xee] = {
  type: in_type.IN_XOR,
  mode: addr_mode.AM_R_D8,
  reg_1: reg_type.RT_A,
};
instructions[0xef] = {
  type: in_type.IN_RST,
  mode: addr_mode.AM_IMP,
  param: 0x28,
};

// 0xf0 - 0xff
instructions[0xf0] = {
  type: in_type.IN_LDH,
  mode: addr_mode.AM_R_A8,
  reg_1: reg_type.RT_A,
};
instructions[0xf1] = {
  type: in_type.IN_POP,
  mode: addr_mode.AM_R,
  reg_1: reg_type.RT_AF,
};
instructions[0xf2] = {
  type: in_type.IN_LD,
  mode: addr_mode.AM_R_MR,
  reg_1: reg_type.RT_A,
  reg_2: reg_type.RT_C,
};
instructions[0xf3] = { type: in_type.IN_DI, mode: addr_mode.AM_IMP };
instructions[0xf4] = { type: in_type.IN_NONE, mode: addr_mode.AM_IMP };
instructions[0xf5] = {
  type: in_type.IN_PUSH,
  mode: addr_mode.AM_R,
  reg_1: reg_type.RT_AF,
};
instructions[0xf6] = {
  type: in_type.IN_OR,
  mode: addr_mode.AM_R_D8,
  reg_1: reg_type.RT_A,
};
instructions[0xf7] = {
  type: in_type.IN_RST,
  mode: addr_mode.AM_IMP,
  param: 0x30,
};
instructions[0xf8] = {
  type: in_type.IN_LD,
  mode: addr_mode.AM_HL_SPR,
  reg_1: reg_type.RT_HL,
  reg_2: reg_type.RT_SP,
};
instructions[0xf9] = {
  type: in_type.IN_LD,
  mode: addr_mode.AM_R_R,
  reg_1: reg_type.RT_SP,
  reg_2: reg_type.RT_HL,
};
instructions[0xfa] = {
  type: in_type.IN_LD,
  mode: addr_mode.AM_R_A16,
  reg_1: reg_type.RT_A,
};
instructions[0xfb] = { type: in_type.IN_EI, mode: addr_mode.AM_IMP };
instructions[0xfc] = { type: in_type.IN_NONE, mode: addr_mode.AM_IMP };
instructions[0xfd] = { type: in_type.IN_NONE, mode: addr_mode.AM_IMP };
instructions[0xfe] = {
  type: in_type.IN_CP,
  mode: addr_mode.AM_R_D8,
  reg_1: reg_type.RT_A,
};
instructions[0xff] = {
  type: in_type.IN_RST,
  mode: addr_mode.AM_IMP,
  param: 0x38,
};

const cb_instructions: Array<instruction | undefined> = new Array(0x100).fill(
  undefined,
);

export function instruction_by_opcode(opcode: number): instruction {
  const inst = instructions[opcode & 0xff];

  if (inst === undefined) {
    return { type: in_type.IN_NONE, mode: addr_mode.AM_IMP };
  }

  return inst;
}

export function cb_instruction_by_opcode(opcode: number): instruction {
  const inst = cb_instructions[opcode & 0xff];

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

const instruction_name_map: Record<InType, string> = {
  IN_NONE: "<NONE>",
  IN_NOP: "NOP",
  IN_LD: "LD",
  IN_INC: "INC",
  IN_DEC: "DEC",
  IN_RLCA: "RLCA",
  IN_ADD: "ADD",
  IN_RRCA: "RRCA",
  IN_STOP: "STOP",
  IN_RLA: "RLA",
  IN_JR: "JR",
  IN_RRA: "RRA",
  IN_DAA: "DAA",
  IN_CPL: "CPL",
  IN_SCF: "SCF",
  IN_CCF: "CCF",
  IN_HALT: "HALT",
  IN_ADC: "ADC",
  IN_SUB: "SUB",
  IN_SBC: "SBC",
  IN_AND: "AND",
  IN_XOR: "XOR",
  IN_OR: "OR",
  IN_CP: "CP",
  IN_POP: "POP",
  IN_JP: "JP",
  IN_PUSH: "PUSH",
  IN_RET: "RET",
  IN_CB: "CB",
  IN_CALL: "CALL",
  IN_RETI: "RETI",
  IN_LDH: "LDH",
  IN_JPHL: "JPHL",
  IN_DI: "DI",
  IN_EI: "EI",
  IN_RST: "RST",
  IN_ERR: "IN_ERR",
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
};

export function instruction_name(t: InType): string {
  return instruction_name_map[t];
}