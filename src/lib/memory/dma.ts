import { bus_read } from "@/lib/memory/bus";
import { ppu_oam_write } from "@/lib/ppu/ppu";

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
  ctx.value = start & 0xff;
}

export function dma_tick_batch(m_cycles: number): void {
  while (m_cycles > 0 && ctx.active) {
    if (ctx.start_delay > 0) {
      const step = Math.min(m_cycles, ctx.start_delay);

      ctx.start_delay -= step;
      m_cycles -= step;
      continue;
    }

    const remaining_bytes = 0xa0 - ctx.byte;
    const step = Math.min(m_cycles, remaining_bytes);
    const source_base = ctx.value << 8;

    for (let i = 0; i < step; i++) {
      const byte = ctx.byte;

      ppu_oam_write(0xfe00 + byte, bus_read(source_base + byte));
      ctx.byte = byte + 1;
    }

    m_cycles -= step;
    ctx.active = ctx.byte < 0xa0;
  }
}

export function dma_tick(): void {
  dma_tick_batch(1);
}

export function dma_transferring(): boolean {
  return ctx.active;
}