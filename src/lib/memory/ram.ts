import { formatter } from "@/lib/common";

export type ram_context = {
  wram: Uint8Array;
  hram: Uint8Array;
};

const ctx: ram_context = {
  wram: new Uint8Array(0x2000),
  hram: new Uint8Array(0x80),
};

export function wram_read(address: number): number {
  address -= 0xc000;
  if (address < 0 || address >= 0x2000) {
    console.log(formatter("INVALID WRAM ADDRESS %08X\n", address + 0xc000));
    return 0xff;
  }
  return ctx.wram[address];
}

export function wram_write(address: number, value: number): void {
  address -= 0xc000;

  ctx.wram[address] = value;
}

export function hram_read(address: number): number {
  address -= 0xff80;

  return ctx.hram[address];
}

export function hram_write(address: number, value: number): void {
  address -= 0xff80;

  ctx.hram[address] = value;
}
