import { audio_on_div_falling_edge } from "@/lib/audio/apu";
import { cpu_request_interrupt } from "@/lib/cpu";

export const IT_TIMER = 0x04;

export type timer_context = {
  div: number;
  tima: number;
  tma: number;
  tac: number;
};

let ctx: timer_context = {
  div: 0,
  tima: 0,
  tma: 0,
  tac: 0,
};

let system_counter = 0xac00;
let div_apu_counter = 0;

export function timer_get_context(): timer_context {
  return {
    ...ctx,
    div: (system_counter >> 8) & 0xff,
  };
}

export function timer_init(): void {
  ctx.div = 0;
  ctx.tima = 0;
  ctx.tma = 0;
  ctx.tac = 0;
  system_counter = 0xac00;
  div_apu_counter = 0;
}

function timer_enabled(): boolean {
  return (ctx.tac & 0x04) !== 0;
}

function timer_bit_index(): number {
  switch (ctx.tac & 0x03) {
    case 0:
      return 9;
    case 1:
      return 3;
    case 2:
      return 5;
    case 3:
      return 7;
  }
  return 9;
}

export function timer_tick(): void {
  const prev_system = system_counter;
  system_counter = (system_counter + 1) & 0xffff;

  div_apu_counter++;
  if (div_apu_counter >= 16) {
    div_apu_counter = 0;
    if ((prev_system & (1 << 9)) !== 0 && (system_counter & (1 << 9)) === 0) {
      audio_on_div_falling_edge();
    }
  }

  const bit_idx = timer_bit_index();
  const prev_bit = (prev_system >> bit_idx) & 1;
  const curr_bit = (system_counter >> bit_idx) & 1;
  const timer_update = prev_bit === 1 && curr_bit === 0;

  if (timer_update && timer_enabled()) {
    if (ctx.tima === 0xff) {
      ctx.tima = ctx.tma;
      cpu_request_interrupt(IT_TIMER);
    } else {
      ctx.tima = (ctx.tima + 1) & 0xff;
    }
  }
}

let prev_tac_enabled = false;

export function timer_write(address: number, value: number): void {
  switch (address) {
    case 0xff04: {
      const prev_system = system_counter;
      system_counter = 0;
      div_apu_counter = 0;

      if ((prev_system & (1 << 9)) !== 0) {
        audio_on_div_falling_edge();
      }

      break;
    }

    case 0xff05:
      ctx.tima = value & 0xff;
      break;

    case 0xff06:
      ctx.tma = value & 0xff;
      break;

    case 0xff07: {
      const new_tac = value & 0x07;
      const new_enabled = (new_tac & 0x04) !== 0;
      const clock_select_changed = (new_tac & 0x03) !== (ctx.tac & 0x03);

      if (clock_select_changed && prev_tac_enabled && !new_enabled) {
        const bit_idx = timer_bit_index();
        if ((system_counter & (1 << bit_idx)) !== 0) {
          if (ctx.tima === 0xff) {
            ctx.tima = ctx.tma;
            cpu_request_interrupt(IT_TIMER);
          } else {
            ctx.tima = (ctx.tima + 1) & 0xff;
          }
        }
      }

      prev_tac_enabled = new_enabled;
      ctx.tac = new_tac;
      break;
    }
  }
}

export function timer_read(address: number): number {
  switch (address) {
    case 0xff04:
      return (system_counter >> 8) & 0xff;
    case 0xff05:
      return ctx.tima;
    case 0xff06:
      return ctx.tma;
    case 0xff07:
      return ctx.tac;
  }

  return 0;
}