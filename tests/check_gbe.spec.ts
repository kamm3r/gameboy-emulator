import { describe, test, expect } from "vitest";
import { cpu_step } from "./../src/lib/cpu.js";

describe("CPU Core", () => {
  test("cpuStep should return false", () => {
    const result = cpu_step();
    expect(result).toBe(false);
  });
});
