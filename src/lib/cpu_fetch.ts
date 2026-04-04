import { bus_read } from "@/lib/bus";
import { formatter } from "@/lib/common";
import { type cpu_context } from "@/lib/cpu";
import { cpu_read_register, cpu_set_register } from "@/lib/cpu_util";
import { emu_cycles } from "@/lib/emu";

export function fetch_data(ctx: cpu_context): void {
  ctx.memory_destination = 0;
  ctx.destination_is_memory = false;

  if (!ctx.current_instruction) {
    return;
  }

  switch (ctx.current_instruction.mode) {
    case "AM_IMP":
      return;

    case "AM_R":
      ctx.fetched_data = cpu_read_register(ctx, ctx.current_instruction.reg_1!);
      return;

    case "AM_R_R":
      ctx.fetched_data = cpu_read_register(ctx, ctx.current_instruction.reg_2!);
      return;

    case "AM_R_D8":
      ctx.fetched_data = bus_read(ctx.registers.PC);
      emu_cycles(1);
      ctx.registers.PC = (ctx.registers.PC + 1) & 0xffff;
      return;

    case "AM_R_D16":
    case "AM_D16": {
      const lo = bus_read(ctx.registers.PC);
      emu_cycles(1);

      const hi = bus_read((ctx.registers.PC + 1) & 0xffff);
      emu_cycles(1);

      ctx.fetched_data = (lo | (hi << 8)) & 0xffff;
      ctx.registers.PC = (ctx.registers.PC + 2) & 0xffff;
      return;
    }

    case "AM_MR_R":
      ctx.fetched_data = cpu_read_register(ctx, ctx.current_instruction.reg_2!);
      ctx.memory_destination = cpu_read_register(
        ctx,
        ctx.current_instruction.reg_1!,
      );
      ctx.destination_is_memory = true;

      if (ctx.current_instruction.reg_1 === "RT_C") {
        ctx.memory_destination |= 0xff00;
      }

      ctx.memory_destination &= 0xffff;
      return;

    case "AM_R_MR": {
      let address = cpu_read_register(ctx, ctx.current_instruction.reg_2!);

      if (ctx.current_instruction.reg_2 === "RT_C") {
        address |= 0xff00;
      }

      ctx.fetched_data = bus_read(address & 0xffff);
      emu_cycles(1);
      return;
    }

    case "AM_R_HLI":
      ctx.fetched_data = bus_read(
        cpu_read_register(ctx, ctx.current_instruction.reg_2!) & 0xffff,
      );
      emu_cycles(1);
      cpu_set_register(
        ctx,
        "RT_HL",
        (cpu_read_register(ctx, "RT_HL") + 1) & 0xffff,
      );
      return;

    case "AM_R_HLD":
      ctx.fetched_data = bus_read(
        cpu_read_register(ctx, ctx.current_instruction.reg_2!) & 0xffff,
      );
      emu_cycles(1);
      cpu_set_register(
        ctx,
        "RT_HL",
        (cpu_read_register(ctx, "RT_HL") - 1) & 0xffff,
      );
      return;

    case "AM_HLI_R":
      ctx.fetched_data = cpu_read_register(ctx, ctx.current_instruction.reg_2!);
      ctx.memory_destination = cpu_read_register(
        ctx,
        ctx.current_instruction.reg_1!,
      );
      ctx.destination_is_memory = true;
      cpu_set_register(
        ctx,
        "RT_HL",
        (cpu_read_register(ctx, "RT_HL") + 1) & 0xffff,
      );
      return;

    case "AM_HLD_R":
      ctx.fetched_data = cpu_read_register(ctx, ctx.current_instruction.reg_2!);
      ctx.memory_destination = cpu_read_register(
        ctx,
        ctx.current_instruction.reg_1!,
      );
      ctx.destination_is_memory = true;
      cpu_set_register(
        ctx,
        "RT_HL",
        (cpu_read_register(ctx, "RT_HL") - 1) & 0xffff,
      );
      return;

    case "AM_R_A8":
      ctx.fetched_data = bus_read(ctx.registers.PC);
      emu_cycles(1);
      ctx.registers.PC = (ctx.registers.PC + 1) & 0xffff;
      return;

    case "AM_A8_R":
      ctx.memory_destination = bus_read(ctx.registers.PC) | 0xff00;
      ctx.destination_is_memory = true;
      emu_cycles(1);
      ctx.registers.PC = (ctx.registers.PC + 1) & 0xffff;
      return;

    case "AM_HL_SPR":
      ctx.fetched_data = bus_read(ctx.registers.PC);
      emu_cycles(1);
      ctx.registers.PC = (ctx.registers.PC + 1) & 0xffff;
      return;

    case "AM_D8":
      ctx.fetched_data = bus_read(ctx.registers.PC);
      emu_cycles(1);
      ctx.registers.PC = (ctx.registers.PC + 1) & 0xffff;
      return;

    case "AM_A16_R":
    case "AM_D16_R": {
      const lo = bus_read(ctx.registers.PC);
      emu_cycles(1);

      const hi = bus_read((ctx.registers.PC + 1) & 0xffff);
      emu_cycles(1);

      ctx.memory_destination = (lo | (hi << 8)) & 0xffff;
      ctx.destination_is_memory = true;
      ctx.registers.PC = (ctx.registers.PC + 2) & 0xffff;
      ctx.fetched_data = cpu_read_register(ctx, ctx.current_instruction.reg_2!);
      return;
    }

    case "AM_MR_D8":
      ctx.fetched_data = bus_read(ctx.registers.PC);
      emu_cycles(1);
      ctx.registers.PC = (ctx.registers.PC + 1) & 0xffff;
      ctx.memory_destination = cpu_read_register(
        ctx,
        ctx.current_instruction.reg_1!,
      );
      ctx.destination_is_memory = true;
      return;

    case "AM_MR":
      ctx.memory_destination = cpu_read_register(
        ctx,
        ctx.current_instruction.reg_1!,
      );
      ctx.destination_is_memory = true;
      ctx.fetched_data = bus_read(ctx.memory_destination & 0xffff);
      emu_cycles(1);
      return;

    case "AM_R_A16": {
      const lo = bus_read(ctx.registers.PC);
      emu_cycles(1);

      const hi = bus_read((ctx.registers.PC + 1) & 0xffff);
      emu_cycles(1);

      const address = (lo | (hi << 8)) & 0xffff;
      ctx.registers.PC = (ctx.registers.PC + 2) & 0xffff;
      ctx.fetched_data = bus_read(address);
      emu_cycles(1);
      return;
    }

    default:
      throw new Error(
        formatter(
          "Unknown Addressing Mode! %s (%02X)",
          String(ctx.current_instruction.mode),
          ctx.current_opcode,
        ),
      );
  }
}