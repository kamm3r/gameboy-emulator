type dma_context = {
  active: boolean;
  byte: number;
  source_base: number;
  start_delay: number;
};

const ctx: dma_context = {
  active: false,
  byte: 0,
  source_base: 0,
  start_delay: 0,
};

let bus_read_fn: (addr: number) => number;
let oam_write_fn: (addr: number, val: number) => void;

export function dma_init(
  bus_reader: (addr: number) => number,
  oam_writer: (addr: number, val: number) => void,
): void {
  ctx.active = false;
  ctx.byte = 0;
  ctx.source_base = 0;
  ctx.start_delay = 0;
  bus_read_fn = bus_reader;
  oam_write_fn = oam_writer;
}

export function dma_start(start: number): void {
  ctx.active = true;
  ctx.byte = 0;
  ctx.source_base = (start & 0xff) << 8;
  ctx.start_delay = 2;
}

export function dma_tick_batch(m_cycles: number): void {
  if (!ctx.active || m_cycles <= 0) {
    return;
  }

  if (ctx.start_delay > 0) {
    const step = m_cycles < ctx.start_delay ? m_cycles : ctx.start_delay;
    ctx.start_delay -= step;
    m_cycles -= step;
    if (m_cycles <= 0) {
      return;
    }
  }

  const remaining = 0xa0 - ctx.byte;
  const step = m_cycles < remaining ? m_cycles : remaining;
  const source = ctx.source_base;
  let byte = ctx.byte;

  for (let i = 0; i < step; i++, byte++) {
    oam_write_fn(0xfe00 + byte, bus_read_fn(source + byte));
  }

  ctx.byte = byte;

  if (ctx.byte >= 0xa0) {
    ctx.active = false;
  }
}

export function dma_is_active(): boolean {
  return ctx.active;
}
