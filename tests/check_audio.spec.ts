import { test, expect } from "vitest";
import * as path from "path";
import { ROMS_DIR, run_blargg_memory_rom } from "./rom_runner";

// DMG sound tests; results are reported through cart RAM at $A000
const AUDIO_TEST_ROMS = [
  "blargg/dmg_sound/rom_singles/01-registers.gb",
  "blargg/dmg_sound/rom_singles/02-len ctr.gb",
  "blargg/dmg_sound/rom_singles/03-trigger.gb",
  "blargg/dmg_sound/rom_singles/04-sweep.gb",
  "blargg/dmg_sound/rom_singles/05-sweep details.gb",
  "blargg/dmg_sound/rom_singles/06-overflow on trigger.gb",
  "blargg/dmg_sound/rom_singles/07-len sweep period sync.gb",
  "blargg/dmg_sound/rom_singles/08-len ctr during power.gb",
  "blargg/dmg_sound/rom_singles/09-wave read while on.gb",
  "blargg/dmg_sound/rom_singles/10-wave trigger while on.gb",
  "blargg/dmg_sound/rom_singles/11-regs after power.gb",
  "blargg/dmg_sound/rom_singles/12-wave write while on.gb",
];

for (const rom of AUDIO_TEST_ROMS) {
  test(rom, () => {
    const result = run_blargg_memory_rom(path.join(ROMS_DIR, rom));

    expect(
      result.passed,
      `ROM ${rom} failed: ${result.debug_info} - ${result.output}`,
    ).toBe(true);
  });
}
