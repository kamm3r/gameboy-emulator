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
instructions[0x05] = {
  type: in_type.IN_DEC,
  mode: addr_mode.AM_R,
  reg_1: reg_type.RT_B,
};
instructions[0x0e] = {
  type: in_type.IN_LD,
  mode: addr_mode.AM_R_D8,
  reg_1: reg_type.RT_C,
};
instructions[0xaf] = {
  type: in_type.IN_XOR,
  mode: addr_mode.AM_R,
  reg_1: reg_type.RT_A,
};
instructions[0xc3] = { type: in_type.IN_JP, mode: addr_mode.AM_D16 };
instructions[0xf3] = { type: in_type.IN_DI };

// const instructions: Record<number, instruction> = {
//   0x00: { type: in_type.IN_NOP, mode: addr_mode.AM_IMP },
//   0x05: { type: in_type.IN_DEC, mode: addr_mode.AM_R, reg_1: reg_type.RT_B },
//   0x0e: { type: in_type.IN_LD, mode: addr_mode.AM_R_D8, reg_1: reg_type.RT_C },
//   0xaf: { type: in_type.IN_XOR, mode: addr_mode.AM_R, reg_1: reg_type.RT_A },
//   0xc3: { type: in_type.IN_JP, mode: addr_mode.AM_D16 },
//   0xf3: { type: in_type.IN_DI },
// };

export function instruction_by_opcode(opcode: number): instruction {
  return instructions[opcode];
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
