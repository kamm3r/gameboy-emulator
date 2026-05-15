import { cart_read, cart_write } from "@/lib/cart";
import { cpu_ie_register, cpu_set_ie_register } from "@/lib/cpu/cpu";
import { dma_transferring } from "@/lib/memory/dma";
import { io_read, io_write } from "@/lib/io";
import {
  ppu_oam_read,
  ppu_oam_write,
  ppu_vram_read,
  ppu_vram_write,
} from "@/lib/ppu/ppu";
import {
  hram_read,
  hram_write,
  wram_read,
  wram_read_offset,
  wram_write,
} from "@/lib/memory/ram";

export function bus_read(address: number): number {
  address &= 0xffff;

  const page = address >>> 8;

  if (page < 0x80) {
    return cart_read(address);
  }

  if (page < 0xa0) {
    return ppu_vram_read(address);
  }

  if (page < 0xc0) {
    return cart_read(address);
  }

  if (page < 0xe0) {
    return wram_read_offset(address - 0xc000);
  }

  if (page < 0xfe) {
    return wram_read_offset(address - 0xe000);
  }

  if (page === 0xfe) {
    if (address < 0xfea0) {
      return dma_transferring() ? 0xff : ppu_oam_read(address);
    }

    return 0xff;
  }

  if (page === 0xff) {
    if (address < 0xff80) {
      return io_read(address);
    }

    if (address === 0xffff) {
      return cpu_ie_register();
    }

    return hram_read(address);
  }

  return 0xff;
}

export function bus_write(address: number, value: number): void {
  address &= 0xffff;
  value &= 0xff;

  const page = address >>> 8;

  if (page < 0x80) {
    cart_write(address, value);
    return;
  }

  if (page < 0xa0) {
    ppu_vram_write(address, value);
    return;
  }

  if (page < 0xc0) {
    cart_write(address, value);
    return;
  }

  if (page < 0xe0) {
    wram_write(address, value);
    return;
  }

  if (page < 0xfe) {
    wram_write(address - 0x2000, value);
    return;
  }

  if (page === 0xfe) {
    if (address < 0xfea0 && !dma_transferring()) {
      ppu_oam_write(address, value);
    }

    return;
  }

  if (page === 0xff) {
    if (address < 0xff80) {
      io_write(address, value);
      return;
    }

    if (address === 0xffff) {
      cpu_set_ie_register(value);
      return;
    }

    hram_write(address, value);
  }
}

export function bus_read16(address: number): number {
  const low = bus_read(address);
  const high = bus_read((address + 1) & 0xffff);

  return low | (high << 8);
}

export function bus_write16(address: number, value: number): void {
  bus_write((address + 1) & 0xffff, (value >> 8) & 0xff);
  bus_write(address, value & 0xff);
}
