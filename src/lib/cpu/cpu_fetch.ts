import { cpu_context } from "./cpu";
import { bus_read } from "../memory/bus";
import { cpu_read_register, cpu_set_register } from "./cpu_util";

export function fetch_data(ctx: cpu_context): void {
  const inst = ctx.current_instruction;

  if (inst === null) {
    return;
  }

  const r = ctx.registers;

  switch (inst.mode) {
    case "AM_R":
    case "AM_IMP":
    case "AM_MR_R":
    case "AM_MR":
      break;

    case "AM_R_R":
    case "AM_R_MR":
      ctx.fetched_data = cpu_read_register(ctx, inst.reg_2!);
      break;

    case "AM_R_D8":
    case "AM_D8":
      ctx.fetched_data = bus_read(r.PC) & 0xff;
      r.PC = (r.PC + 1) & 0xffff;

      if (inst.type === 19 || inst.type === 20) {
        break;
      }

      ctx.memory_destination = inst.reg_1 === "RT_A" ? r.PC : 0;
      break;

    case "AM_R_D16":
    case "AM_D16":
      ctx.fetched_data = bus_read(r.PC) | (bus_read(r.PC + 1) << 8);
      r.PC = (r.PC + 2) & 0xffff;
      break;

    case "AM_R_A8": {
      const lo = bus_read(r.PC) & 0xff;
      r.PC = (r.PC + 1) & 0xffff;
      ctx.memory_destination = 0xff00 | lo;
      ctx.fetched_data = bus_read(ctx.memory_destination) & 0xff;
      break;
    }

    case "AM_A8_R": {
      ctx.fetched_data = bus_read(r.PC) & 0xff;
      r.PC = (r.PC + 1) & 0xffff;
      ctx.memory_destination = 0xff00 | ctx.fetched_data;
      break;
    }

    case "AM_A16_R":
      ctx.memory_destination = bus_read(r.PC) | (bus_read(r.PC + 1) << 8);
      r.PC = (r.PC + 2) & 0xffff;
      break;

    case "AM_R_A16":
      ctx.memory_destination = bus_read(r.PC) | (bus_read(r.PC + 1) << 8);
      r.PC = (r.PC + 2) & 0xffff;
      ctx.fetched_data = bus_read(ctx.memory_destination) & 0xff;
      break;

    case "AM_A16": {
      const addr = bus_read(r.PC) | (bus_read(r.PC + 1) << 8);
      r.PC = (r.PC + 2) & 0xffff;
      ctx.fetched_data = addr;
      break;
    }

    case "AM_MR_D8": {
      const data = bus_read(r.PC) & 0xff;
      r.PC = (r.PC + 1) & 0xffff;
      const hl = cpu_read_register(ctx, inst.reg_1!);
      ctx.memory_destination = hl;
      ctx.fetched_data = data;
      break;
    }

    case "AM_HL_SPR":
      ctx.fetched_data = bus_read(r.PC) & 0xff;
      r.PC = (r.PC + 1) & 0xffff;
      break;

    case "AM_R_HLI":
      ctx.fetched_data = bus_read(cpu_read_register(ctx, "RT_HL")) & 0xff;
      cpu_set_register(ctx, "RT_HL", (cpu_read_register(ctx, "RT_HL") + 1) & 0xffff);
      break;

    case "AM_R_HLD":
      ctx.fetched_data = bus_read(cpu_read_register(ctx, "RT_HL")) & 0xff;
      cpu_set_register(ctx, "RT_HL", (cpu_read_register(ctx, "RT_HL") - 1) & 0xffff);
      break;

    case "AM_HLI_R":
      ctx.memory_destination = cpu_read_register(ctx, "RT_HL");
      cpu_set_register(ctx, "RT_HL", (ctx.memory_destination + 1) & 0xffff);
      break;

    case "AM_HLD_R":
      ctx.memory_destination = cpu_read_register(ctx, "RT_HL");
      cpu_set_register(ctx, "RT_HL", (ctx.memory_destination - 1) & 0xffff);
      break;
  }
}
