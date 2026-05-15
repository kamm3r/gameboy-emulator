import { bus_read } from "@/lib/memory/bus";
import { formatter } from "@/lib/common";
import { type cpu_context } from "@/lib/cpu/cpu";
import { cpu_read_register, cpu_set_register } from "@/lib/cpu/cpu_util";
import { emu_cycles } from "@/lib/emu";

export function fetch_data(ctx: cpu_context): void {
  ctx.fetched_data = 0;
  ctx.memory_destination = 0;
  ctx.destination_is_memory = false;

  const inst = ctx.current_instruction;

  if (!inst) {
    return;
  }

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
    case "AM_D8":
    case "AM_HL_SPR":
    case "AM_R_A8":
      ctx.fetched_data = bus_read(ctx.registers.PC) & 0xff;
      emu_cycles(1);
      ctx.registers.PC = (ctx.registers.PC + 1) & 0xffff;
      return;

    case "AM_A8_R":
      ctx.memory_destination = (bus_read(ctx.registers.PC) | 0xff00) & 0xffff;
      ctx.destination_is_memory = true;
      emu_cycles(1);
      ctx.registers.PC = (ctx.registers.PC + 1) & 0xffff;
      return;

    case "AM_R_D16":
    case "AM_D16": {
      const pc = ctx.registers.PC;
      const lo = bus_read(pc) & 0xff;
      emu_cycles(1);
      const hi = bus_read((pc + 1) & 0xffff) & 0xff;
      emu_cycles(1);

      ctx.fetched_data = lo | (hi << 8);
      ctx.registers.PC = (pc + 2) & 0xffff;
      return;
    }

    case "AM_D16_R":
    case "AM_A16_R": {
      const pc = ctx.registers.PC;
      const lo = bus_read(pc) & 0xff;
      emu_cycles(1);
      const hi = bus_read((pc + 1) & 0xffff) & 0xff;
      emu_cycles(1);

      ctx.memory_destination = lo | (hi << 8);
      ctx.destination_is_memory = true;
      ctx.registers.PC = (pc + 2) & 0xffff;
      ctx.fetched_data = cpu_read_register(ctx, inst.reg_2!) & 0xffff;
      return;
    }

    case "AM_R_A16": {
      const pc = ctx.registers.PC;
      const lo = bus_read(pc) & 0xff;
      emu_cycles(1);
      const hi = bus_read((pc + 1) & 0xffff) & 0xff;
      emu_cycles(1);

      const address = lo | (hi << 8);
      ctx.registers.PC = (pc + 2) & 0xffff;

      ctx.fetched_data = bus_read(address) & 0xff;
      emu_cycles(1);
      return;
    }

    case "AM_MR_R":
      ctx.fetched_data = cpu_read_register(ctx, inst.reg_2!) & 0xffff;
      ctx.memory_destination = cpu_read_register(ctx, inst.reg_1!) & 0xffff;
      ctx.destination_is_memory = true;

      if (inst.reg_1 === "RT_C") {
        ctx.memory_destination = (ctx.memory_destination | 0xff00) & 0xffff;
      }

      return;

    case "AM_R_MR": {
      let address = cpu_read_register(ctx, inst.reg_2!) & 0xffff;

      if (inst.reg_2 === "RT_C") {
        address = (address | 0xff00) & 0xffff;
      }

      emu_cycles(1);
      ctx.fetched_data = bus_read(address) & 0xff;
      return;
    }

    case "AM_R_HLI": {
      const address = cpu_read_register(ctx, inst.reg_2!) & 0xffff;

      emu_cycles(1);
      ctx.fetched_data = bus_read(address) & 0xff;

      cpu_set_register(ctx, "RT_HL", (address + 1) & 0xffff);
      return;
    }

    case "AM_R_HLD": {
      const address = cpu_read_register(ctx, inst.reg_2!) & 0xffff;

      emu_cycles(1);
      ctx.fetched_data = bus_read(address) & 0xff;

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

      emu_cycles(1);
      ctx.fetched_data = bus_read(ctx.memory_destination) & 0xff;
      return;

    case "AM_MR_D8":
      ctx.fetched_data = bus_read(ctx.registers.PC) & 0xff;
      emu_cycles(1);
      ctx.registers.PC = (ctx.registers.PC + 1) & 0xffff;

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
