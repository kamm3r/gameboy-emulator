import { cpu_get_context } from "@/lib/cpu/cpu";
import { emu_cycles } from "@/lib/emu";
import { stack_push16 } from "@/lib/stack";

export const INT_VBLANK = 0x01;
export const INT_LCD_STAT = 0x02;
export const INT_TIMER = 0x04;
export const INT_SERIAL = 0x08;
export const INT_JOYPAD = 0x10;

function int_handle(address: number): void {
  const ctx = cpu_get_context();

  emu_cycles(2);
  stack_push16(ctx.registers.PC);
  emu_cycles(1);

  ctx.registers.PC = address & 0xffff;
  emu_cycles(2);
}

function int_check(address: number, it: number): boolean {
  const ctx = cpu_get_context();

  if (ctx.int_flags & it && ctx.ie_register & it) {
    int_handle(address);
    ctx.int_flags &= ~it;
    ctx.halted = false;
    ctx.int_master_enabled = false;
    return true;
  }

  return false;
}

// Highest priority first: VBlank, LCD STAT, Timer, Serial, Joypad
export function cpu_handle_interrupts(): void {
  for (let i = 0; i < 5; i++) {
    if (int_check(0x40 + i * 8, 1 << i)) {
      return;
    }
  }
}
