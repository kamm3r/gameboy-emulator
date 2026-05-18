export const XRES = 160;
export const YRES = 144;
export const SCREEN_WIDTH = XRES;
export const SCREEN_HEIGHT = YRES;

export const ROM_BANK_SIZE = 0x4000;
export const RAM_BANK_SIZE = 0x2000;
export const VRAM_SIZE = 0x2000;
export const WRAM_SIZE = 0x2000;
export const HRAM_SIZE = 0x80;
export const OAM_SIZE = 0xa0;

export const CPU_HZ = 4_194_304;
export const DEFAULT_SAMPLE_RATE = 48_000;
export const DEFAULT_MAX_BUFFERED_SAMPLES = 16_384;
export const T_CYCLES_PER_FRAME = 70224;
export const GB_FRAME_RATE = CPU_HZ / T_CYCLES_PER_FRAME;
export const TARGET_FRAME_MS = 1000 / GB_FRAME_RATE;
export const M_CYCLES_PER_FRAME = T_CYCLES_PER_FRAME >> 2;

export const INT_VBLANK = 0x01;
export const INT_LCD_STAT = 0x02;
export const INT_TIMER = 0x04;
export const INT_SERIAL = 0x08;
export const INT_JOYPAD = 0x10;
export const INT_MASK = 0x1f;

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

export const COLORS_DEFAULT: readonly [number, number, number, number] = [
  0xffffffff, 0xffaaaaaa, 0xff555555, 0xff000000,
];

export function bit(a: number, n: number): number {
  return (a >>> n) & 1;
}

export function mask8(value: number): number {
  return value & 0xff;
}

export function mask16(value: number): number {
  return value & 0xffff;
}

export function to_signed8(value: number): number {
  value &= 0xff;
  return value & 0x80 ? value - 0x100 : value;
}

export function clamp8(value: number): number {
  return value & 0xff;
}

export function clamp16(value: number): number {
  return value & 0xffff;
}

export function get_now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function hex2(value: number): string {
  return (value & 0xff).toString(16).padStart(2, "0");
}

export function hex4(value: number): string {
  return (value & 0xffff).toString(16).padStart(4, "0");
}

export function argb_to_css(color: number): string {
  const r = (color >>> 16) & 0xff;
  const g = (color >>> 8) & 0xff;
  const b = color & 0xff;
  const a = ((color >>> 24) & 0xff) / 255;
  return `rgba(${r},${g},${b},${a})`;
}

export function argb_to_rgba(color: number): [number, number, number, number] {
  return [
    (color >>> 16) & 0xff,
    (color >>> 8) & 0xff,
    color & 0xff,
    (color >>> 24) & 0xff,
  ];
}

export function BIT(a: number, n: number): number {
  return a & (1 << n) ? 1 : 0;
}

export function BIT_SET(a: number, n: number, on: number): number {
  if (on) {
    return a | (1 << n);
  } else {
    return a & ~(1 << n);
  }
}

export function BETWEEN(a: number, b: number, c: number): boolean {
  return a >= b && a <= c;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function NO_IMPL(): void {
  console.error("NOT YET IMPLEMENTED\n");
}

export function formatter(
  formatString: string,
  ...args: (number | string)[]
): string {
  return formatString.replace(
    /%(-?)(\d+)?(l)?(\d*)([sdX])/g,
    (match, align, width, long, precision, type) => {
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