export const XRES = 160;
export const YRES = 144;

export const ROM_BANK_SIZE = 0x4000;
export const RAM_BANK_SIZE = 0x2000;

export const CPU_HZ = 4_194_304;
export const DEFAULT_SAMPLE_RATE = 48_000;
export const DEFAULT_MAX_BUFFERED_SAMPLES = 16_384;
export const T_CYCLES_PER_FRAME = 70224;
export const TARGET_FRAME_MS = (1000 * T_CYCLES_PER_FRAME) / CPU_HZ;

export const NR10 = 0xff10;
export const NR11 = 0xff11;
export const NR12 = 0xff12;
export const NR13 = 0xff13;
export const NR14 = 0xff14;

export const NR21 = 0xff16;
export const NR22 = 0xff17;
export const NR23 = 0xff18;
export const NR24 = 0xff19;

export const NR30 = 0xff1a;
export const NR31 = 0xff1b;
export const NR32 = 0xff1c;
export const NR33 = 0xff1d;
export const NR34 = 0xff1e;

export const NR41 = 0xff20;
export const NR42 = 0xff21;
export const NR43 = 0xff22;
export const NR44 = 0xff23;

export const NR50 = 0xff24;
export const NR51 = 0xff25;
export const NR52 = 0xff26;

export const WAVE_RAM_START = 0xff30;
export const WAVE_RAM_END = 0xff3f;

export const DUTY_PATTERNS: ReadonlyArray<ReadonlyArray<number>> = [
  [0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 1, 0],
];

export const NOISE_DIVISORS = [8, 16, 32, 48, 64, 80, 96, 112] as const;

export function BETWEEN(a: number, b: number, c: number): boolean {
  return a >= b && a <= c;
}

export function formatter(
  formatString: string,
  ...args: (number | string)[]
): string {
  return formatString.replace(
    /%(-?)(\d+)?(l)?(\d*)([sdX])/g,
    (match, align, width, _long, _precision, type) => {
      const value = args.shift();

      if (value === undefined) {
        return match;
      }

      if (type === "d") {
        return value.toString();
      } else if (type === "s") {
        const str = value.toString();
        if (align === "-") {
          return str.padEnd(width ? parseInt(width) : str.length, " ");
        }
        return str.padStart(width ? parseInt(width) : str.length, " ");
      } else if (type === "X") {
        return value
          .toString()
          .toUpperCase()
          .padStart(width ? parseInt(width) : 0, "0");
      }

      return match;
    }
  );
}