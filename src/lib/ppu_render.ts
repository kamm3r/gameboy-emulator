import { lcd_get_context } from "./lcd";
import {
  ppu_get_context,
  ppu_vram_read,
  oam_line_entry,
  oam_entry,
  XRES,
  YRES,
} from "./ppu";

function lcdc_bgw_enable(): boolean {
  return (lcd_get_context().lcdc & 0x01) !== 0;
}

function lcdc_obj_enable(): boolean {
  return (lcd_get_context().lcdc & 0x02) !== 0;
}

function lcdc_obj_height(): number {
  return (lcd_get_context().lcdc & 0x04) !== 0 ? 16 : 8;
}

function lcdc_bg_map_area(): number {
  return (lcd_get_context().lcdc & 0x08) !== 0 ? 0x9c00 : 0x9800;
}

function lcdc_bgw_data_area(): number {
  return (lcd_get_context().lcdc & 0x10) !== 0 ? 0x8000 : 0x8800;
}

function lcdc_win_enable(): boolean {
  return (lcd_get_context().lcdc & 0x20) !== 0;
}

function lcdc_win_map_area(): number {
  return (lcd_get_context().lcdc & 0x40) !== 0 ? 0x9c00 : 0x9800;
}

function get_bgw_tile_addr(tile_id: number, tile_y: number): number {
  if (lcdc_bgw_data_area() === 0x8000) {
    return 0x8000 + tile_id * 16 + tile_y;
  }

  const signed_tile_id = (tile_id << 24) >> 24;
  return 0x9000 + signed_tile_id * 16 + tile_y;
}

function window_visible(): boolean {
  const lcd = lcd_get_context();

  return (
    lcdc_bgw_enable() &&
    lcdc_win_enable() &&
    lcd.win_x <= 166 &&
    lcd.win_y < YRES
  );
}

function read_tile_pixel(
  tile_id: number,
  tile_x: number,
  tile_y: number,
): number {
  const addr = get_bgw_tile_addr(tile_id, tile_y * 2);
  const low = ppu_vram_read(addr);
  const high = ppu_vram_read(addr + 1);
  const bit = 7 - tile_x;

  const lo = low & (1 << bit) ? 1 : 0;
  const hi = high & (1 << bit) ? 2 : 0;

  return lo | hi;
}

function get_bg_pixel(
  screen_x: number,
  screen_y: number,
): { color_id: number; color: number } {
  const lcd = lcd_get_context();

  if (!lcdc_bgw_enable()) {
    return {
      color_id: 0,
      color: lcd.bg_colors[0],
    };
  }

  const map_x = (screen_x + lcd.scroll_x) & 0xff;
  const map_y = (screen_y + lcd.scroll_y) & 0xff;

  const tile_col = Math.floor(map_x / 8);
  const tile_row = Math.floor(map_y / 8);
  const tile_x = map_x & 7;
  const tile_y = map_y & 7;

  const tile_id = ppu_vram_read(lcdc_bg_map_area() + tile_row * 32 + tile_col);
  const color_id = read_tile_pixel(tile_id, tile_x, tile_y);

  return {
    color_id,
    color: lcd.bg_colors[color_id],
  };
}

function get_window_pixel(
  screen_x: number,
  screen_y: number,
  window_line: number,
): { active: boolean; color_id: number; color: number } {
  const lcd = lcd_get_context();

  if (!window_visible()) {
    return {
      active: false,
      color_id: 0,
      color: lcd.bg_colors[0],
    };
  }

  if (screen_y < lcd.win_y) {
    return {
      active: false,
      color_id: 0,
      color: lcd.bg_colors[0],
    };
  }

  const win_left = lcd.win_x - 7;

  if (screen_x < win_left) {
    return {
      active: false,
      color_id: 0,
      color: lcd.bg_colors[0],
    };
  }

  const win_x = screen_x - win_left;
  const win_y = window_line;

  const tile_col = Math.floor(win_x / 8);
  const tile_row = Math.floor(win_y / 8);
  const tile_x = win_x & 7;
  const tile_y = win_y & 7;

  const tile_id = ppu_vram_read(
    lcdc_win_map_area() + tile_row * 32 + tile_col,
  );
  const color_id = read_tile_pixel(tile_id, tile_x, tile_y);

  return {
    active: true,
    color_id,
    color: lcd.bg_colors[color_id],
  };
}

function get_sprite_pixel(
  sprite: oam_entry,
  screen_x: number,
  screen_y: number,
): { color_id: number; color: number; bg_priority: boolean } {
  const lcd = lcd_get_context();
  const sprite_height = lcdc_obj_height();

  const sprite_x = sprite.x - 8;
  const sprite_y = sprite.y - 16;

  let px = screen_x - sprite_x;
  let py = screen_y - sprite_y;

  if (px < 0 || px >= 8 || py < 0 || py >= sprite_height) {
    return {
      color_id: 0,
      color: 0,
      bg_priority: false,
    };
  }

  const x_flip = (sprite.attributes & 0x20) !== 0;
  const y_flip = (sprite.attributes & 0x40) !== 0;
  const palette_1 = (sprite.attributes & 0x10) !== 0;
  const bg_priority = (sprite.attributes & 0x80) !== 0;

  if (x_flip) {
    px = 7 - px;
  }

  if (y_flip) {
    py = sprite_height - 1 - py;
  }

  let tile_index = sprite.tile;

  if (sprite_height === 16) {
    tile_index &= ~1;

    if (py >= 8) {
      tile_index++;
      py -= 8;
    }
  }

  const addr = 0x8000 + tile_index * 16 + py * 2;
  const low = ppu_vram_read(addr);
  const high = ppu_vram_read(addr + 1);
  const bit = 7 - px;

  const lo = low & (1 << bit) ? 1 : 0;
  const hi = high & (1 << bit) ? 2 : 0;
  const color_id = lo | hi;

  if (color_id === 0) {
    return {
      color_id: 0,
      color: 0,
      bg_priority,
    };
  }

  const palette = palette_1 ? lcd.sp2_colors : lcd.sp1_colors;

  return {
    color_id,
    color: palette[color_id],
    bg_priority,
  };
}

function find_top_sprite_pixel(
  screen_x: number,
  screen_y: number,
): { color_id: number; color: number; bg_priority: boolean } | null {
  const ppu = ppu_get_context();

  let le: oam_line_entry | null = ppu.line_sprites;

  while (le) {
    const sprite = le.entry;
    const sprite_x = sprite.x - 8;

    if (screen_x >= sprite_x && screen_x < sprite_x + 8) {
      const pixel = get_sprite_pixel(sprite, screen_x, screen_y);

      if (pixel.color_id !== 0) {
        return pixel;
      }
    }

    le = le.next;
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

  let used_window = false;

  for (let x = 0; x < XRES; x++) {
    const bg = get_bg_pixel(x, ly);
    let bg_color_id = bg.color_id;
    let final_color = bg.color;

    const win = get_window_pixel(x, ly, ppu.window_line);

    if (win.active) {
      used_window = true;
      bg_color_id = win.color_id;
      final_color = win.color;
    }

    if (lcdc_obj_enable()) {
      const sprite = find_top_sprite_pixel(x, ly);

      if (sprite) {
        if (!sprite.bg_priority || bg_color_id === 0) {
          final_color = sprite.color;
        }
      }
    }

    ppu.video_buffer[ly * XRES + x] = final_color;
  }

  ppu.window_was_rendered = used_window;
}