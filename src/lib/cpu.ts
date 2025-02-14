// const Flags = {
//   ZERO: 0b10000000,
//   ADD_SUBTRACT: 0b0100_0000,
//   HALF_CARRY: 0b00100000,
//   CARRY: 0b00010000,
// } as const;

export function cpu_init(): void {}
export function cpu_step(): boolean {
  console.log("CPU not yet implemented \n");
  return false;
}

// export class cpu {
//   REG = new Uint8Array(8);
//   PC = 0x0000;
//   SP = 0x0000;

//   A = 0x00;
//   F = 0x00;
//   B = 0x00;
//   C = 0x00;
//   D = 0x00;
//   E = 0x00;
//   H = 0x00;
//   L = 0x00;

//   constructor() {}
// }
