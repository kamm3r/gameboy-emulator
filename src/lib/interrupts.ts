import { cpu_get_context } from "@/lib/cpu/cpu";
import { emu_cycles } from "@/lib/emu";
import { stack_push16 } from "@/lib/stack";

export const INT_VBLANK = 0x01;
export const INT_LCD_STAT = 0x02;
export const INT_TIMER = 0x04;
export const INT_SERIAL = 0x08;
export const INT_JOYPAD = 0x10;

const INTERRUPTS: ReadonlyArray<readonly [number, number]> = [
  [INT_VBLANK, 0x40],
  [INT_LCD_STAT, 0x48],
  [INT_TIMER, 0x50],
  [INT_SERIAL, 0x58],
  [INT_JOYPAD, 0x60],
];

export function int_handle(address: number): void {
  const ctx = cpu_get_context();

  ctx.int_master_enabled = false;
  ctx.halted = false;

  // Interrupt dispatch takes 5 M-cycles on the Game Boy.
  emu_cycles(2);
  stack_push16(ctx.registers.PC);
  emu_cycles(1);

  ctx.registers.PC = address & 0xffff;

  emu_cycles(2);
}

export function int_check(address: number, it: number): boolean {
  const ctx = cpu_get_context();

  if ((ctx.int_flags & it) === 0 || (ctx.ie_register & it) === 0) {
    return false;
  }

  ctx.int_flags &= ~it;
  int_handle(address);

  return true;
}

export function cpu_handle_interrupts(): void {
  const ctx = cpu_get_context();
  const pending = ctx.int_flags & ctx.ie_register & 0x1f;

  if (pending === 0) {
    return;
  }

  // Any pending enabled interrupt wakes HALT, even if IME is disabled.
  ctx.halted = false;

  // But the CPU only jumps to the interrupt vector when IME is enabled.
  if (!ctx.int_master_enabled) {
    return;
  }

  for (const [flag, address] of INTERRUPTS) {
    if (int_check(address, flag)) {
      return;
    }
  }
}