import { XRES, YRES } from "../common";
import { lcd_get_context } from "../lcd";
import { ppu_get_context, ppu_update_dirty_tiles } from "./ppu";

// Module-level scratch to avoid allocations
const sprite_color_ids = new Uint8Array(XRES);
const sprite_colors = new Uint32Array(XRES);
const sprite_bg_priority = new Uint8Array(XRES);

export function render_scanline(): void {
  const lcd = lcd_get_context();
  const ppu = ppu_get_context();
  const ly = lcd.ly;

  if (ly >= YRES) {
    ppu.window_was_rendered = false;
    return;
  }

  // Pick up tile data written since the last scanline (mid-frame VRAM updates)
  ppu_update_dirty_tiles();

  const lcdc = lcd.lcdc;
  const vram = ppu.vram;
  const decoded = ppu.decoded_tiles;
  const video_buffer = ppu.video_buffer;
  const bg_colors = lcd.bg_colors;
  const sp1_colors = lcd.sp1_colors;
  const sp2_colors = lcd.sp2_colors;

  const bg_enabled = (lcdc & 0x01) !== 0;
  const obj_enabled = (lcdc & 0x02) !== 0;
  const sprite_height = (lcdc & 0x04) !== 0 ? 16 : 8;
  const bg_map_base = (lcdc & 0x08) !== 0 ? 0x1c00 : 0x1800;
  const unsigned_tiles = (lcdc & 0x10) !== 0;
  const win_enabled = (lcdc & 0x20) !== 0;
  const win_map_base = (lcdc & 0x40) !== 0 ? 0x1c00 : 0x1800;
  const win_left = lcd.win_x - 7;

  const window_visible =
    bg_enabled && win_enabled && lcd.win_x <= 166 && ly >= lcd.win_y;

  const scx = lcd.scroll_x;
  const scy = lcd.scroll_y;
  const window_line = ppu.window_line;
  const line_offset = ly * XRES;

  // --- Pass 1: rasterize sprites into line buffers (no per-pixel allocs) ---
  let has_sprites = false;
  if (obj_enabled) {
    sprite_color_ids.fill(0);
    const sprites = ppu.line_sprites;
    const count = ppu.line_sprite_count;

    // Iterate sprites in reverse priority so earlier sprites overwrite later ones.
    // line_sprites is already sorted by priority (lowest index = highest prio).
    // We want highest priority to win, so iterate from last to first and overwrite.
    for (let i = count - 1; i >= 0; i--) {
      const sprite = sprites[i];
      const sx = sprite.x - 8;
      const sy = sprite.y - 16;
      let py = ly - sy;
      if (py < 0 || py >= sprite_height) continue;

      const attr = sprite.attributes;
      const x_flip = (attr & 0x20) !== 0;
      const y_flip = (attr & 0x40) !== 0;
      const bg_prio = (attr & 0x80) !== 0 ? 1 : 0;
      const palette = (attr & 0x10) !== 0 ? sp2_colors : sp1_colors;

      if (y_flip) py = sprite_height - 1 - py;

      let tile = sprite.tile;
      if (sprite_height === 16) {
        tile &= 0xfe;
        if (py >= 8) {
          tile++;
          py -= 8;
        }
      }

      const row_base = (tile << 6) + (py << 3);

      for (let px = 0; px < 8; px++) {
        const screen_x = sx + px;
        if (screen_x < 0 || screen_x >= XRES) continue;

        const tx = x_flip ? 7 - px : px;
        const cid = decoded[row_base + tx];
        if (cid === 0) continue;

        sprite_color_ids[screen_x] = cid;
        sprite_colors[screen_x] = palette[cid];
        sprite_bg_priority[screen_x] = bg_prio;
        has_sprites = true;
      }
    }
  }

  // --- Pass 2: render BG/Window + composite sprites ---
  let used_window = false;
  const bg_y = (ly + scy) & 0xff;
  const bg_tile_row = (bg_y >> 3) * 32;
  const bg_tile_y = bg_y & 7;
  const win_tile_row = (window_line >> 3) * 32;
  const win_tile_y = window_line & 7;

  // Cache last tile lookup so we don't refetch every pixel
  let last_tile_col = -1;
  let last_map_base = -1;
  let last_use_window = false;
  let cached_row_base = 0;

  for (let x = 0; x < XRES; x++) {
    let bg_color_id = 0;
    let final_color = bg_colors[0];

    const use_window = window_visible && x >= win_left;
    if (use_window) used_window = true;

    if (bg_enabled) {
      let pixel_x: number, tile_y: number, map_row: number, map_base: number;

      if (use_window) {
        pixel_x = x - win_left;
        tile_y = win_tile_y;
        map_row = win_tile_row;
        map_base = win_map_base;
      } else {
        pixel_x = (x + scx) & 0xff;
        tile_y = bg_tile_y;
        map_row = bg_tile_row;
        map_base = bg_map_base;
      }

      const tile_col = pixel_x >> 3;
      const tile_x = pixel_x & 7;

      if (
        tile_col !== last_tile_col ||
        map_base !== last_map_base ||
        use_window !== last_use_window
      ) {
        const tile_id = vram[map_base + map_row + tile_col];
        const tile_index = unsigned_tiles
          ? tile_id
          : tile_id < 128
            ? tile_id + 256
            : tile_id;
        cached_row_base = (tile_index << 6) + (tile_y << 3);
        last_tile_col = tile_col;
        last_map_base = map_base;
        last_use_window = use_window;
      }

      bg_color_id = decoded[cached_row_base + tile_x];
      final_color = bg_colors[bg_color_id];
    }

    if (has_sprites) {
      const cid = sprite_color_ids[x];
      if (cid !== 0 && (sprite_bg_priority[x] === 0 || bg_color_id === 0)) {
        final_color = sprite_colors[x];
      }
    }

    video_buffer[line_offset + x] = final_color;
  }

  ppu.window_was_rendered = used_window;
}