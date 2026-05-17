const WRAM_SIZE = 0x2000;
const HRAM_SIZE = 0x80;

const wram = new Uint8Array(WRAM_SIZE);
const hram = new Uint8Array(HRAM_SIZE);

export function wram_read(offset: number): number {
  return wram[offset & (WRAM_SIZE - 1)];
}

export function wram_write(offset: number, value: number): void {
  wram[offset & (WRAM_SIZE - 1)] = value & 0xff;
}

export function hram_read(offset: number): number {
  return hram[offset & (HRAM_SIZE - 1)];
}

export function hram_write(offset: number, value: number): void {
  hram[offset & (HRAM_SIZE - 1)] = value & 0xff;
}
