// import { bus_read, bus_write } from "@/lib/bus";
import { cpu_get_context} from "@/lib/cpu";
import { stack_push16 } from "@/lib/stack";

export const INT_VBLANK = 0x01;
export const INT_LCD_STAT = 0x02;
export const INT_TIMER = 0x04;
export const INT_SERIAL = 0x08;
export const INT_JOYPAD = 0x10;

export function int_handle(address: number): void {
  const ctx = cpu_get_context();
  stack_push16(ctx.registers.PC);
  ctx.registers.PC = address;
}

export function int_check(address: number, it: number): boolean {
  const ctx = cpu_get_context();
  if ((ctx.int_flags & it) && (ctx.ie_register & it)) {
    int_handle(address);
    ctx.int_flags &= ~it;
    ctx.halted = false;
    ctx.int_master_enabled = false;
    return true;
  }
  return false;
}

export function cpu_handle_interrupts(): void {
  if (int_check(0x40, INT_VBLANK)) {
  } else if (int_check(0x48, INT_LCD_STAT)) {
  } else if (int_check(0x50, INT_TIMER)) {
  } else if (int_check(0x58, INT_SERIAL)) {
  } else if (int_check(0x60, INT_JOYPAD)) {
  }
}
