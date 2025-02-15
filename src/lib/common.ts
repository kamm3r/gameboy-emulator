export function BIT(a: number, n: number): number {
  return a & (1 << n) ? 1 : 0;
}

export function BIT_SET(a: number, n: number, on: boolean): number {
  return on ? (a |= 1 << n) : (a &= ~(1 << n));
}

export function BETWEEN(a: number, b: number, c: number): boolean {
  return a >= b && a <= c;
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function NO_IMPL(): void {
  console.error("NOT ?YET IMPLEMENTED\n");
  process.exit(-5);
}

export function reverse(value: number): number {
  return ((value & 0xff00) >> 8) | ((value & 0xff) << 8);
}

export function stringCopyLimit(source: string, maxLength: number) {
  return source.slice(0, maxLength);
}

export class Flags {
  static readonly ZERO = 0b10000000;
  static readonly ADD_SUBTRACT = 0b01000000;
  static readonly HALF_CARRY = 0b00100000;
  static readonly CARRY = 0b00010000;
  value: number;

  constructor(initialValue: number = 0) {
    this.value = initialValue;
  }

  isSet(flag: number): boolean {
    return (this.value & flag) !== 0;
  }

  set(flag: number): void {
    this.value |= flag;
  }

  unset(flag: number): void {
    this.value &= ~flag;
  }

  toggle(flag: number): void {
    this.value ^= flag;
  }

  static from(value: number): Flags {
    const flags = new Flags();
    flags.value = value;
    return flags;
  }

  toNumber(): number {
    return this.value;
  }
}
