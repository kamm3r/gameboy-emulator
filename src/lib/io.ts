import { BETWEEN } from "@/lib/common";
import { timer_read, timer_write } from "@/lib/timer";
import { cpu_get_int_flags, cpu_set_int_flags } from "@/lib/cpu";
import { gamepad_get_output, gamepad_set_sel } from "@/lib/gamepad";
import { lcd_read, lcd_write } from "@/lib/lcd";

const serial_data: number[] = [0, 0];

export function io_read(address: number): number {
  if (address === 0xff00) {
    return gamepad_get_output();
  }

  if (address === 0xff01) {
    return serial_data[0];
  }

  if (address === 0xff02) {
    return serial_data[1];
  }

  if (BETWEEN(address, 0xff04, 0xff07)) {
    return timer_read(address);
  }

  if (address === 0xff0f) {
    return cpu_get_int_flags();
  }

  if (BETWEEN(address, 0xff10, 0xff3f)) {
    return 0;
  }

  if (BETWEEN(address, 0xff40, 0xff4b)) {
    return lcd_read(address);
  }

  console.log(`UNSUPPORTED bus_read(${address.toString(16)})\n`);
  return 0;
}

export function io_write(address: number, value: number): void {
  if (address === 0xff00) {
    gamepad_set_sel(value);
    return;
  }

  if (address === 0xff01) {
    serial_data[0] = value;
    return;
  }

  if (address === 0xff02) {
    serial_data[1] = value;
    return;
  }

  if (BETWEEN(address, 0xff04, 0xff07)) {
    timer_write(address, value);
    return;
  }

  if (address === 0xff0f) {
    cpu_set_int_flags(value);
    return;
  }

  if (BETWEEN(address, 0xff10, 0xff3f)) {
    return;
  }

  if (BETWEEN(address, 0xff40, 0xff4b)) {
    lcd_write(address, value);
    return;
  }

  console.log(`UNSUPPORTED bus_write(${address.toString(16)})\n`);
}
