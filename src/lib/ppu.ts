import { lcd_get_context, lcd_init } from "./lcd";
import { BETWEEN } from "./common";

const XRES = 160;
const YRES = 144;

export type oam_entry = {
  y: number;
  x: number;
  tile: number;
  attributes: number;
};

export type ppu_context = {
  current_frame: number;
  line_ticks: number;
  video_buffer: number[];
  vram: number[];
  oam_ram: oam_entry[];
  pfc: {
    line_x: number;
    pushed_x: number;
    fetch_x: number;
    fifo_x: number;
    pixel_fifo: {
      size: number;
    };
    cur_fetch_state: number;
  };
  line_sprites: number;
  fetched_entry_count: number;
  window_line: number;
};

const ctx: ppu_context = {
  current_frame: 0,
  line_ticks: 0,
  video_buffer: new Array(YRES * XRES).fill(0),
  vram: new Array(0x2000).fill(0),
  oam_ram: new Array(40).fill({ y: 0, x: 0, tile: 0, attributes: 0 }),
  pfc: {
    line_x: 0,
    pushed_x: 0,
    fetch_x: 0,
    fifo_x: 0,
    pixel_fifo: {
      size: 0,
    },
    cur_fetch_state: 0,
  },
  line_sprites: 0,
  fetched_entry_count: 0,
  window_line: 0,
};

export function ppu_get_context(): ppu_context {
  return ctx;
}

export function ppu_init(): void {
  ctx.current_frame = 0;
  ctx.line_ticks = 0;
  ctx.video_buffer = new Array(YRES * XRES).fill(0);

  ctx.pfc.line_x = 0;
  ctx.pfc.pushed_x = 0;
  ctx.pfc.fetch_x = 0;
  ctx.pfc.pixel_fifo.size = 0;
  ctx.pfc.cur_fetch_state = 0;

  ctx.line_sprites = 0;
  ctx.fetched_entry_count = 0;
  ctx.window_line = 0;

  lcd_init();
}

const MODE_OAM = 2;
const MODE_XFER = 3;
const MODE_VBLANK = 1;
const MODE_HBLANK = 0;

function get_lcds_mode(): number {
  return (lcd_get_context().ly >> 8) & 0x3;
}

function set_lcds_mode(mode: number): void {
  const lcd = lcd_get_context();
  lcd.ly = (lcd.ly & 0xfc) | mode;
}

function ppu_mode_oam(): void {
  if (ctx.line_ticks >= 80) {
    set_lcds_mode(MODE_XFER);
    ctx.pfc.cur_fetch_state = 0;
    ctx.pfc.line_x = 0;
    ctx.pfc.fetch_x = 0;
    ctx.pfc.pushed_x = 0;
    ctx.pfc.fifo_x = 0;
  }
}

function ppu_mode_xfer(): void {
  // Simplified - full implementation would have pixel fetching pipeline
  if (ctx.pfc.pushed_x >= XRES) {
    set_lcds_mode(MODE_HBLANK);
  }
}

function ppu_mode_vblank(): void {
  const lcd = lcd_get_context();
  
  if (ctx.line_ticks >= 456) {
    ctx.line_ticks = 0;
    lcd.ly++;

    if (lcd.ly >= 154) {
      set_lcds_mode(MODE_OAM);
      lcd.ly = 0;
      ctx.window_line = 0;
    }
  }
}

function ppu_mode_hblank(): void {
  const lcd = lcd_get_context();
  
  if (ctx.line_ticks >= 456) {
    ctx.line_ticks = 0;
    lcd.ly++;

    if (lcd.ly >= 144) {
      set_lcds_mode(MODE_VBLANK);
      ctx.current_frame++;
    } else {
      set_lcds_mode(MODE_OAM);
    }
  }
}

export function ppu_tick(): void {
  ctx.line_ticks++;

  const mode = get_lcds_mode();
  switch (mode) {
    case MODE_OAM:
      ppu_mode_oam();
      break;
    case MODE_XFER:
      ppu_mode_xfer();
      break;
    case MODE_VBLANK:
      ppu_mode_vblank();
      break;
    case MODE_HBLANK:
      ppu_mode_hblank();
      break;
  }
}

export function ppu_oam_write(address: number, value: number): void {
  if (address >= 0xfe00) {
    address -= 0xfe00;
  }

  const index = Math.floor(address / 4);
  const offset = address % 4;
  
  if (index < 40) {
    const entry = ctx.oam_ram[index];
    if (offset === 0) entry.y = value;
    else if (offset === 1) entry.x = value;
    else if (offset === 2) entry.tile = value;
    else if (offset === 3) entry.attributes = value;
  }
}

export function ppu_oam_read(address: number): number {
  if (address >= 0xfe00) {
    address -= 0xfe00;
  }

  const index = Math.floor(address / 4);
  const offset = address % 4;
  
  if (index < 40) {
    const entry = ctx.oam_ram[index];
    if (offset === 0) return entry.y;
    else if (offset === 1) return entry.x;
    else if (offset === 2) return entry.tile;
    else if (offset === 3) return entry.attributes;
  }
  return 0;
}

export function ppu_vram_write(address: number, value: number): void {
  ctx.vram[address - 0x8000] = value;
}

export function ppu_vram_read(address: number): number {
  return ctx.vram[address - 0x8000];
}
