import { int_get_flags, int_request, int_set_flags } from "./interrupts";
import { gamepad_get_output, gamepad_set_sel } from "./input/gamepad";
import { lcd_read, lcd_write, lcd_get_context, lcd_get_lyc_was_set } from "./lcd";
import { timer_read, timer_write } from "./timer";
import { audio_read, audio_write } from "./audio/apu";
import { INT_LCD_STAT } from "./common";

const serial_data = new Uint8Array(2);

export function io_read(address: number): number {
  address &= 0xffff;

  switch (address) {
    case 0xff00: return gamepad_get_output();
    case 0xff01: return serial_data[0];
    case 0xff02: return serial_data[1] | 0x7e;
    case 0xff0f: return int_get_flags() | 0xe0;
  }

  if ((address - 0xff04) <= 3) {
    return timer_read(address);
  }

  if ((address - 0xff10) <= 0x2f) {
    return audio_read(address);
  }

  if ((address - 0xff40) <= 0xb) {
    return lcd_read(address);
  }

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
      serial_data[0] = value;
      return;
    case 0xff02:
      serial_data[1] = value;
      return;
    case 0xff0f:
      int_set_flags(value & 0x1f);
      return;
  }

  if ((address - 0xff04) <= 3) {
    timer_write(address, value);
    return;
  }

  if ((address - 0xff10) <= 0x2f) {
    audio_write(address, value);
    return;
  }

  if (address === 0xff45) {
    const was_set = lcd_get_lyc_was_set();
    lcd_write(address, value);
    const lcd = lcd_get_context();
    const is_set = lcd.ly === lcd.ly_compare;
    if (is_set) {
      lcd.lcds |= 0x04;
    } else {
      lcd.lcds &= ~0x04;
    }
    if (!was_set && is_set) {
      int_request(INT_LCD_STAT);
    }
    return;
  }

  if ((address - 0xff40) <= 0xb) {
    lcd_write(address, value);
    return;
  }
}
