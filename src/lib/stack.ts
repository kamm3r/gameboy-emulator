import { bus_read, bus_write } from "./memory/bus";

export function stack_push16(sp: number, value: number): number {
  sp = (sp - 1) & 0xffff;
  bus_write(sp, (value >>> 8) & 0xff);
  sp = (sp - 1) & 0xffff;
  bus_write(sp, value & 0xff);
  return sp;
}

export function stack_pop16(sp: number): { value: number; sp: number } {
  const lo = bus_read(sp);
  sp = (sp + 1) & 0xffff;
  const hi = bus_read(sp);
  sp = (sp + 1) & 0xffff;
  return { value: (hi << 8) | lo, sp };
}
