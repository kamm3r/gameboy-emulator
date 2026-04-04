import { bus_read, bus_write } from "@/lib/bus";
import { cpu_get_registers } from "@/lib/cpu";

export function stack_push(value: number): void {
  cpu_get_registers().SP--;
  bus_write(cpu_get_registers().SP, value);
}

export function stack_push16(value: number): void {
  stack_push((value >> 8) & 0xff);
  stack_push(value & 0xff);
}

export function stack_pop(): number {
  return bus_read(cpu_get_registers().SP++);
}

export function stack_pop16(): number {
  const lo = stack_pop();
  const hi = stack_pop();

  return (hi << 8) | lo;
}
