export type AddrMode =
  | "AM_IMP" | "AM_R_D16" | "AM_R_R" | "AM_MR_R" | "AM_R" | "AM_R_D8"
  | "AM_R_MR" | "AM_R_HLI" | "AM_R_HLD" | "AM_HLI_R" | "AM_HLD_R" | "AM_R_A8"
  | "AM_A8_R" | "AM_HL_SPR" | "AM_D16" | "AM_D8" | "AM_D16_R" | "AM_MR_D8"
  | "AM_MR" | "AM_A16_R" | "AM_R_A16";

export type RegType =
  | "RT_NONE" | "RT_A" | "RT_F" | "RT_B" | "RT_C" | "RT_D" | "RT_E" | "RT_H"
  | "RT_L" | "RT_AF" | "RT_BC" | "RT_DE" | "RT_HL" | "RT_SP" | "RT_PC";

export type InType =
  | "IN_NONE" | "IN_NOP" | "IN_LD" | "IN_INC" | "IN_DEC" | "IN_RLCA" | "IN_ADD"
  | "IN_RRCA" | "IN_STOP" | "IN_RLA" | "IN_JR" | "IN_RRA" | "IN_DAA" | "IN_CPL"
  | "IN_SCF" | "IN_CCF" | "IN_HALT" | "IN_ADC" | "IN_SUB" | "IN_SBC" | "IN_AND"
  | "IN_XOR" | "IN_OR" | "IN_CP" | "IN_POP" | "IN_JP" | "IN_PUSH" | "IN_RET"
  | "IN_CB" | "IN_CALL" | "IN_RETI" | "IN_LDH" | "IN_DI" | "IN_EI" | "IN_RST";

export type CondType = "CT_NONE" | "CT_NZ" | "CT_Z" | "CT_NC" | "CT_C";

export type instruction = {
  type: InType;
  mode: AddrMode;
  reg_1?: RegType;
  reg_2?: RegType;
  cond?: CondType;
  param?: number;
};

const NONE: instruction = { type: "IN_NONE", mode: "AM_IMP" };
const instructions: instruction[] = new Array(0x100).fill(NONE);

function op(
  opcode: number,
  type: InType,
  mode: AddrMode,
  reg_1?: RegType,
  reg_2?: RegType,
  cond?: CondType,
  param?: number,
): void {
  instructions[opcode] = { type, mode, reg_1, reg_2, cond, param };
}

// prettier-ignore
{
  op(0x00, "IN_NOP", "AM_IMP");
  op(0x01, "IN_LD", "AM_R_D16", "RT_BC");
  op(0x02, "IN_LD", "AM_MR_R", "RT_BC", "RT_A");
  op(0x03, "IN_INC", "AM_R", "RT_BC");
  op(0x04, "IN_INC", "AM_R", "RT_B");
  op(0x05, "IN_DEC", "AM_R", "RT_B");
  op(0x06, "IN_LD", "AM_R_D8", "RT_B");
  op(0x07, "IN_RLCA", "AM_IMP");
  op(0x08, "IN_LD", "AM_A16_R", undefined, "RT_SP");
  op(0x09, "IN_ADD", "AM_R_R", "RT_HL", "RT_BC");
  op(0x0a, "IN_LD", "AM_R_MR", "RT_A", "RT_BC");
  op(0x0b, "IN_DEC", "AM_R", "RT_BC");
  op(0x0c, "IN_INC", "AM_R", "RT_C");
  op(0x0d, "IN_DEC", "AM_R", "RT_C");
  op(0x0e, "IN_LD", "AM_R_D8", "RT_C");
  op(0x0f, "IN_RRCA", "AM_IMP");
  op(0x10, "IN_STOP", "AM_IMP");
  op(0x11, "IN_LD", "AM_R_D16", "RT_DE");
  op(0x12, "IN_LD", "AM_MR_R", "RT_DE", "RT_A");
  op(0x13, "IN_INC", "AM_R", "RT_DE");
  op(0x14, "IN_INC", "AM_R", "RT_D");
  op(0x15, "IN_DEC", "AM_R", "RT_D");
  op(0x16, "IN_LD", "AM_R_D8", "RT_D");
  op(0x17, "IN_RLA", "AM_IMP");
  op(0x18, "IN_JR", "AM_D8");
  op(0x19, "IN_ADD", "AM_R_R", "RT_HL", "RT_DE");
  op(0x1a, "IN_LD", "AM_R_MR", "RT_A", "RT_DE");
  op(0x1b, "IN_DEC", "AM_R", "RT_DE");
  op(0x1c, "IN_INC", "AM_R", "RT_E");
  op(0x1d, "IN_DEC", "AM_R", "RT_E");
  op(0x1e, "IN_LD", "AM_R_D8", "RT_E");
  op(0x1f, "IN_RRA", "AM_IMP");
  op(0x20, "IN_JR", "AM_D8", undefined, undefined, "CT_NZ");
  op(0x21, "IN_LD", "AM_R_D16", "RT_HL");
  op(0x22, "IN_LD", "AM_HLI_R", "RT_HL", "RT_A");
  op(0x23, "IN_INC", "AM_R", "RT_HL");
  op(0x24, "IN_INC", "AM_R", "RT_H");
  op(0x25, "IN_DEC", "AM_R", "RT_H");
  op(0x26, "IN_LD", "AM_R_D8", "RT_H");
  op(0x27, "IN_DAA", "AM_IMP");
  op(0x28, "IN_JR", "AM_D8", undefined, undefined, "CT_Z");
  op(0x29, "IN_ADD", "AM_R_R", "RT_HL", "RT_HL");
  op(0x2a, "IN_LD", "AM_R_HLI", "RT_A", "RT_HL");
  op(0x2b, "IN_DEC", "AM_R", "RT_HL");
  op(0x2c, "IN_INC", "AM_R", "RT_L");
  op(0x2d, "IN_DEC", "AM_R", "RT_L");
  op(0x2e, "IN_LD", "AM_R_D8", "RT_L");
  op(0x2f, "IN_CPL", "AM_IMP");
  op(0x30, "IN_JR", "AM_D8", undefined, undefined, "CT_NC");
  op(0x31, "IN_LD", "AM_R_D16", "RT_SP");
  op(0x32, "IN_LD", "AM_HLD_R", "RT_HL", "RT_A");
  op(0x33, "IN_INC", "AM_R", "RT_SP");
  op(0x34, "IN_INC", "AM_MR", "RT_HL");
  op(0x35, "IN_DEC", "AM_MR", "RT_HL");
  op(0x36, "IN_LD", "AM_MR_D8", "RT_HL");
  op(0x37, "IN_SCF", "AM_IMP");
  op(0x38, "IN_JR", "AM_D8", undefined, undefined, "CT_C");
  op(0x39, "IN_ADD", "AM_R_R", "RT_HL", "RT_SP");
  op(0x3a, "IN_LD", "AM_R_HLD", "RT_A", "RT_HL");
  op(0x3b, "IN_DEC", "AM_R", "RT_SP");
  op(0x3c, "IN_INC", "AM_R", "RT_A");
  op(0x3d, "IN_DEC", "AM_R", "RT_A");
  op(0x3e, "IN_LD", "AM_R_D8", "RT_A");
  op(0x3f, "IN_CCF", "AM_IMP");
  op(0xc0, "IN_RET", "AM_IMP", undefined, undefined, "CT_NZ");
  op(0xc1, "IN_POP", "AM_R", "RT_BC");
  op(0xc2, "IN_JP", "AM_D16", undefined, undefined, "CT_NZ");
  op(0xc3, "IN_JP", "AM_D16");
  op(0xc4, "IN_CALL", "AM_D16", undefined, undefined, "CT_NZ");
  op(0xc5, "IN_PUSH", "AM_R", "RT_BC");
  op(0xc6, "IN_ADD", "AM_R_D8", "RT_A");
  op(0xc7, "IN_RST", "AM_IMP", undefined, undefined, undefined, 0x00);
  op(0xc8, "IN_RET", "AM_IMP", undefined, undefined, "CT_Z");
  op(0xc9, "IN_RET", "AM_IMP");
  op(0xca, "IN_JP", "AM_D16", undefined, undefined, "CT_Z");
  op(0xcb, "IN_CB", "AM_D8");
  op(0xcc, "IN_CALL", "AM_D16", undefined, undefined, "CT_Z");
  op(0xcd, "IN_CALL", "AM_D16");
  op(0xce, "IN_ADC", "AM_R_D8", "RT_A");
  op(0xcf, "IN_RST", "AM_IMP", undefined, undefined, undefined, 0x08);
  op(0xd0, "IN_RET", "AM_IMP", undefined, undefined, "CT_NC");
  op(0xd1, "IN_POP", "AM_R", "RT_DE");
  op(0xd2, "IN_JP", "AM_D16", undefined, undefined, "CT_NC");
  op(0xd4, "IN_CALL", "AM_D16", undefined, undefined, "CT_NC");
  op(0xd5, "IN_PUSH", "AM_R", "RT_DE");
  op(0xd6, "IN_SUB", "AM_R_D8", "RT_A");
  op(0xd7, "IN_RST", "AM_IMP", undefined, undefined, undefined, 0x10);
  op(0xd8, "IN_RET", "AM_IMP", undefined, undefined, "CT_C");
  op(0xd9, "IN_RETI", "AM_IMP");
  op(0xda, "IN_JP", "AM_D16", undefined, undefined, "CT_C");
  op(0xdc, "IN_CALL", "AM_D16", undefined, undefined, "CT_C");
  op(0xde, "IN_SBC", "AM_R_D8", "RT_A");
  op(0xdf, "IN_RST", "AM_IMP", undefined, undefined, undefined, 0x18);
  op(0xe0, "IN_LDH", "AM_A8_R", undefined, "RT_A");
  op(0xe1, "IN_POP", "AM_R", "RT_HL");
  op(0xe2, "IN_LD", "AM_MR_R", "RT_C", "RT_A");
  op(0xe5, "IN_PUSH", "AM_R", "RT_HL");
  op(0xe6, "IN_AND", "AM_R_D8", "RT_A");
  op(0xe7, "IN_RST", "AM_IMP", undefined, undefined, undefined, 0x20);
  op(0xe8, "IN_ADD", "AM_R_D8", "RT_SP");
  op(0xe9, "IN_JP", "AM_R", "RT_HL");
  op(0xea, "IN_LD", "AM_A16_R", undefined, "RT_A");
  op(0xee, "IN_XOR", "AM_R_D8", "RT_A");
  op(0xef, "IN_RST", "AM_IMP", undefined, undefined, undefined, 0x28);
  op(0xf0, "IN_LDH", "AM_R_A8", "RT_A");
  op(0xf1, "IN_POP", "AM_R", "RT_AF");
  op(0xf2, "IN_LD", "AM_R_MR", "RT_A", "RT_C");
  op(0xf3, "IN_DI", "AM_IMP");
  op(0xf5, "IN_PUSH", "AM_R", "RT_AF");
  op(0xf6, "IN_OR", "AM_R_D8", "RT_A");
  op(0xf7, "IN_RST", "AM_IMP", undefined, undefined, undefined, 0x30);
  op(0xf8, "IN_LD", "AM_HL_SPR", "RT_HL", "RT_SP");
  op(0xf9, "IN_LD", "AM_R_R", "RT_SP", "RT_HL");
  op(0xfa, "IN_LD", "AM_R_A16", "RT_A");
  op(0xfb, "IN_EI", "AM_IMP");
  op(0xfe, "IN_CP", "AM_R_D8", "RT_A");
  op(0xff, "IN_RST", "AM_IMP", undefined, undefined, undefined, 0x38);
}

// 0x40-0x7f: LD r,r' and 0x80-0xbf: ALU A,r (register order B C D E H L (HL) A)
const R8: RegType[] = ["RT_B", "RT_C", "RT_D", "RT_E", "RT_H", "RT_L", "RT_HL", "RT_A"];
const ALU: InType[] = ["IN_ADD", "IN_ADC", "IN_SUB", "IN_SBC", "IN_AND", "IN_XOR", "IN_OR", "IN_CP"];

for (let i = 0; i < 64; i++) {
  const dst = R8[i >> 3];
  const src = R8[i & 7];
  const src_mode = src === "RT_HL" ? "AM_R_MR" : "AM_R_R";

  if (0x40 + i === 0x76) {
    op(0x76, "IN_HALT", "AM_IMP");
  } else {
    op(0x40 + i, "IN_LD", dst === "RT_HL" ? "AM_MR_R" : src_mode, dst, src);
  }

  op(0x80 + i, ALU[i >> 3], src_mode, "RT_A", src);
}

export function instruction_by_opcode(opcode: number): instruction {
  return instructions[opcode & 0xff];
}

export function instruction_name(t: InType): string {
  return t === "IN_NONE" ? "<NONE>" : t.slice(3);
}
