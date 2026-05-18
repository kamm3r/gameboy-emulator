import { INT_MASK } from "./common";
import { emu_cycles } from "./emu";
import { stack_push16 } from "./stack";

type interrupt_cpu_context = {
  registers: { PC: number; SP: number };
  halted: boolean;
  int_master_enabled: boolean;
  enabling_ime: boolean;
};

const INTERRUPTS: [number, number][] = [
  [0x01, 0x40],
  [0x02, 0x48],
  [0x04, 0x50],
  [0x08, 0x58],
  [0x10, 0x60],
];

let int_flags = 0;
let ie_register = 0;

export function int_init(): void {
  int_flags = 0;
  ie_register = 0;
}

export function int_get_flags(): number {
  return int_flags & 0xff;
}

export function int_set_flags(value: number): void {
  int_flags = value & INT_MASK;
}

export function int_request(flag: number): void {
  int_flags |= flag & INT_MASK;
}

export function int_get_ie(): number {
  return ie_register & 0xff;
}

export function int_set_ie(value: number): void {
  ie_register = value & 0xff;
}

export function cpu_handle_interrupts(ctx: interrupt_cpu_context): void {
  const pending = int_flags & ie_register & INT_MASK;

  if (pending === 0 || !ctx.int_master_enabled) {
    return;
  }

  ctx.halted = false;

  for (const [flag, addr] of INTERRUPTS) {
    if ((int_flags & flag) !== 0 && (ie_register & flag) !== 0) {
      int_flags &= ~flag;
      ctx.int_master_enabled = false;
      ctx.enabling_ime = false;
      emu_cycles(2);

      ctx.registers.SP = stack_push16(ctx.registers.SP, ctx.registers.PC);
      emu_cycles(1);

      ctx.registers.PC = addr & 0xffff;
      emu_cycles(2);

      return;
    }
  }
}
