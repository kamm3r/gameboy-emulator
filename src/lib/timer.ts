import { cpu_request_interrupt } from "@/lib/cpu";

export const IT_TIMER = 0x04;

export type timer_context = {
  div: number;
  tima: number;
  tma: number;
  tac: number;
};

const ctx: timer_context = {
  div: 0xac00,
  tima: 0,
  tma: 0,
  tac: 0,
};

export function timer_get_context(): timer_context {
  return ctx;
}

export function timer_init(): void {
  ctx.div = 0xac00;
  ctx.tima = 0;
  ctx.tma = 0;
  ctx.tac = 0;
}

export function timer_tick(): void {
  const prev_div = ctx.div;
  ctx.div = (ctx.div + 1) & 0xffff;

  let timer_update = false;

  switch (ctx.tac & 0b11) {
    case 0b00:
      timer_update = (prev_div & (1 << 9)) !== 0 && (ctx.div & (1 << 9)) === 0;
      break;
    case 0b01:
      timer_update = (prev_div & (1 << 3)) !== 0 && (ctx.div & (1 << 3)) === 0;
      break;
    case 0b10:
      timer_update = (prev_div & (1 << 5)) !== 0 && (ctx.div & (1 << 5)) === 0;
      break;
    case 0b11:
      timer_update = (prev_div & (1 << 7)) !== 0 && (ctx.div & (1 << 7)) === 0;
      break;
  }

  if (timer_update && (ctx.tac & (1 << 2))) {
    if (ctx.tima === 0xff) {
      ctx.tima = ctx.tma & 0xff;
      cpu_request_interrupt(IT_TIMER);
    } else {
      ctx.tima = (ctx.tima + 1) & 0xff;
    }
  }
}

export function timer_write(address: number, value: number): void {
  switch (address) {
    case 0xff04:
      ctx.div = 0;
      break;
    case 0xff05:
      ctx.tima = value & 0xff;
      break;
    case 0xff06:
      ctx.tma = value & 0xff;
      break;
    case 0xff07:
      ctx.tac = value & 0x07;
      break;
  }
}

export function timer_read(address: number): number {
  switch (address) {
    case 0xff04:
      return (ctx.div >> 8) & 0xff;
    case 0xff05:
      return ctx.tima;
    case 0xff06:
      return ctx.tma;
    case 0xff07:
      return ctx.tac;
  }
  return 0;
}
