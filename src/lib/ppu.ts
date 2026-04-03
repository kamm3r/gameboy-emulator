import { lcd_get_context, lcd_init, lcd_context } from "./lcd";
import { bus_read, bus_write } from "./bus";
import { BETWEEN } from "./common";

const XRES = 160;
const YRES = 144;

export type fifo_entry = {
  value: number;
  next: fifo_entry | null;
};

export type oam_line_entry = {
  entry: oam_entry;
  next: oam_line_entry | null;
};

export type fetched_sprite = {
  x: number;
  y: number;
  tile: number;
  f_x_flip: number;
  f_y_flip: number;
  f_pn: number;
  f_bgp: number;
};

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
      head: fifo_entry | null;
      tail: fifo_entry | null;
    };
    cur_fetch_state: number;
    map_y: number;
    map_x: number;
    tile_y: number;
    bgw_fetch_data: number[];
    fetch_entry_data: number[];
  };
  line_sprites: oam_line_entry | null;
  line_entry_array: oam_line_entry[];
  line_sprite_count: number;
  fetched_entry_count: number;
  fetched_entries: fetched_sprite[];
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
      head: null,
      tail: null,
    },
    cur_fetch_state: 0,
    map_y: 0,
    map_x: 0,
    tile_y: 0,
    bgw_fetch_data: [0, 0, 0],
    fetch_entry_data: new Array(16).fill(0),
  },
  line_sprites: null,
  line_entry_array: [],
  line_sprite_count: 0,
  fetched_entry_count: 0,
  fetched_entries: [],
  window_line: 0,
};

export function ppu_get_context(): ppu_context {
  return ctx;
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

export function ppu_init(): void {
  ctx.current_frame = 0;
  ctx.line_ticks = 0;
  ctx.video_buffer = new Array(YRES * XRES).fill(0);

  ctx.pfc.line_x = 0;
  ctx.pfc.pushed_x = 0;
  ctx.pfc.fetch_x = 0;
  ctx.pfc.pixel_fifo.size = 0;
  ctx.pfc.pixel_fifo.head = null;
  ctx.pfc.pixel_fifo.tail = null;
  ctx.pfc.cur_fetch_state = 0;
  ctx.pfc.map_y = 0;
  ctx.pfc.map_x = 0;
  ctx.pfc.tile_y = 0;
  ctx.pfc.bgw_fetch_data = [0, 0, 0];
  ctx.pfc.fetch_entry_data = new Array(16).fill(0);

  ctx.line_sprites = null;
  ctx.line_entry_array = [];
  ctx.line_sprite_count = 0;
  ctx.fetched_entry_count = 0;
  ctx.fetched_entries = [];
  ctx.window_line = 0;

  lcd_init();
  set_lcds_mode(MODE_OAM);
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
