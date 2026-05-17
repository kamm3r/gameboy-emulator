import { cart_read, cart_write } from "../cart";
import { dma_is_active } from "./dma";
import { io_read, io_write } from "../io";
import {
  ppu_vram_read,
  ppu_vram_write,
  ppu_oam_read,
  ppu_oam_write,
} from "../ppu/ppu";
import { wram_read, wram_write, hram_read, hram_write } from "./ram";
import { int_get_ie, int_set_ie } from "../interrupts";

export function bus_read(address: number): number {
  address &= 0xffff;

  if (address < 0x8000) {
    return cart_read(address);
  }

  if (address < 0xa000) {
    return ppu_vram_read(address);
  }

  if (address < 0xc000) {
    return cart_read(address);
  }

  if (address < 0xe000) {
    return wram_read(address - 0xc000);
  }

  if (address < 0xfe00) {
    return wram_read(address - 0xe000);
  }

  if (address < 0xfea0) {
    if (dma_is_active()) {
      return 0xff;
    }
    return ppu_oam_read(address);
  }

  if (address < 0xff00) {
    return 0xff;
  }

  if (address < 0xff80) {
    return io_read(address);
  }

  if (address === 0xffff) {
    return int_get_ie();
  }

  return hram_read(address);
}

export function bus_write(address: number, value: number): void {
  address &= 0xffff;
  value &= 0xff;

  if (address < 0x8000) {
    cart_write(address, value);
    return;
  }

  if (address < 0xa000) {
    ppu_vram_write(address, value);
    return;
  }

  if (address < 0xc000) {
    cart_write(address, value);
    return;
  }

  if (address < 0xe000) {
    wram_write(address - 0xc000, value);
    return;
  }

  if (address < 0xfe00) {
    wram_write(address - 0xe000, value);
    return;
  }

  if (address < 0xfea0) {
    if (!dma_is_active()) {
      ppu_oam_write(address, value);
    }
    return;
  }

  if (address < 0xff00) {
    return;
  }

  if (address < 0xff80) {
    io_write(address, value);
    return;
  }

  if (address === 0xffff) {
    int_set_ie(value);
    return;
  }

  hram_write(address, value);
}

export function bus_read16(address: number): number {
  const lo = bus_read(address);
  const hi = bus_read(address + 1);
  return lo | (hi << 8);
}

export function bus_write16(address: number, value: number): void {
  bus_write(address, value & 0xff);
  bus_write(address + 1, (value >>> 8) & 0xff);
}
