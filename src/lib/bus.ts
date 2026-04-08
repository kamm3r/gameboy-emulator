import { cart_read, cart_write } from "@/lib/cart";
import { cpu_ie_register, cpu_set_ie_register } from "@/lib/cpu";
import { hram_read, hram_write, wram_read, wram_write } from "@/lib/ram";
import { ppu_vram_read, ppu_vram_write, ppu_oam_read, ppu_oam_write } from "@/lib/ppu";
import { io_read, io_write } from "@/lib/io";
import { dma_transferring } from "@/lib/dma";

export function bus_read(address: number): number {
  if (address < 0x8000) {
    return cart_read(address);
  } else if (address < 0xa000) {
    return ppu_vram_read(address);
  } else if (address < 0xc000) {
    return cart_read(address);
  } else if (address < 0xe000) {
    return wram_read(address);
  } else if (address < 0xfe00) {
    return 0;
  } else if (address < 0xfea0) {
    if (dma_transferring()) {
      return 0xff;
    }
    return ppu_oam_read(address);
  } else if (address < 0xff00) {
    return 0;
  } else if (address < 0xff80) {
    return io_read(address);
  } else if (address === 0xffff) {
    return cpu_ie_register();
  }

  return hram_read(address);
}

export function bus_write(address: number, value: number): void {
  if (address < 0x8000) {
    cart_write(address, value);
  } else if (address < 0xa000) {
    ppu_vram_write(address, value);
  } else if (address < 0xc000) {
    cart_write(address, value);
  } else if (address < 0xe000) {
    wram_write(address, value);
  } else if (address < 0xfe00) {
    // reserved echo ram
  } else if (address < 0xfea0) {
    if (dma_transferring()) {
      return;
    }
    ppu_oam_write(address, value);
  } else if (address < 0xFF00) {
    // unusable reserved
  } else if (address < 0xFF80) {
    io_write(address, value);
  } else if (address === 0xFFFF) {
    cpu_set_ie_register(value);
  } else {
    hram_write(address, value);
  }
}

export function bus_read16(address: number): number {
  const low = bus_read(address);
  const high = bus_read(address + 1);
  return low | (high << 8);
}

export function bus_write16(address: number, value: number): void {
  bus_write(address + 1, (value >> 8) & 0xFF);
  bus_write(address, value & 0xFF);
}
