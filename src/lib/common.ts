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
