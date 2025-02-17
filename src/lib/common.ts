export function BIT(a: number, n: number): number {
  return a & (1 << n) ? 1 : 0;
}

export function BIT_SET(a: number, n: number, on: number): number {
  // return on ? (a |= 1 << n) : (a &= ~(1 << n));
  if (on) {
    return a | (1 << n);
  } else {
    return a & ~(1 << n);
  }
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

export function formatter(
  formatString: string,
  ...args: (number | string)[]
): string {
  return formatString.replace(
    /%(-?)(\d+)?(?:\.(\d+))?([sdX])/g,
    (match, align, width, precision, type) => {
      const value = args.shift(); // Get the next argument

      if (value === undefined) {
        return match; // Return the original match if no argument is provided
      }

      if (type === "d") {
        // Format as decimal
        return value.toString();
      } else if (type === "s") {
        // Format as string
        const str = value.toString();
        if (align === "-") {
          return str.padEnd(width ? parseInt(width) : str.length, " ");
        }
        return str.padStart(width ? parseInt(width) : str.length, " ");
      } else if (type === "X") {
        // Format as hexadecimal (uppercase)
        return value
          .toString(16)
          .toUpperCase()
          .padStart(width ? parseInt(width) : 0, "0");
      }

      return match; // Return the original match if no formatting is applied
    }
  );
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
