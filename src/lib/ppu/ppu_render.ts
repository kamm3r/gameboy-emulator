import { lcd_get_context } from "../lcd";
import {
  XRES,
  YRES,
  oam_entry,
  ppu_get_context,
  ppu_resolve_bg_tile_index,
} from "./ppu";

type sprite_pixel = {
  color_id: number;
  color: number;
  bg_priority: boolean;
};

function get_sprite_pixel(
  sprite: oam_entry,
  screen_x: number,
  screen_y: number,
  sprite_height: number,
  vram: Uint8Array,
  sp1_colors: [number, number, number, number],
  sp2_colors: [number, number, number, number],
): sprite_pixel | null {
  const sprite_x = sprite.x - 8;
  const sprite_y = sprite.y - 16;

  let px = screen_x - sprite_x;
  let py = screen_y - sprite_y;

  if (px < 0 || px >= 8 || py < 0 || py >= sprite_height) {
    return null;
  }

  const attr = sprite.attributes;

  if ((attr & 0x20) !== 0) {
    px = 7 - px;
  }

  if ((attr & 0x40) !== 0) {
    py = sprite_height - 1 - py;
  }

  let tile = sprite.tile;

  if (sprite_height === 16) {
    tile &= 0xfe;

    if (py >= 8) {
      tile++;
      py -= 8;
    }
  }

  const row_addr = (tile << 4) + py * 2;
  const low = vram[row_addr];
  const high = vram[row_addr + 1];
  const bit = 7 - px;

  const color_id =
    ((low >> bit) & 0x01) | (((high >> bit) & 0x01) << 1);

  if (color_id === 0) {
    return null;
  }

  const palette = (attr & 0x10) !== 0 ? sp2_colors : sp1_colors;

  return {
    color_id,
    color: palette[color_id],
    bg_priority: (attr & 0x80) !== 0,
  };
}

function find_top_sprite_pixel(
  sprites: oam_entry[],
  sprite_count: number,
  screen_x: number,
  screen_y: number,
  sprite_height: number,
  vram: Uint8Array,
  sp1_colors: [number, number, number, number],
  sp2_colors: [number, number, number, number],
): sprite_pixel | null {
  for (let i = 0; i < sprite_count; i++) {
    const sprite = sprites[i];
    const sprite_x = sprite.x - 8;

    if (screen_x < sprite_x || screen_x >= sprite_x + 8) {
      continue;
    }

    const pixel = get_sprite_pixel(
      sprite,
      screen_x,
      screen_y,
      sprite_height,
      vram,
      sp1_colors,
      sp2_colors,
    );

    if (pixel) {
      return pixel;
    }
  }

  return null;
}

export function render_scanline(): void {
  const lcd = lcd_get_context();
  const ppu = ppu_get_context();

  const ly = lcd.ly;

  if (ly >= YRES) {
    ppu.window_was_rendered = false;
    return;
  }

  const lcdc = lcd.lcdc;
  const vram = ppu.vram;
  const decoded_tiles = ppu.decoded_tiles;
  const video_buffer = ppu.video_buffer;

  const bg_colors = lcd.bg_colors;
  const sp1_colors = lcd.sp1_colors;
  const sp2_colors = lcd.sp2_colors;

  const bg_enabled = (lcdc & 0x01) !== 0;
  const obj_enabled = (lcdc & 0x02) !== 0;
  const sprite_height = (lcdc & 0x04) !== 0 ? 16 : 8;

  const bg_map_base = (lcdc & 0x08) !== 0 ? 0x1c00 : 0x1800;
  const signed_tile_mode = (lcdc & 0x10) === 0;

  const win_enabled = (lcdc & 0x20) !== 0;
  const win_map_base = (lcdc & 0x40) !== 0 ? 0x1c00 : 0x1800;
  const win_left = lcd.win_x - 7;

  const window_visible =
    bg_enabled && win_enabled && lcd.win_x <= 166 && lcd.win_y < YRES;

  const line_offset = ly * XRES;

  const scx = lcd.scroll_x;
  const scy = lcd.scroll_y;
  const wy = lcd.win_y;
  const window_line = ppu.window_line;

  const line_sprites = ppu.line_sprites;
  const line_sprite_count = ppu.line_sprite_count;

  let used_window = false;

  for (let x = 0; x < XRES; x++) {
    let bg_color_id = 0;
    let final_color = bg_colors[0];

    const use_window = window_visible && ly >= wy && x >= win_left;

    if (use_window) {
      used_window = true;
    }

    if (bg_enabled) {
      let pixel_x: number;
      let pixel_y: number;
      let map_base: number;

      if (use_window) {
        pixel_x = x - win_left;
        pixel_y = window_line;
        map_base = win_map_base;
      } else {
        pixel_x = (x + scx) & 0xff;
        pixel_y = (ly + scy) & 0xff;
        map_base = bg_map_base;
      }

      const tile_col = pixel_x >> 3;
      const tile_row = pixel_y >> 3;
      const tile_x = pixel_x & 7;
      const tile_y = pixel_y & 7;

      const tile_id = vram[map_base + tile_row * 32 + tile_col];

      const tile_index = signed_tile_mode
        ? ppu_resolve_bg_tile_index(tile_id, lcdc)
        : tile_id;

      bg_color_id = decoded_tiles[(tile_index << 6) + tile_y * 8 + tile_x];
      final_color = bg_colors[bg_color_id];
    }

    if (obj_enabled && line_sprite_count > 0) {
      const sprite = find_top_sprite_pixel(
        line_sprites,
        line_sprite_count,
        x,
        ly,
        sprite_height,
        vram,
        sp1_colors,
        sp2_colors,
      );

      if (sprite && (!sprite.bg_priority || bg_color_id === 0)) {
        final_color = sprite.color;
      }
    }

    video_buffer[line_offset + x] = final_color;
  }

  ppu.window_was_rendered = used_window;
}