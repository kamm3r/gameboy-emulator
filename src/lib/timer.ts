import { CPU_HZ } from "./common";

type timer_context = {
  div: number;
  tima: number;
  tma: number;
  tac: number;
  div_counter: number;
  tima_counter: number;
  tima_overflow: boolean;
};

const ctx: timer_context = {
  div: 0xabcc,
  tima: 0,
  tma: 0,
  tac: 0,
  div_counter: 0,
  tima_counter: 0,
  tima_overflow: false,
};

let request_interrupt: (flag: number) => void;

const TAC_RATES = [9, 3, 5, 7];

export function timer_init(irq: (flag: number) => void): void {
  ctx.div = 0xabcc;
  ctx.tima = 0;
  ctx.tma = 0;
  ctx.tac = 0;
  ctx.div_counter = 0;
  ctx.tima_counter = 0;
  ctx.tima_overflow = false;
  request_interrupt = irq;
}

export function timer_tick(t_cycles: number): void {
  ctx.div_counter += t_cycles;

  while (ctx.div_counter >= 1) {
    ctx.div_counter--;
    ctx.div = (ctx.div + 1) & 0xffff;
  }

  const tac_enabled = (ctx.tac & 0x04) !== 0;

  if (!tac_enabled) {
    ctx.tima_counter = 0;
    return;
  }

  const rate = TAC_RATES[ctx.tac & 0x03];
  ctx.tima_counter += t_cycles;

  const ticks_needed = 1 << rate;

  while (ctx.tima_counter >= ticks_needed) {
    ctx.tima_counter -= ticks_needed;

    if (ctx.tima_overflow) {
      ctx.tima = ctx.tma;
      ctx.tima_overflow = false;
      request_interrupt(INT_TIMER);
    } else {
      ctx.tima = (ctx.tima + 1) & 0xff;

      if (ctx.tima === 0) {
        ctx.tima_overflow = true;
      }
    }
  }
}

const INT_TIMER = 0x04;

export function timer_read(address: number): number {
  switch (address & 0xff) {
    case 0x04: return (ctx.div >>> 8) & 0xff;
    case 0x05: return ctx.tima;
    case 0x06: return ctx.tma;
    case 0x07: return ctx.tac | 0xf8;
    default: return 0xff;
  }
}

export function timer_write(address: number, value: number): void {
  switch (address & 0xff) {
    case 0x04:
      ctx.div = 0;
      break;
    case 0x05:
      if (ctx.tima_overflow) {
        ctx.tima_overflow = false;
      } else {
        ctx.tima = value;
      }
      break;
    case 0x06:
      ctx.tma = value;
      if (ctx.tima_overflow) {
        ctx.tima = value;
      }
      break;
    case 0x07:
      ctx.tac = value & 0x07;
      break;
  }
}

export function timer_get_div(): number {
  return ctx.div;
}
