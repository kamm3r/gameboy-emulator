export const XRES = 160;
export const YRES = 144;

export const SCREEN_WIDTH = XRES;
export const SCREEN_HEIGHT = YRES;

export function BIT(a: number, n: number): number {
  return (a >>> n) & 1;
}

export function BIT_SET(a: number, n: number, on: number): number {
  const mask = 1 << n;
  return on ? a | mask : a & ~mask;
}

export function BETWEEN(a: number, b: number, c: number): boolean {
  return a >= b && a <= c;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function NO_IMPL(): void {
  console.error("NOT YET IMPLEMENTED");
}

type FormatArg = number | string;

/**
 * Small printf-style formatter.
 *
 * Supports:
 *   %d
 *   %s
 *   %X
 *   %2X
 *   %02X
 *   %2.2X
 *   %-8s
 */
export function formatter(formatString: string, ...args: FormatArg[]): string {
  let argIndex = 0;

  return formatString.replace(
    /%(-)?(0)?(\d+)?(?:\.(\d+))?[l]?([sdX])/g,
    (match, leftAlign, zeroPad, widthRaw, precisionRaw, type) => {
      const value = args[argIndex++];

      if (value === undefined) {
        return match;
      }

      const width = widthRaw ? Number.parseInt(widthRaw, 10) : 0;
      const precision = precisionRaw ? Number.parseInt(precisionRaw, 10) : 0;

      let out: string;

      switch (type) {
        case "d":
          out = Number(value).toString(10);
          break;

        case "s":
          out = String(value);
          break;

        case "X": {
          const minDigits = precision || width || 0;
          out = Number(value)
            .toString(16)
            .toUpperCase()
            .padStart(minDigits, "0");
          break;
        }

        default:
          return match;
      }

      if (type !== "X" && width > out.length) {
        out = leftAlign
          ? out.padEnd(width, " ")
          : out.padStart(width, zeroPad ? "0" : " ");
      }

      return out;
    },
  );
}

export function stringCopyLimit(source: string, maxLength: number): string {
  return source.slice(0, maxLength);
}

export class Flags {
  static readonly ZERO = 0b10000000;
  static readonly ADD_SUBTRACT = 0b01000000;
  static readonly HALF_CARRY = 0b00100000;
  static readonly CARRY = 0b00010000;

  value: number;

  constructor(initialValue = 0) {
    this.value = initialValue & 0xf0;
  }

  isSet(flag: number): boolean {
    return (this.value & flag) !== 0;
  }

  set(flag: number): void {
    this.value = (this.value | flag) & 0xf0;
  }

  unset(flag: number): void {
    this.value = (this.value & ~flag) & 0xf0;
  }

  toggle(flag: number): void {
    this.value = (this.value ^ flag) & 0xf0;
  }

  static from(value: number): Flags {
    return new Flags(value);
  }

  toNumber(): number {
    return this.value & 0xf0;
  }
}