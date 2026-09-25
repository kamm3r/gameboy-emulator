import { test, expect } from "vitest";
import * as path from "path";
import {
  ROMS_DIR,
  run_blargg_memory_rom,
  run_screenshot_rom,
  run_serial_rom,
  type rom_result,
} from "./rom_runner";

const SERIAL_ROMS = [
  "blargg/cpu_instrs/individual/01-special.gb",
  "blargg/cpu_instrs/individual/02-interrupts.gb",
  "blargg/cpu_instrs/individual/03-op sp,hl.gb",
  "blargg/cpu_instrs/individual/04-op r,imm.gb",
  "blargg/cpu_instrs/individual/05-op rp.gb",
  "blargg/cpu_instrs/individual/06-ld r,r.gb",
  "blargg/cpu_instrs/individual/07-jr,jp,call,ret,rst.gb",
  "blargg/cpu_instrs/individual/08-misc instrs.gb",
  "blargg/cpu_instrs/individual/09-op r,r.gb",
  "blargg/cpu_instrs/individual/10-bit ops.gb",
  "blargg/cpu_instrs/individual/11-op a,(hl).gb",
  "blargg/cpu_instrs/cpu_instrs.gb",
  "blargg/instr_timing/instr_timing.gb",
  "blargg/mem_timing/individual/01-read_timing.gb",
  "blargg/mem_timing/individual/02-write_timing.gb",
  "blargg/mem_timing/individual/03-modify_timing.gb",
  "blargg/mem_timing/mem_timing.gb",
];

const MEMORY_ROMS = ["blargg/mem_timing-2/mem_timing.gb"];

function check(rom: string, result: rom_result): void {
  expect(
    result.passed,
    `ROM ${rom} failed: ${result.debug_info} - ${result.output}`,
  ).toBe(true);
}

for (const rom of SERIAL_ROMS) {
  test(rom, () => {
    check(rom, run_serial_rom(path.join(ROMS_DIR, rom), 4000));
  });
}

for (const rom of MEMORY_ROMS) {
  test(rom, () => {
    check(rom, run_blargg_memory_rom(path.join(ROMS_DIR, rom)));
  });
}

test("dmg-acid2", () => {
  const result = run_screenshot_rom(
    path.join(ROMS_DIR, "dmg-acid2/dmg-acid2.gb"),
    path.join(ROMS_DIR, "dmg-acid2/dmg-acid2-dmg.png"),
    60,
  );
  check("dmg-acid2", result);
});
