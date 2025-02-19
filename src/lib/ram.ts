import { formatter } from "@/lib/common";

export type ram_context = {
  wram: number[];
  hram: number[];
};

const ctx: ram_context = {
  wram: new Array(0x2000).fill(0),
  hram: new Array(0x80).fill(0),
};

export function wram_read(address: number): number {
  address -= 0xc000;
  if (address < 0x2000) {
    console.log(formatter("INVALID WRAM ADDRESS %08X\n", address + 0xc000));
    process.exit(-1);
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
