import { XRES, YRES } from "../common";
import { lcd_init } from "../lcd";

export type oam_entry = {
  y: number;
  x: number;
  tile: number;
  attributes: number;
  oam_index: number;
};

export type ppu_context = {
  current_frame: number;
  line_ticks: number;

  video_buffer: Uint32Array;
  vram: Uint8Array;
  oam_ram: oam_entry[];

  decoded_tiles: Uint8Array;
  dirty_tiles: Uint8Array;

  line_sprites: oam_entry[];
  line_sprite_count: number;

  sprite_line_color: Uint32Array;
  sprite_line_color_id: Uint8Array;
  sprite_line_priority: Uint8Array;

  window_line: number;
  line_rendered: boolean;
  window_was_rendered: boolean;
};

const ctx: ppu_context = {
  current_frame: 0,
  line_ticks: 0,

  video_buffer: new Uint32Array(XRES * YRES),
  vram: new Uint8Array(0x2000),
  oam_ram: Array.from({ length: 40 }, (_, i) => ({
    y: 0,
    x: 0,
    tile: 0,
    attributes: 0,
    oam_index: i,
  })),

  decoded_tiles: new Uint8Array(384 * 64),
  dirty_tiles: new Uint8Array(384),

  line_sprites: new Array<oam_entry>(10),
  line_sprite_count: 0,

  sprite_line_color: new Uint32Array(XRES),
  sprite_line_color_id: new Uint8Array(XRES),
  sprite_line_priority: new Uint8Array(XRES),

  window_line: 0,
  line_rendered: false,
  window_was_rendered: false,
};

export function ppu_get_context(): ppu_context {
  return ctx;
}

export function ppu_init(): void {
  ctx.current_frame = 0;
  ctx.line_ticks = 0;
  ctx.line_sprite_count = 0;
  ctx.window_line = 0;
  ctx.line_rendered = false;
  ctx.window_was_rendered = false;

  for (let i = 0; i < 40; i++) {
    const sprite = ctx.oam_ram[i];
    sprite.y = 0;
    sprite.x = 0;
    sprite.tile = 0;
    sprite.attributes = 0;
    sprite.oam_index = i;
  }

  ctx.vram.fill(0);
  ctx.video_buffer.fill(0);
  ctx.decoded_tiles.fill(0);
  ctx.dirty_tiles.fill(1);
  ctx.sprite_line_color.fill(0);
  ctx.sprite_line_color_id.fill(0);
  ctx.sprite_line_priority.fill(0);

  lcd_init();
}

export function ppu_oam_write(address: number, value: number): void {
  const rel = address - 0xfe00;

  if (rel < 0 || rel >= 0xa0) {
    return;
  }

  const index = rel >> 2;
  const offset = rel & 3;
  const sprite = ctx.oam_ram[index];
  value &= 0xff;

  switch (offset) {
    case 0: sprite.y = value; break;
    case 1: sprite.x = value; break;
    case 2: sprite.tile = value; break;
    case 3: sprite.attributes = value; break;
  }
}

export function ppu_oam_read(address: number): number {
  const rel = address - 0xfe00;

  if (rel < 0 || rel >= 0xa0) {
    return 0xff;
  }

  const index = rel >> 2;
  const offset = rel & 3;
  const sprite = ctx.oam_ram[index];

  switch (offset) {
    case 0: return sprite.y;
    case 1: return sprite.x;
    case 2: return sprite.tile;
    case 3: return sprite.attributes;
    default: return 0xff;
  }
}

export function ppu_vram_write(address: number, value: number): void {
  const offset = address - 0x8000;

  if (offset < 0 || offset >= 0x2000) {
    return;
  }

  value &= 0xff;

  if (ctx.vram[offset] === value) {
    return;
  }

  ctx.vram[offset] = value;

  if (offset < 0x1800) {
    ctx.dirty_tiles[offset >> 4] = 1;
  }
}

export function ppu_vram_read(address: number): number {
  const offset = address - 0x8000;

  if (offset < 0 || offset >= 0x2000) {
    return 0xff;
  }

  return ctx.vram[offset];
}

function decode_tile(tile: number): void {
  const tile_base = tile << 4;
  const out_base = tile << 6;
  const vram = ctx.vram;
  const decoded = ctx.decoded_tiles;

  for (let y = 0; y < 8; y++) {
    const lo = vram[tile_base + y * 2];
    const hi = vram[tile_base + y * 2 + 1];
    const row = out_base + y * 8;

    decoded[row]     = ((hi >> 6) & 0x02) | ((lo >> 7) & 0x01);
    decoded[row + 1] = ((hi >> 5) & 0x02) | ((lo >> 6) & 0x01);
    decoded[row + 2] = ((hi >> 4) & 0x02) | ((lo >> 5) & 0x01);
    decoded[row + 3] = ((hi >> 3) & 0x02) | ((lo >> 4) & 0x01);
    decoded[row + 4] = ((hi >> 2) & 0x02) | ((lo >> 3) & 0x01);
    decoded[row + 5] = ((hi >> 1) & 0x02) | ((lo >> 2) & 0x01);
    decoded[row + 6] = ((hi >> 0) & 0x02) | ((lo >> 1) & 0x01);
    decoded[row + 7] = ((hi << 1) & 0x02) | (lo & 0x01);
  }
}

export function ppu_update_dirty_tiles(): void {
  const dirty = ctx.dirty_tiles;

  for (let tile = 0; tile < 384; tile++) {
    if (dirty[tile] === 0) {
      continue;
    }
    dirty[tile] = 0;
    decode_tile(tile);
  }
}

export function ppu_get_tile_pixel(
  tile_index: number,
  tile_x: number,
  tile_y: number,
): number {
  return ctx.decoded_tiles[((tile_index & 0x1ff) << 6) + (tile_y & 7) * 8 + (tile_x & 7)];
}

export function ppu_resolve_bg_tile_index(tile_number: number, lcdc: number): number {
  tile_number &= 0xff;

  if ((lcdc & 0x10) !== 0) {
    return tile_number;
  }

  return tile_number < 128 ? tile_number + 256 : tile_number;
}
