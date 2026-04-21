import { ppu_oam_write } from "@/lib/ppu";
import { bus_read } from "@/lib/bus";

type dma_context = {
  active: boolean;
  byte: number;
  value: number;
  start_delay: number;
};

const ctx: dma_context = {
  active: false,
  byte: 0,
  value: 0,
  start_delay: 0,
};

export function dma_start(start: number): void {
  ctx.active = true;
  ctx.byte = 0;
  ctx.start_delay = 2;
  ctx.value = start;
}

export function dma_tick(): void {
  if (!ctx.active) {
    return;
  }

  if (ctx.start_delay) {
    ctx.start_delay--;
    return;
  }

  ppu_oam_write(0xfe00 + ctx.byte, bus_read(ctx.value * 0x100 + ctx.byte));

  ctx.byte++;

  ctx.active = ctx.byte < 0xa0;
}

export function dma_transferring(): boolean {
  return ctx.active;
}
