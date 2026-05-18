export const enum InType {
  IN_NONE, IN_NOP, IN_LD, IN_LDH, IN_JP, IN_JR, IN_CALL, IN_RET, IN_RETI,
  IN_RST, IN_POP, IN_PUSH, IN_DEC, IN_INC, IN_ADD, IN_ADC, IN_SUB, IN_SBC,
  IN_AND, IN_XOR, IN_OR, IN_CP, IN_CPL, IN_DAA, IN_SCF, IN_CCF, IN_DI, IN_EI,
  IN_HALT, IN_STOP, IN_JPHL, IN_CB, IN_RLCA, IN_RRCA, IN_RLA, IN_RRA, IN_RLC, IN_RRC, IN_RL, IN_RR, IN_SLA,
  IN_SRA, IN_SWAP, IN_SRL, IN_BIT, IN_RES, IN_SET, IN_ERR,
}

export type RegType =
  | "RT_A" | "RT_F" | "RT_AF"
  | "RT_B" | "RT_C" | "RT_BC"
  | "RT_D" | "RT_E" | "RT_DE"
  | "RT_H" | "RT_L" | "RT_HL"
  | "RT_SP" | "RT_PC";

export type AddrMode =
  | "AM_IMP" | "AM_R" | "AM_R_D8" | "AM_R_D16" | "AM_R_R"
  | "AM_MR_R" | "AM_R_MR" | "AM_R_HLI" | "AM_R_HLD" | "AM_HLI_R"
  | "AM_HLD_R" | "AM_R_A8" | "AM_A8_R" | "AM_HL_SPR"
  | "AM_D16" | "AM_D8" | "AM_A16_R" | "AM_R_A16"
  | "AM_A16" | "AM_MR" | "AM_MR_D8" | "AM_C_R" | "AM_R_C";

export type CondType =
  | "CT_NONE" | "CT_C" | "CT_NC" | "CT_Z" | "CT_NZ";

export type instruction = {
  type: InType;
  mode: AddrMode;
  reg_1: RegType | null;
  reg_2: RegType | null;
  cond: CondType | null;
  param: number | null;
};

const RT_A: RegType = "RT_A";
const RT_F: RegType = "RT_F";
const RT_AF: RegType = "RT_AF";
const RT_B: RegType = "RT_B";
const RT_C: RegType = "RT_C";
const RT_BC: RegType = "RT_BC";
const RT_D: RegType = "RT_D";
const RT_E: RegType = "RT_E";
const RT_DE: RegType = "RT_DE";
const RT_H: RegType = "RT_H";
const RT_L: RegType = "RT_L";
const RT_HL: RegType = "RT_HL";
const RT_SP: RegType = "RT_SP";
const RT_PC: RegType = "RT_PC";

export const opcodes: instruction[] = [
  // 0x00
  { type: InType.IN_NOP, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_D16", reg_1: RT_BC, reg_2: null, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_MR_R", reg_1: RT_BC, reg_2: RT_A, cond: null, param: null },
  { type: InType.IN_INC, mode: "AM_R", reg_1: RT_BC, reg_2: null, cond: null, param: null },
  { type: InType.IN_INC, mode: "AM_R", reg_1: RT_B, reg_2: null, cond: null, param: null },
  { type: InType.IN_DEC, mode: "AM_R", reg_1: RT_B, reg_2: null, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_D8", reg_1: RT_B, reg_2: null, cond: null, param: null },
  { type: InType.IN_RLCA, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_A16_R", reg_1: RT_SP, reg_2: null, cond: null, param: null },
  { type: InType.IN_ADD, mode: "AM_R_R", reg_1: RT_HL, reg_2: RT_BC, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_MR", reg_1: RT_A, reg_2: RT_BC, cond: null, param: null },
  { type: InType.IN_DEC, mode: "AM_R", reg_1: RT_BC, reg_2: null, cond: null, param: null },
  { type: InType.IN_INC, mode: "AM_R", reg_1: RT_C, reg_2: null, cond: null, param: null },
  { type: InType.IN_DEC, mode: "AM_R", reg_1: RT_C, reg_2: null, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_D8", reg_1: RT_C, reg_2: null, cond: null, param: null },
  { type: InType.IN_RRCA, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: null },
  // 0x10
  { type: InType.IN_STOP, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_D16", reg_1: RT_DE, reg_2: null, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_MR_R", reg_1: RT_DE, reg_2: RT_A, cond: null, param: null },
  { type: InType.IN_INC, mode: "AM_R", reg_1: RT_DE, reg_2: null, cond: null, param: null },
  { type: InType.IN_INC, mode: "AM_R", reg_1: RT_D, reg_2: null, cond: null, param: null },
  { type: InType.IN_DEC, mode: "AM_R", reg_1: RT_D, reg_2: null, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_D8", reg_1: RT_D, reg_2: null, cond: null, param: null },
  { type: InType.IN_RLA, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: null },
  { type: InType.IN_JR, mode: "AM_D8", reg_1: null, reg_2: null, cond: null, param: null },
  { type: InType.IN_ADD, mode: "AM_R_R", reg_1: RT_HL, reg_2: RT_DE, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_MR", reg_1: RT_A, reg_2: RT_DE, cond: null, param: null },
  { type: InType.IN_DEC, mode: "AM_R", reg_1: RT_DE, reg_2: null, cond: null, param: null },
  { type: InType.IN_INC, mode: "AM_R", reg_1: RT_E, reg_2: null, cond: null, param: null },
  { type: InType.IN_DEC, mode: "AM_R", reg_1: RT_E, reg_2: null, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_D8", reg_1: RT_E, reg_2: null, cond: null, param: null },
  { type: InType.IN_RRA, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: null },
  // 0x20
  { type: InType.IN_JR, mode: "AM_D8", reg_1: null, reg_2: null, cond: "CT_NZ", param: null },
  { type: InType.IN_LD, mode: "AM_R_D16", reg_1: RT_HL, reg_2: null, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_HLI_R", reg_1: RT_HL, reg_2: RT_A, cond: null, param: null },
  { type: InType.IN_INC, mode: "AM_R", reg_1: RT_HL, reg_2: null, cond: null, param: null },
  { type: InType.IN_INC, mode: "AM_R", reg_1: RT_H, reg_2: null, cond: null, param: null },
  { type: InType.IN_DEC, mode: "AM_R", reg_1: RT_H, reg_2: null, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_D8", reg_1: RT_H, reg_2: null, cond: null, param: null },
  { type: InType.IN_DAA, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: null },
  { type: InType.IN_JR, mode: "AM_D8", reg_1: null, reg_2: null, cond: "CT_Z", param: null },
  { type: InType.IN_ADD, mode: "AM_R_R", reg_1: RT_HL, reg_2: RT_HL, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_HLI", reg_1: RT_A, reg_2: RT_HL, cond: null, param: null },
  { type: InType.IN_DEC, mode: "AM_R", reg_1: RT_HL, reg_2: null, cond: null, param: null },
  { type: InType.IN_INC, mode: "AM_R", reg_1: RT_L, reg_2: null, cond: null, param: null },
  { type: InType.IN_DEC, mode: "AM_R", reg_1: RT_L, reg_2: null, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_D8", reg_1: RT_L, reg_2: null, cond: null, param: null },
  { type: InType.IN_CPL, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: null },
  // 0x30
  { type: InType.IN_JR, mode: "AM_D8", reg_1: null, reg_2: null, cond: "CT_NC", param: null },
  { type: InType.IN_LD, mode: "AM_R_D16", reg_1: RT_SP, reg_2: null, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_HLD_R", reg_1: RT_HL, reg_2: RT_A, cond: null, param: null },
  { type: InType.IN_INC, mode: "AM_R", reg_1: RT_SP, reg_2: null, cond: null, param: null },
  { type: InType.IN_INC, mode: "AM_MR", reg_1: RT_HL, reg_2: null, cond: null, param: null },
  { type: InType.IN_DEC, mode: "AM_MR", reg_1: RT_HL, reg_2: null, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_MR_D8", reg_1: RT_HL, reg_2: null, cond: null, param: null },
  { type: InType.IN_SCF, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: null },
  { type: InType.IN_JR, mode: "AM_D8", reg_1: null, reg_2: null, cond: "CT_C", param: null },
  { type: InType.IN_ADD, mode: "AM_R_R", reg_1: RT_HL, reg_2: RT_SP, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_HLD", reg_1: RT_A, reg_2: RT_HL, cond: null, param: null },
  { type: InType.IN_DEC, mode: "AM_R", reg_1: RT_SP, reg_2: null, cond: null, param: null },
  { type: InType.IN_INC, mode: "AM_R", reg_1: RT_A, reg_2: null, cond: null, param: null },
  { type: InType.IN_DEC, mode: "AM_R", reg_1: RT_A, reg_2: null, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_D8", reg_1: RT_A, reg_2: null, cond: null, param: null },
  { type: InType.IN_CCF, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: null },
  // 0x40
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_B, reg_2: RT_B, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_B, reg_2: RT_C, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_B, reg_2: RT_D, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_B, reg_2: RT_E, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_B, reg_2: RT_H, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_B, reg_2: RT_L, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_MR", reg_1: RT_B, reg_2: RT_HL, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_B, reg_2: RT_A, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_C, reg_2: RT_B, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_C, reg_2: RT_C, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_C, reg_2: RT_D, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_C, reg_2: RT_E, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_C, reg_2: RT_H, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_C, reg_2: RT_L, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_MR", reg_1: RT_C, reg_2: RT_HL, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_C, reg_2: RT_A, cond: null, param: null },
  // 0x50
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_D, reg_2: RT_B, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_D, reg_2: RT_C, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_D, reg_2: RT_D, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_D, reg_2: RT_E, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_D, reg_2: RT_H, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_D, reg_2: RT_L, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_MR", reg_1: RT_D, reg_2: RT_HL, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_D, reg_2: RT_A, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_E, reg_2: RT_B, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_E, reg_2: RT_C, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_E, reg_2: RT_D, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_E, reg_2: RT_E, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_E, reg_2: RT_H, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_E, reg_2: RT_L, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_MR", reg_1: RT_E, reg_2: RT_HL, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_E, reg_2: RT_A, cond: null, param: null },
  // 0x60
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_H, reg_2: RT_B, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_H, reg_2: RT_C, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_H, reg_2: RT_D, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_H, reg_2: RT_E, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_H, reg_2: RT_H, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_H, reg_2: RT_L, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_MR", reg_1: RT_H, reg_2: RT_HL, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_H, reg_2: RT_A, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_L, reg_2: RT_B, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_L, reg_2: RT_C, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_L, reg_2: RT_D, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_L, reg_2: RT_E, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_L, reg_2: RT_H, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_L, reg_2: RT_L, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_MR", reg_1: RT_L, reg_2: RT_HL, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_L, reg_2: RT_A, cond: null, param: null },
  // 0x70
  { type: InType.IN_LD, mode: "AM_MR_R", reg_1: RT_HL, reg_2: RT_B, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_MR_R", reg_1: RT_HL, reg_2: RT_C, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_MR_R", reg_1: RT_HL, reg_2: RT_D, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_MR_R", reg_1: RT_HL, reg_2: RT_E, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_MR_R", reg_1: RT_HL, reg_2: RT_H, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_MR_R", reg_1: RT_HL, reg_2: RT_L, cond: null, param: null },
  { type: InType.IN_HALT, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_MR_R", reg_1: RT_HL, reg_2: RT_A, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_B, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_C, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_D, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_E, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_H, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_L, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_MR", reg_1: RT_A, reg_2: RT_HL, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_A, cond: null, param: null },
  // 0x80
  { type: InType.IN_ADD, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_B, cond: null, param: null },
  { type: InType.IN_ADD, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_C, cond: null, param: null },
  { type: InType.IN_ADD, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_D, cond: null, param: null },
  { type: InType.IN_ADD, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_E, cond: null, param: null },
  { type: InType.IN_ADD, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_H, cond: null, param: null },
  { type: InType.IN_ADD, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_L, cond: null, param: null },
  { type: InType.IN_ADD, mode: "AM_R_MR", reg_1: RT_A, reg_2: RT_HL, cond: null, param: null },
  { type: InType.IN_ADD, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_A, cond: null, param: null },
  { type: InType.IN_ADC, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_B, cond: null, param: null },
  { type: InType.IN_ADC, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_C, cond: null, param: null },
  { type: InType.IN_ADC, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_D, cond: null, param: null },
  { type: InType.IN_ADC, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_E, cond: null, param: null },
  { type: InType.IN_ADC, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_H, cond: null, param: null },
  { type: InType.IN_ADC, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_L, cond: null, param: null },
  { type: InType.IN_ADC, mode: "AM_R_MR", reg_1: RT_A, reg_2: RT_HL, cond: null, param: null },
  { type: InType.IN_ADC, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_A, cond: null, param: null },
  // 0x90
  { type: InType.IN_SUB, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_B, cond: null, param: null },
  { type: InType.IN_SUB, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_C, cond: null, param: null },
  { type: InType.IN_SUB, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_D, cond: null, param: null },
  { type: InType.IN_SUB, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_E, cond: null, param: null },
  { type: InType.IN_SUB, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_H, cond: null, param: null },
  { type: InType.IN_SUB, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_L, cond: null, param: null },
  { type: InType.IN_SUB, mode: "AM_R_MR", reg_1: RT_A, reg_2: RT_HL, cond: null, param: null },
  { type: InType.IN_SUB, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_A, cond: null, param: null },
  { type: InType.IN_SBC, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_B, cond: null, param: null },
  { type: InType.IN_SBC, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_C, cond: null, param: null },
  { type: InType.IN_SBC, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_D, cond: null, param: null },
  { type: InType.IN_SBC, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_E, cond: null, param: null },
  { type: InType.IN_SBC, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_H, cond: null, param: null },
  { type: InType.IN_SBC, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_L, cond: null, param: null },
  { type: InType.IN_SBC, mode: "AM_R_MR", reg_1: RT_A, reg_2: RT_HL, cond: null, param: null },
  { type: InType.IN_SBC, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_A, cond: null, param: null },
  // 0xA0
  { type: InType.IN_AND, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_B, cond: null, param: null },
  { type: InType.IN_AND, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_C, cond: null, param: null },
  { type: InType.IN_AND, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_D, cond: null, param: null },
  { type: InType.IN_AND, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_E, cond: null, param: null },
  { type: InType.IN_AND, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_H, cond: null, param: null },
  { type: InType.IN_AND, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_L, cond: null, param: null },
  { type: InType.IN_AND, mode: "AM_R_MR", reg_1: RT_A, reg_2: RT_HL, cond: null, param: null },
  { type: InType.IN_AND, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_A, cond: null, param: null },
  { type: InType.IN_XOR, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_B, cond: null, param: null },
  { type: InType.IN_XOR, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_C, cond: null, param: null },
  { type: InType.IN_XOR, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_D, cond: null, param: null },
  { type: InType.IN_XOR, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_E, cond: null, param: null },
  { type: InType.IN_XOR, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_H, cond: null, param: null },
  { type: InType.IN_XOR, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_L, cond: null, param: null },
  { type: InType.IN_XOR, mode: "AM_R_MR", reg_1: RT_A, reg_2: RT_HL, cond: null, param: null },
  { type: InType.IN_XOR, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_A, cond: null, param: null },
  // 0xB0
  { type: InType.IN_OR, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_B, cond: null, param: null },
  { type: InType.IN_OR, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_C, cond: null, param: null },
  { type: InType.IN_OR, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_D, cond: null, param: null },
  { type: InType.IN_OR, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_E, cond: null, param: null },
  { type: InType.IN_OR, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_H, cond: null, param: null },
  { type: InType.IN_OR, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_L, cond: null, param: null },
  { type: InType.IN_OR, mode: "AM_R_MR", reg_1: RT_A, reg_2: RT_HL, cond: null, param: null },
  { type: InType.IN_OR, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_A, cond: null, param: null },
  { type: InType.IN_CP, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_B, cond: null, param: null },
  { type: InType.IN_CP, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_C, cond: null, param: null },
  { type: InType.IN_CP, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_D, cond: null, param: null },
  { type: InType.IN_CP, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_E, cond: null, param: null },
  { type: InType.IN_CP, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_H, cond: null, param: null },
  { type: InType.IN_CP, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_L, cond: null, param: null },
  { type: InType.IN_CP, mode: "AM_R_MR", reg_1: RT_A, reg_2: RT_HL, cond: null, param: null },
  { type: InType.IN_CP, mode: "AM_R_R", reg_1: RT_A, reg_2: RT_A, cond: null, param: null },
  // 0xC0
  { type: InType.IN_RET, mode: "AM_IMP", reg_1: null, reg_2: null, cond: "CT_NZ", param: null },
  { type: InType.IN_POP, mode: "AM_R", reg_1: RT_BC, reg_2: null, cond: null, param: null },
  { type: InType.IN_JP, mode: "AM_A16", reg_1: null, reg_2: null, cond: "CT_NZ", param: null },
  { type: InType.IN_JP, mode: "AM_A16", reg_1: null, reg_2: null, cond: null, param: null },
  { type: InType.IN_CALL, mode: "AM_A16", reg_1: null, reg_2: null, cond: "CT_NZ", param: null },
  { type: InType.IN_PUSH, mode: "AM_R", reg_1: RT_BC, reg_2: null, cond: null, param: null },
  { type: InType.IN_ADD, mode: "AM_R_D8", reg_1: RT_A, reg_2: null, cond: null, param: null },
  { type: InType.IN_RST, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: 0x00 },
  { type: InType.IN_RET, mode: "AM_IMP", reg_1: null, reg_2: null, cond: "CT_Z", param: null },
  { type: InType.IN_RET, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: null },
  { type: InType.IN_JP, mode: "AM_A16", reg_1: null, reg_2: null, cond: "CT_Z", param: null },
  { type: InType.IN_CB, mode: "AM_D8", reg_1: null, reg_2: null, cond: null, param: null },
  { type: InType.IN_CALL, mode: "AM_A16", reg_1: null, reg_2: null, cond: "CT_Z", param: null },
  { type: InType.IN_CALL, mode: "AM_A16", reg_1: null, reg_2: null, cond: null, param: null },
  { type: InType.IN_ADC, mode: "AM_R_D8", reg_1: RT_A, reg_2: null, cond: null, param: null },
  { type: InType.IN_RST, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: 0x08 },
  // 0xD0
  { type: InType.IN_RET, mode: "AM_IMP", reg_1: null, reg_2: null, cond: "CT_NC", param: null },
  { type: InType.IN_POP, mode: "AM_R", reg_1: RT_DE, reg_2: null, cond: null, param: null },
  { type: InType.IN_JP, mode: "AM_A16", reg_1: null, reg_2: null, cond: "CT_NC", param: null },
  { type: InType.IN_NOP, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: null },
  { type: InType.IN_CALL, mode: "AM_A16", reg_1: null, reg_2: null, cond: "CT_NC", param: null },
  { type: InType.IN_PUSH, mode: "AM_R", reg_1: RT_DE, reg_2: null, cond: null, param: null },
  { type: InType.IN_SUB, mode: "AM_R_D8", reg_1: RT_A, reg_2: null, cond: null, param: null },
  { type: InType.IN_RST, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: 0x10 },
  { type: InType.IN_RET, mode: "AM_IMP", reg_1: null, reg_2: null, cond: "CT_C", param: null },
  { type: InType.IN_RETI, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: null },
  { type: InType.IN_JP, mode: "AM_A16", reg_1: null, reg_2: null, cond: "CT_C", param: null },
  { type: InType.IN_NOP, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: null },
  { type: InType.IN_CALL, mode: "AM_A16", reg_1: null, reg_2: null, cond: "CT_C", param: null },
  { type: InType.IN_CALL, mode: "AM_A16", reg_1: null, reg_2: null, cond: null, param: null },
  { type: InType.IN_SBC, mode: "AM_R_D8", reg_1: RT_A, reg_2: null, cond: null, param: null },
  { type: InType.IN_RST, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: 0x18 },
  // 0xE0
  { type: InType.IN_LDH, mode: "AM_A8_R", reg_1: null, reg_2: RT_A, cond: null, param: null },
  { type: InType.IN_POP, mode: "AM_R", reg_1: RT_HL, reg_2: null, cond: null, param: null },
  { type: InType.IN_LDH, mode: "AM_C_R", reg_1: null, reg_2: RT_A, cond: null, param: null },
  { type: InType.IN_NOP, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: null },
  { type: InType.IN_NOP, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: null },
  { type: InType.IN_PUSH, mode: "AM_R", reg_1: RT_HL, reg_2: null, cond: null, param: null },
  { type: InType.IN_AND, mode: "AM_R_D8", reg_1: RT_A, reg_2: null, cond: null, param: null },
  { type: InType.IN_RST, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: 0x20 },
  { type: InType.IN_ADD, mode: "AM_HL_SPR", reg_1: RT_HL, reg_2: RT_SP, cond: null, param: null },
  { type: InType.IN_JPHL, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_A16_R", reg_1: RT_A, reg_2: null, cond: null, param: null },
  { type: InType.IN_NOP, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: null },
  { type: InType.IN_NOP, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: null },
  { type: InType.IN_NOP, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: null },
  { type: InType.IN_XOR, mode: "AM_R_D8", reg_1: RT_A, reg_2: null, cond: null, param: null },
  { type: InType.IN_RST, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: 0x28 },
  // 0xF0
  { type: InType.IN_LDH, mode: "AM_R_A8", reg_1: RT_A, reg_2: null, cond: null, param: null },
  { type: InType.IN_POP, mode: "AM_R", reg_1: RT_AF, reg_2: null, cond: null, param: null },
  { type: InType.IN_LDH, mode: "AM_R_C", reg_1: RT_A, reg_2: null, cond: null, param: null },
  { type: InType.IN_DI, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: null },
  { type: InType.IN_NOP, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: null },
  { type: InType.IN_PUSH, mode: "AM_R", reg_1: RT_AF, reg_2: null, cond: null, param: null },
  { type: InType.IN_OR, mode: "AM_R_D8", reg_1: RT_A, reg_2: null, cond: null, param: null },
  { type: InType.IN_RST, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: 0x30 },
  { type: InType.IN_LD, mode: "AM_HL_SPR", reg_1: RT_HL, reg_2: RT_SP, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_R", reg_1: RT_SP, reg_2: RT_HL, cond: null, param: null },
  { type: InType.IN_LD, mode: "AM_R_A16", reg_1: RT_A, reg_2: null, cond: null, param: null },
  { type: InType.IN_EI, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: null },
  { type: InType.IN_NOP, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: null },
  { type: InType.IN_NOP, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: null },
  { type: InType.IN_CP, mode: "AM_R_D8", reg_1: RT_A, reg_2: null, cond: null, param: null },
  { type: InType.IN_RST, mode: "AM_IMP", reg_1: null, reg_2: null, cond: null, param: 0x38 },
];

export function instruction_by_opcode(opcode: number): instruction | null {
  return opcodes[opcode & 0xff] || null;
}

export function instruction_name(type: InType): string {
  const names: Record<number, string> = {
    [InType.IN_NONE]: "NONE",
    [InType.IN_NOP]: "NOP",
    [InType.IN_LD]: "LD",
    [InType.IN_LDH]: "LDH",
    [InType.IN_JP]: "JP",
    [InType.IN_JR]: "JR",
    [InType.IN_CALL]: "CALL",
    [InType.IN_RET]: "RET",
    [InType.IN_RETI]: "RETI",
    [InType.IN_RST]: "RST",
    [InType.IN_POP]: "POP",
    [InType.IN_PUSH]: "PUSH",
    [InType.IN_DEC]: "DEC",
    [InType.IN_INC]: "INC",
    [InType.IN_ADD]: "ADD",
    [InType.IN_ADC]: "ADC",
    [InType.IN_SUB]: "SUB",
    [InType.IN_SBC]: "SBC",
    [InType.IN_AND]: "AND",
    [InType.IN_XOR]: "XOR",
    [InType.IN_OR]: "OR",
    [InType.IN_CP]: "CP",
    [InType.IN_CPL]: "CPL",
    [InType.IN_DAA]: "DAA",
    [InType.IN_SCF]: "SCF",
    [InType.IN_CCF]: "CCF",
    [InType.IN_DI]: "DI",
    [InType.IN_EI]: "EI",
    [InType.IN_HALT]: "HALT",
    [InType.IN_STOP]: "STOP",
    [InType.IN_JPHL]: "JP_HL",
    [InType.IN_CB]: "CB",
    [InType.IN_RLC]: "RLC",
    [InType.IN_RRC]: "RRC",
    [InType.IN_RL]: "RL",
    [InType.IN_RR]: "RR",
    [InType.IN_SLA]: "SLA",
    [InType.IN_SRA]: "SRA",
    [InType.IN_SWAP]: "SWAP",
    [InType.IN_SRL]: "SRL",
    [InType.IN_BIT]: "BIT",
    [InType.IN_RES]: "RES",
    [InType.IN_SET]: "SET",
    [InType.IN_ERR]: "ERR",
  };
  return names[type] || "???";
}

const rt_lookup: RegType[] = [
  RT_B, RT_C, RT_D, RT_E, RT_H, RT_L, RT_HL, RT_A,
];

export function decode_reg(reg: number): RegType {
  return rt_lookup[reg & 7];
}
