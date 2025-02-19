import { cart_read, cart_write } from "@/lib/cartridge";
import { formatter, NO_IMPL } from "@/lib/common";
import { cpu_ie_register, cpu_set_ie_register } from "@/lib/cpu";
import { hram_read, hram_write, wram_read, wram_write } from "@/lib/ram";

export function bus_read(address: number): number {
  if (address < 0x8000) {
    // ROM Data
    return cart_read(address);
  } else if (address < 0xa000) {
    // Char/Map Data
    console.log(formatter("UNSUPPORTED BUS READ (%04X)\n", address));
    NO_IMPL();
  } else if (address < 0xc000) {
    // Cartridge RAM
    return cart_read(address);
  } else if (address < 0xe000) {
    // WRAM (Working RAM)
    return wram_read(address);
  } else if (address < 0xfe00) {
    // reserved echo RAM
    return 0;
  } else if (address < 0xfea0) {
    //OAM
    console.log(formatter("UNSUPPORTED BUS READ (%04X)\n", address));
    NO_IMPL();
  } else if (address < 0xff00) {
    // reserved unusable
    return 0;
  } else if (address < 0xff80) {
    // IO Registers
    console.log(formatter("UNSUPPORTED BUS READ (%04X)\n", address));
    NO_IMPL();
  } else if (address === 0xffff) {
    // CPU ENABLE REGISTER
    return cpu_ie_register();
  }
  return hram_read(address);
}

export function bus_write(address: number, value: number): void {
  if (address < 0x8000) {
    cart_write(address, value);
    return;
  } else if (address < 0xa000) {
    // Char/Map Data
    console.log(formatter("UNSUPPORTED BUS WRITE (%04X)\n", address));
    NO_IMPL();
  } else if (address < 0xc000) {
    // Cartridge RAM
    cart_write(address, value);
  } else if (address < 0xe000) {
    // WRAM (Working RAM)
    wram_write(address, value);
  } else if (address < 0xfe00) {
    // reserved echo RAM
  } else if (address < 0xfea0) {
    //OAM
    console.log(formatter("UNSUPPORTED BUS WRITE (%04X)\n", address));
    NO_IMPL();
  } else if (address < 0xff00) {
    // reserved unusable
  } else if (address < 0xff80) {
    // IO Registers
    console.log(formatter("UNSUPPORTED BUS WRITE (%04X)\n", address));
    NO_IMPL();
  } else if (address === 0xffff) {
    // CPU ENABLE REGISTER
    cpu_set_ie_register(value);
  } else {
    // HRAM
    hram_write(address, value);
  }
}

export function bus_read16(address: number): number {
  const low = bus_read(address);
  const high = bus_read(address + 1);

  return low | (high << 8);
}

export function bus_write16(address: number, value: number): void {
  bus_write(address + 1, (value >> 8) & 0xff);
  bus_write(address, value & 0xff);
}
