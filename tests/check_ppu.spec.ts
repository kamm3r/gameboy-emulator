import { test, expect, beforeEach } from "vitest";
import {
  cpu_get_int_flags,
  cpu_set_int_flags,
  INT_LCD_STAT,
} from "../src/lib/cpu/cpu.js";
import { emu_init } from "../src/lib/emu.js";
import { lcd_get_context, lcd_write } from "../src/lib/lcd.js";
import { ppu_tick, TICKS_PER_LINE } from "../src/lib/ppu/ppu_sm.js";

function stat_requested(): boolean {
  return (cpu_get_int_flags() & INT_LCD_STAT) !== 0;
}

function tick_lines(lines: number): void {
  for (let i = 0; i < lines * TICKS_PER_LINE; i++) {
    ppu_tick();
  }
}

beforeEach(() => {
  emu_init();
});

test("LYC=LY raises a STAT interrupt when LY reaches LYC", () => {
  lcd_write(0xff45, 10);
  lcd_write(0xff41, 0x40); // LYC interrupt source only
  cpu_set_int_flags(0);

  tick_lines(9);
  expect(lcd_get_context().ly).toBe(9);
  expect(stat_requested()).toBe(false);

  tick_lines(1);
  expect(lcd_get_context().ly).toBe(10);
  expect(stat_requested()).toBe(true);
  expect(lcd_get_context().lcds & 0x04).toBe(0x04);
});

test("LYC=LY interrupt fires once per frame", () => {
  lcd_write(0xff45, 10);
  lcd_write(0xff41, 0x40);
  cpu_set_int_flags(0);

  let requests = 0;
  // Two full frames (154 lines each)
  for (let i = 0; i < 2 * 154 * TICKS_PER_LINE; i++) {
    ppu_tick();
    if (stat_requested()) {
      requests++;
      cpu_set_int_flags(0);
    }
  }

  expect(requests).toBe(2);
});

test("LYC=LY interrupt is not raised when the source is disabled", () => {
  lcd_write(0xff45, 10);
  lcd_write(0xff41, 0x00);
  cpu_set_int_flags(0);

  tick_lines(11);
  expect(stat_requested()).toBe(false);
  expect(lcd_get_context().lcds & 0x04).toBe(0);
});
