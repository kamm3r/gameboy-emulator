import { audio_on_div_falling_edge } from "@/lib/audio/apu";
import { cpu_request_interrupt } from "@/lib/cpu/cpu";

export const IT_TIMER = 0x04;

export type timer_context = {
  div: number;
  tima: number;
  tma: number;
  tac: number;
};

const DIV_INIT = 0xac00;

const ctx: timer_context = {
  div: DIV_INIT,
  tima: 0,
  tma: 0,
  tac: 0,
};

const TIMER_BITS = [9, 3, 5, 7] as const;
const TIMER_ENABLE = 0x04;
const APU_DIV_BIT = 1 << 12;

function selected_timer_bit(tac = ctx.tac): number {
  return TIMER_BITS[tac & 0x03];
}

function timer_signal(div = ctx.div, tac = ctx.tac): boolean {
  return (tac & TIMER_ENABLE) !== 0 && (div & (1 << selected_timer_bit(tac))) !== 0;
}

function clock_apu_if_needed(prevDiv: number, nextDiv: number): void {
  if ((prevDiv & APU_DIV_BIT) !== 0 && (nextDiv & APU_DIV_BIT) === 0) {
    audio_on_div_falling_edge();
  }
}

function increment_tima(): void {
  const next = ctx.tima + 1;

  if (next > 0xff) {
    ctx.tima = ctx.tma;
    cpu_request_interrupt(IT_TIMER);
  } else {
    ctx.tima = next;
  }
}

function apply_timer_edge(prevSignal: boolean, nextSignal: boolean): void {
  if (prevSignal && !nextSignal) {
    increment_tima();
  }
}

export function timer_get_context(): timer_context {
  return ctx;
}

export function timer_init(): void {
  ctx.div = DIV_INIT;
  ctx.tima = 0;
  ctx.tma = 0;
  ctx.tac = 0;
}

export function timer_tick(): void {
  const prevDiv = ctx.div;
  const prevSignal = timer_signal(prevDiv, ctx.tac);

  ctx.div = (prevDiv + 1) & 0xffff;

  clock_apu_if_needed(prevDiv, ctx.div);
  apply_timer_edge(prevSignal, timer_signal(ctx.div, ctx.tac));
}

export function timer_write(address: number, value: number): void {
  value &= 0xff;

  switch (address & 0xffff) {
    case 0xff04: {
      const prevDiv = ctx.div;
      const prevSignal = timer_signal(prevDiv, ctx.tac);

      ctx.div = 0;

      clock_apu_if_needed(prevDiv, 0);
      apply_timer_edge(prevSignal, timer_signal(0, ctx.tac));
      break;
    }

    case 0xff05:
      ctx.tima = value;
      break;

    case 0xff06:
      ctx.tma = value;
      break;

    case 0xff07: {
      const oldTac = ctx.tac;
      const oldSignal = timer_signal(ctx.div, oldTac);

      ctx.tac = value & 0x07;

      apply_timer_edge(oldSignal, timer_signal(ctx.div, ctx.tac));
      break;
    }
  }
}

export function timer_read(address: number): number {
  switch (address & 0xffff) {
    case 0xff04:
      return ctx.div >> 8;

    case 0xff05:
      return ctx.tima;

    case 0xff06:
      return ctx.tma;

    case 0xff07:
      return 0xf8 | ctx.tac;

    default:
      return 0xff;
  }
}