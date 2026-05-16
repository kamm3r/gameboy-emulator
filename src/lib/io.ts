import { cpu_get_int_flags, cpu_set_int_flags } from "@/lib/cpu/cpu";
import { gamepad_get_output, gamepad_set_sel } from "@/lib/input/gamepad";
import { lcd_read, lcd_write } from "@/lib/lcd";
import { timer_read, timer_write } from "@/lib/timer";
import { audio_read, audio_write } from "./audio/apu";

const serialData = new Uint8Array(2);

const LOG_UNSUPPORTED_IO = false;

const warnedReads = new Set<number>();
const warnedWrites = new Set<number>();

function warn_read(address: number): void {
  if (!LOG_UNSUPPORTED_IO || warnedReads.has(address)) {
    return;
  }

  warnedReads.add(address);
  console.log(`UNSUPPORTED io_read(${address.toString(16).padStart(4, "0")})`);
}

function warn_write(address: number): void {
  if (!LOG_UNSUPPORTED_IO || warnedWrites.has(address)) {
    return;
  }

  warnedWrites.add(address);
  console.log(`UNSUPPORTED io_write(${address.toString(16).padStart(4, "0")})`);
}

export function io_read(address: number): number {
  address &= 0xffff;

  switch (address) {
    case 0xff00:
      return gamepad_get_output();

    case 0xff01:
      return serialData[0];

    case 0xff02:
      // Unused bits read high on DMG.
      return serialData[1] | 0x7e;

    case 0xff0f:
      // IF upper 3 bits are unused and read high.
      return cpu_get_int_flags() | 0xe0;
  }

  if (address >= 0xff04 && address <= 0xff07) {
    return timer_read(address);
  }

  if (address >= 0xff10 && address <= 0xff3f) {
    return audio_read(address);
  }

  if (address >= 0xff40 && address <= 0xff4b) {
    return lcd_read(address);
  }

  warn_read(address);
  return 0xff;
}

export function io_write(address: number, value: number): void {
  address &= 0xffff;
  value &= 0xff;

  switch (address) {
    case 0xff00:
      gamepad_set_sel(value);
      return;

    case 0xff01:
      serialData[0] = value;
      return;

    case 0xff02:
      serialData[1] = value;
      return;

    case 0xff0f:
      cpu_set_int_flags(value & 0x1f);
      return;
  }

  if (address >= 0xff04 && address <= 0xff07) {
    timer_write(address, value);
    return;
  }

  if (address >= 0xff10 && address <= 0xff3f) {
    audio_write(address, value);
    return;
  }

  if (address >= 0xff40 && address <= 0xff4b) {
    lcd_write(address, value);
    return;
  }

  warn_write(address);
}