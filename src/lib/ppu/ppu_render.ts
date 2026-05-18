import { XRES, YRES } from "../common";
import { lcd_get_context } from "../lcd";
import {
  oam_entry,
  ppu_get_context,
  ppu_resolve_bg_tile_index,
  ppu_update_dirty_tiles,
} from "./ppu";

const bg_line_color_id = new Uint8Array(XRES);

function clear_sprite_line_buffers(): void {
  const ppu = ppu_get_context();
  ppu.sprite_line_color.fill(0);
  ppu.sprite_line_color_id.fill(0);
  ppu.sprite_line_priority.fill(0);
}

function draw_sprite_to_line(
  sprite: oam_entry,
  screen_y: number,
  sprite_height: number,
  decoded_tiles: Uint8Array,
  sprite_line_color: Uint32Array,
  sprite_line_color_id: Uint8Array,
  sprite_line_priority: Uint8Array,
  sp1_colors: [number, number, number, number],
  sp2_colors: [number, number, number, number],
): void {
  const sprite_x = sprite.x - 8;
  const sprite_y = sprite.y - 16;

  let py = screen_y - sprite_y;

  if (py < 0 || py >= sprite_height) {
    return;
  }

  const attr = sprite.attributes;
  const y_flip = (attr & 0x40) !== 0;
  const x_flip = (attr & 0x20) !== 0;
  const bg_priority = (attr & 0x80) !== 0 ? 1 : 0;
  const palette = (attr & 0x10) !== 0 ? sp2_colors : sp1_colors;

  if (y_flip) {
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

  tile &= 0xff;

  const tile_row_base = (tile << 6) + py * 8;

  let start_x = sprite_x;
  let end_x = sprite_x + 8;

  if (start_x < 0) start_x = 0;
  if (end_x > XRES) end_x = XRES;

  for (let x = start_x; x < end_x; x++) {
    const local_x = x - sprite_x;
    const px = x_flip ? 7 - local_x : local_x;
    const color_id = decoded_tiles[tile_row_base + px];

    if (color_id === 0) {
      continue;
    }

    sprite_line_color_id[x] = color_id;
    sprite_line_color[x] = palette[color_id];
    sprite_line_priority[x] = bg_priority;
  }
}

function render_sprite_line(
  screen_y: number,
  sprite_height: number,
  decoded_tiles: Uint8Array,
  sp1_colors: [number, number, number, number],
  sp2_colors: [number, number, number, number],
): void {
  const ppu = ppu_get_context();

  clear_sprite_line_buffers();

  const line_sprites = ppu.line_sprites;
  const line_sprite_count = ppu.line_sprite_count;

  const sprite_line_color = ppu.sprite_line_color;
  const sprite_line_color_id = ppu.sprite_line_color_id;
  const sprite_line_priority = ppu.sprite_line_priority;

  for (let i = line_sprite_count - 1; i >= 0; i--) {
    draw_sprite_to_line(
      line_sprites[i],
      screen_y,
      sprite_height,
      decoded_tiles,
      sprite_line_color,
      sprite_line_color_id,
      sprite_line_priority,
      sp1_colors,
      sp2_colors,
    );
  }
}

export function render_scanline(): void {
  const lcd = lcd_get_context();
  const ppu = ppu_get_context();

  const ly = lcd.ly;

  if (ly >= YRES) {
    ppu.window_was_rendered = false;
    return;
  }

  ppu_update_dirty_tiles();

  const lcdc = lcd.lcdc;
  const decoded_tiles = ppu.decoded_tiles;
  const video_buffer = ppu.video_buffer;

  const bg_colors = lcd.bg_colors;
  const sp1_colors = lcd.sp1_colors;
  const sp2_colors = lcd.sp2_colors;

  const bg_enabled = (lcdc & 0x01) !== 0;
  const obj_enabled = (lcdc & 0x02) !== 0;
  const sprite_height = (lcdc & 0x04) !== 0 ? 16 : 8;
  const signed_tile_mode = (lcdc & 0x10) === 0;

  const win_enabled = (lcdc & 0x20) !== 0;
  const win_map_base = (lcdc & 0x40) !== 0 ? 0x1c00 : 0x1800;
  const bg_map_base = (lcdc & 0x08) !== 0 ? 0x1c00 : 0x1800;
  const win_left = lcd.win_x - 7;

  const window_visible = bg_enabled && win_enabled && lcd.win_x <= 166 && lcd.win_y < YRES;

  const line_offset = ly * XRES;

  const scx = lcd.scroll_x;
  const scy = lcd.scroll_y;
  const wy = lcd.win_y;
  const window_line = ppu.window_line;

  let used_window = false;

  if (obj_enabled && ppu.line_sprite_count > 0) {
    render_sprite_line(ly, sprite_height, decoded_tiles, sp1_colors, sp2_colors);
  } else {
    ppu.sprite_line_color_id.fill(0);
  }

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

      const tile_id = ppu.vram[map_base + tile_row * 32 + tile_col];

      const tile_index = signed_tile_mode
        ? ppu_resolve_bg_tile_index(tile_id, lcdc)
        : tile_id;

      bg_color_id = decoded_tiles[(tile_index << 6) + tile_y * 8 + tile_x];
      final_color = bg_colors[bg_color_id];
    }

    bg_line_color_id[x] = bg_color_id;

    if (obj_enabled && ppu.sprite_line_color_id[x] !== 0) {
      const sprite_behind_bg = ppu.sprite_line_priority[x] !== 0;

      if (!sprite_behind_bg || bg_color_id === 0) {
        final_color = ppu.sprite_line_color[x];
      }
    }

    video_buffer[line_offset + x] = final_color;
  }

  ppu.window_was_rendered = used_window;
}
