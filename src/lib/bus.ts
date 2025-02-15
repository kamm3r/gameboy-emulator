import { cart_read, cart_write } from "@/lib/cartridge";
import { NO_IMPL } from "@/lib/common";

export function bus_read(address: number): number {
  if (address < 0x8000) {
    return cart_read(address);
  }
  NO_IMPL();
}

export function bus_write(address: number, value: number): void {
  if (address < 0x8000) {
    cart_write(address, value);
    return;
  }
  NO_IMPL();
}
