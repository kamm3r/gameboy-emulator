import { lcd_init } from "./lcd";

export const XRES = 160;
export const YRES = 144;

export type fifo_entry = {
  value: number;
  next: fifo_entry | null;
};

export type oam_entry = {
  y: number;
  x: number;
  tile: number;
  attributes: number;
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

export type ppu_context = {
  current_frame: number;
  line_ticks: number;
  video_buffer: Uint32Array;
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
    fetching_window: boolean;
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
  video_buffer: new Uint32Array(YRES * XRES),
  vram: new Array(0x2000).fill(0),
  oam_ram: Array.from({ length: 40 }, () => ({
    y: 0,
    x: 0,
    tile: 0,
    attributes: 0,
  })),
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
    fetching_window: false,
    bgw_fetch_data: [0, 0, 0],
    fetch_entry_data: new Array(20).fill(0),
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

export function ppu_init(): void {
  ctx.current_frame = 0;
  ctx.line_ticks = 0;
  ctx.video_buffer = new Uint32Array(YRES * XRES);

  ctx.pfc.line_x = 0;
  ctx.pfc.pushed_x = 0;
  ctx.pfc.fetch_x = 0;
  ctx.pfc.fifo_x = 0;
  ctx.pfc.pixel_fifo.size = 0;
  ctx.pfc.pixel_fifo.head = null;
  ctx.pfc.pixel_fifo.tail = null;
  ctx.pfc.cur_fetch_state = 0;
  ctx.pfc.map_y = 0;
  ctx.pfc.map_x = 0;
  ctx.pfc.tile_y = 0;
  ctx.pfc.fetching_window = false;
  ctx.pfc.bgw_fetch_data = [0, 0, 0];
  ctx.pfc.fetch_entry_data = new Array(20).fill(0);

  ctx.line_sprites = null;
  ctx.line_entry_array = [];
  ctx.line_sprite_count = 0;
  ctx.fetched_entry_count = 0;
  ctx.fetched_entries = [];
  ctx.window_line = 0;

  for (let i = 0; i < ctx.oam_ram.length; i++) {
    ctx.oam_ram[i] = { y: 0, x: 0, tile: 0, attributes: 0 };
  }

  ctx.vram.fill(0);
  ctx.video_buffer.fill(0);

  lcd_init();
}

export function ppu_oam_write(address: number, value: number): void {
  if (address < 0xfe00 || address > 0xfe9f) {
    throw new Error(
      `ppu_oam_write out of range: 0x${address.toString(16).padStart(4, "0")}`,
    );
  }

  const rel = address - 0xfe00;
  const index = Math.floor(rel / 4);
  const offset = rel % 4;

  const entry = ctx.oam_ram[index];

  switch (offset) {
    case 0:
      entry.y = value & 0xff;
      break;
    case 1:
      entry.x = value & 0xff;
      break;
    case 2:
      entry.tile = value & 0xff;
      break;
    case 3:
      entry.attributes = value & 0xff;
      break;
  }
}

export function ppu_oam_read(address: number): number {
  if (address < 0xfe00 || address > 0xfe9f) {
    throw new Error(
      `ppu_oam_read out of range: 0x${address.toString(16).padStart(4, "0")}`,
    );
  }

  const rel = address - 0xfe00;
  const index = Math.floor(rel / 4);
  const offset = rel % 4;

  const entry = ctx.oam_ram[index];

  switch (offset) {
    case 0:
      return entry.y & 0xff;
    case 1:
      return entry.x & 0xff;
    case 2:
      return entry.tile & 0xff;
    case 3:
      return entry.attributes & 0xff;
    default:
      return 0xff;
  }
}

export function ppu_vram_write(address: number, value: number): void {
  if (address < 0x8000 || address > 0x9fff) {
    throw new Error(
      `ppu_vram_write out of range: 0x${address.toString(16).padStart(4, "0")}`,
    );
  }

  ctx.vram[address - 0x8000] = value & 0xff;
}

export function ppu_vram_read(address: number): number {
  if (address < 0x8000 || address > 0x9fff) {
    throw new Error(
      `ppu_vram_read out of range: 0x${address.toString(16).padStart(4, "0")}`,
    );
  }

  return ctx.vram[address - 0x8000] & 0xff;
}