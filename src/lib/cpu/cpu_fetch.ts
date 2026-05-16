import { formatter } from "@/lib/common";
import { type cpu_context } from "@/lib/cpu/cpu";
import { cpu_read_register, cpu_set_register } from "@/lib/cpu/cpu_util";
import { emu_cycles } from "@/lib/emu";
import { bus_read } from "@/lib/memory/bus";

export function fetch_data(ctx: cpu_context): void {
  ctx.fetched_data = 0;
  ctx.memory_destination = 0;
  ctx.destination_is_memory = false;

  const inst = ctx.current_instruction;

  if (inst === null) {
    return;
  }

  const r = ctx.registers;

  switch (inst.mode) {
    case "AM_IMP":
      return;

    case "AM_R":
      ctx.fetched_data = cpu_read_register(ctx, inst.reg_1!) & 0xffff;
      return;

    case "AM_R_R":
      ctx.fetched_data = cpu_read_register(ctx, inst.reg_2!) & 0xffff;
      return;

    case "AM_R_D8":
    case "AM_R_A8":
    case "AM_HL_SPR":
    case "AM_D8":
      ctx.fetched_data = bus_read(r.PC) & 0xff;
      emu_cycles(1);
      r.PC = (r.PC + 1) & 0xffff;
      return;

    case "AM_A8_R":
      ctx.memory_destination = 0xff00 | (bus_read(r.PC) & 0xff);
      ctx.destination_is_memory = true;
      emu_cycles(1);
      r.PC = (r.PC + 1) & 0xffff;
      return;

    case "AM_R_D16":
    case "AM_D16": {
      const pc = r.PC;
      const lo = bus_read(pc) & 0xff;
      emu_cycles(1);

      const hi = bus_read((pc + 1) & 0xffff) & 0xff;
      emu_cycles(1);

      ctx.fetched_data = lo | (hi << 8);
      r.PC = (pc + 2) & 0xffff;
      return;
    }

    case "AM_A16_R":
    case "AM_D16_R": {
      const pc = r.PC;
      const lo = bus_read(pc) & 0xff;
      emu_cycles(1);

      const hi = bus_read((pc + 1) & 0xffff) & 0xff;
      emu_cycles(1);

      ctx.memory_destination = lo | (hi << 8);
      ctx.destination_is_memory = true;
      ctx.fetched_data = cpu_read_register(ctx, inst.reg_2!) & 0xffff;
      r.PC = (pc + 2) & 0xffff;
      return;
    }

    case "AM_R_A16": {
      const pc = r.PC;
      const lo = bus_read(pc) & 0xff;
      emu_cycles(1);

      const hi = bus_read((pc + 1) & 0xffff) & 0xff;
      emu_cycles(1);

      const address = lo | (hi << 8);

      r.PC = (pc + 2) & 0xffff;

      ctx.fetched_data = bus_read(address) & 0xff;
      emu_cycles(1);
      return;
    }

    case "AM_MR_R": {
      let address = cpu_read_register(ctx, inst.reg_1!) & 0xffff;

      if (inst.reg_1 === "RT_C") {
        address = 0xff00 | (address & 0xff);
      }

      ctx.fetched_data = cpu_read_register(ctx, inst.reg_2!) & 0xffff;
      ctx.memory_destination = address;
      ctx.destination_is_memory = true;
      return;
    }

    case "AM_R_MR": {
      let address = cpu_read_register(ctx, inst.reg_2!) & 0xffff;

      if (inst.reg_2 === "RT_C") {
        address = 0xff00 | (address & 0xff);
      }

      ctx.fetched_data = bus_read(address) & 0xff;
      emu_cycles(1);
      return;
    }

    case "AM_R_HLI": {
      const address = cpu_read_register(ctx, inst.reg_2!) & 0xffff;

      ctx.fetched_data = bus_read(address) & 0xff;
      emu_cycles(1);

      cpu_set_register(ctx, "RT_HL", (address + 1) & 0xffff);
      return;
    }

    case "AM_R_HLD": {
      const address = cpu_read_register(ctx, inst.reg_2!) & 0xffff;

      ctx.fetched_data = bus_read(address) & 0xff;
      emu_cycles(1);

      cpu_set_register(ctx, "RT_HL", (address - 1) & 0xffff);
      return;
    }

    case "AM_HLI_R": {
      const address = cpu_read_register(ctx, inst.reg_1!) & 0xffff;

      ctx.fetched_data = cpu_read_register(ctx, inst.reg_2!) & 0xffff;
      ctx.memory_destination = address;
      ctx.destination_is_memory = true;

      cpu_set_register(ctx, "RT_HL", (address + 1) & 0xffff);
      return;
    }

    case "AM_HLD_R": {
      const address = cpu_read_register(ctx, inst.reg_1!) & 0xffff;

      ctx.fetched_data = cpu_read_register(ctx, inst.reg_2!) & 0xffff;
      ctx.memory_destination = address;
      ctx.destination_is_memory = true;

      cpu_set_register(ctx, "RT_HL", (address - 1) & 0xffff);
      return;
    }

    case "AM_MR":
      ctx.memory_destination = cpu_read_register(ctx, inst.reg_1!) & 0xffff;
      ctx.destination_is_memory = true;

      ctx.fetched_data = bus_read(ctx.memory_destination) & 0xff;
      emu_cycles(1);
      return;

    case "AM_MR_D8":
      ctx.fetched_data = bus_read(r.PC) & 0xff;
      emu_cycles(1);
      r.PC = (r.PC + 1) & 0xffff;

      ctx.memory_destination = cpu_read_register(ctx, inst.reg_1!) & 0xffff;
      ctx.destination_is_memory = true;
      return;

    default:
      throw new Error(
        formatter(
          "Unknown Addressing Mode! %s (%02X)",
          String(inst.mode),
          ctx.current_opcode,
        ),
      );
  }
}