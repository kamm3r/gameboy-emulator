import { ppu_get_context, fetched_sprite, ppu_vram_read } from "./ppu";
import { lcd_get_context } from "./lcd";

export const XRES = 160;
export const YRES = 144;

export const FS_TILE = 0;
export const FS_DATA0 = 1;
export const FS_DATA1 = 2;
export const FS_IDLE = 3;
export const FS_PUSH = 4;

function LCDC_WIN_ENABLE(): boolean {
  return (lcd_get_context().lcdc & 0x20) !== 0;
}

function LCDC_BGW_ENABLE(): boolean {
  return (lcd_get_context().lcdc & 0x01) !== 0;
}

function LCDC_OBJ_ENABLE(): boolean {
  return (lcd_get_context().lcdc & 0x02) !== 0;
}

function LCDC_OBJ_HEIGHT(): number {
  return (lcd_get_context().lcdc & 0x04) !== 0 ? 16 : 8;
}

function LCDC_BG_MAP_AREA(): number {
  return (lcd_get_context().lcdc & 0x08) !== 0 ? 0x9c00 : 0x9800;
}

function LCDC_WIN_MAP_AREA(): number {
  return (lcd_get_context().lcdc & 0x40) !== 0 ? 0x9c00 : 0x9800;
}

function LCDC_BGW_DATA_AREA(): number {
  return (lcd_get_context().lcdc & 0x10) !== 0 ? 0x8000 : 0x8800;
}

function get_bgw_tile_addr(tileId: number, tileY: number): number {
  if (LCDC_BGW_DATA_AREA() === 0x8000) {
    return 0x8000 + tileId * 16 + tileY;
  }

  const signedTileId = (tileId << 24) >> 24;
  return 0x9000 + signedTileId * 16 + tileY;
}

export function window_visible(): boolean {
  const lcd = lcd_get_context();
  return (
    LCDC_BGW_ENABLE() &&
    LCDC_WIN_ENABLE() &&
    lcd.win_x <= 166 &&
    lcd.win_y < YRES
  );
}

function window_should_trigger_now(): boolean {
  const ppu = ppu_get_context();
  const lcd = lcd_get_context();

  if (ppu.pfc.fetching_window) {
    return false;
  }

  if (!window_visible()) {
    return false;
  }

  if (lcd.ly < lcd.win_y) {
    return false;
  }

  return ppu.pfc.pushed_x + 7 >= lcd.win_x;
}

export function pixel_fifo_push(value: number): void {
  const ppu = ppu_get_context();
  const next = { value, next: null as null | typeof ppu.pfc.pixel_fifo.head };

  if (!ppu.pfc.pixel_fifo.head) {
    ppu.pfc.pixel_fifo.head = next;
    ppu.pfc.pixel_fifo.tail = next;
  } else {
    ppu.pfc.pixel_fifo.tail!.next = next;
    ppu.pfc.pixel_fifo.tail = next;
  }

  ppu.pfc.pixel_fifo.size++;
}

export function pixel_fifo_pop(): number {
  const ppu = ppu_get_context();

  if (ppu.pfc.pixel_fifo.size <= 0 || !ppu.pfc.pixel_fifo.head) {
    throw new Error("pixel_fifo underflow");
  }

  const popped = ppu.pfc.pixel_fifo.head;
  ppu.pfc.pixel_fifo.head = popped.next;
  ppu.pfc.pixel_fifo.size--;

  if (ppu.pfc.pixel_fifo.size === 0) {
    ppu.pfc.pixel_fifo.tail = null;
  }

  return popped.value;
}

export function fetch_sprite_pixels(
  screen_x: number,
  bit: number,
  color: number,
  bg_color: number,
): number {
  const ppu = ppu_get_context();
  const lcd = lcd_get_context();

  for (let i = 0; i < ppu.fetched_entry_count; i++) {
    const sprite = ppu.fetched_entries[i];
    const sp_x = sprite.x - 8;
    const offset = screen_x - sp_x;

    if (offset < 0 || offset > 7) {
      continue;
    }

    bit = sprite.f_x_flip ? offset : 7 - offset;

    const low = ppu.pfc.fetch_entry_data[i * 2] & (1 << bit) ? 1 : 0;
    const high =
      (ppu.pfc.fetch_entry_data[i * 2 + 1] & (1 << bit) ? 1 : 0) << 1;
    const spriteColorId = low | high;

    if (spriteColorId === 0) {
      continue;
    }

    if (!sprite.f_bgp || bg_color === 0) {
      color = sprite.f_pn
        ? lcd.sp2_colors[spriteColorId]
        : lcd.sp1_colors[spriteColorId];
      break;
    }
  }

  return color;
}

export function pipeline_fifo_add(): boolean {
  const ppu = ppu_get_context();
  const lcd = lcd_get_context();

  if (ppu.pfc.pixel_fifo.size > 8) {
    return false;
  }

  const base_x = ppu.pfc.fetching_window
    ? ppu.pfc.fetch_x
    : ppu.pfc.fetch_x - (8 - (lcd.scroll_x % 8));

  for (let i = 0; i < 8; i++) {
    const bit = 7 - i;
    const screen_x = base_x + i;

    const lowBit = ppu.pfc.bgw_fetch_data[1] & (1 << bit) ? 1 : 0;
    const highBit = ppu.pfc.bgw_fetch_data[2] & (1 << bit) ? 2 : 0;
    const bgColorIdRaw = lowBit | highBit;
    const bgColorId = LCDC_BGW_ENABLE() ? bgColorIdRaw : 0;

    let color = lcd.bg_colors[bgColorId];

    if (LCDC_OBJ_ENABLE()) {
      color = fetch_sprite_pixels(screen_x, bit, color, bgColorId);
    }

    if (screen_x >= 0 || ppu.pfc.fetching_window) {
      pixel_fifo_push(color);
      ppu.pfc.fifo_x++;
    }
  }

  return true;
}

export function pipeline_load_sprite_tile(): void {
  const ppu = ppu_get_context();
  let le = ppu.line_sprites;

  while (le) {
    const sp_x = le.entry.x - 8;

    if (sp_x < ppu.pfc.fetch_x + 8 && sp_x + 8 > ppu.pfc.fetch_x) {
      const attr = le.entry.attributes;

      const sprite: fetched_sprite = {
        x: le.entry.x,
        y: le.entry.y,
        tile: le.entry.tile,
        f_x_flip: attr & 0x20 ? 1 : 0,
        f_y_flip: attr & 0x40 ? 1 : 0,
        f_pn: attr & 0x10 ? 1 : 0,
        f_bgp: attr & 0x80 ? 1 : 0,
      };

      ppu.fetched_entries[ppu.fetched_entry_count++] = sprite;
    }

    le = le.next;

    if (!le || ppu.fetched_entry_count >= 10) {
      break;
    }
  }
}

export function pipeline_load_sprite_data(offset: number): void {
  const ppu = ppu_get_context();
  const cur_y = lcd_get_context().ly;
  const sprite_height = LCDC_OBJ_HEIGHT();

  for (let i = 0; i < ppu.fetched_entry_count; i++) {
    const sprite = ppu.fetched_entries[i];

    let row = cur_y + 16 - sprite.y;

    if (row < 0 || row >= sprite_height) {
      continue;
    }

    if (sprite.f_y_flip) {
      row = sprite_height - 1 - row;
    }

    let tile_index = sprite.tile;

    if (sprite_height === 16) {
      tile_index &= ~1;

      if (row >= 8) {
        tile_index++;
        row -= 8;
      }
    }

    const ty = row * 2;
    const addr = 0x8000 + tile_index * 16 + ty + offset;

    ppu.pfc.fetch_entry_data[i * 2 + offset] = ppu_vram_read(addr);
  }
}

export function pipeline_load_window_tile(): void {
  const ppu = ppu_get_context();
  const lcd = lcd_get_context();

  const w_tile_y = Math.floor(ppu.window_line / 8);
  const w_tile_x = Math.floor((ppu.pfc.fetch_x + 7 - lcd.win_x) / 8);

  ppu.pfc.bgw_fetch_data[0] = ppu_vram_read(
    LCDC_WIN_MAP_AREA() + w_tile_x + w_tile_y * 32,
  );
}

export function pipeline_fetch(): void {
  const ppu = ppu_get_context();
  const lcd = lcd_get_context();

  switch (ppu.pfc.cur_fetch_state) {
    case FS_TILE:
      ppu.fetched_entry_count = 0;

      if (ppu.pfc.fetching_window) {
        ppu.pfc.tile_y = (ppu.window_line % 8) * 2;
        pipeline_load_window_tile();
      } else if (LCDC_BGW_ENABLE()) {
        ppu.pfc.tile_y = ((lcd.ly + lcd.scroll_y) % 8) * 2;
        ppu.pfc.bgw_fetch_data[0] = ppu_vram_read(
          LCDC_BG_MAP_AREA() +
            Math.floor(ppu.pfc.map_x / 8) +
            Math.floor(ppu.pfc.map_y / 8) * 32,
        );
      } else {
        ppu.pfc.tile_y = 0;
        ppu.pfc.bgw_fetch_data[0] = 0;
      }

      if (LCDC_OBJ_ENABLE() && ppu.line_sprites) {
        pipeline_load_sprite_tile();
      }

      ppu.pfc.cur_fetch_state = FS_DATA0;
      ppu.pfc.fetch_x += 8;
      break;

    case FS_DATA0:
      ppu.pfc.bgw_fetch_data[1] = ppu_vram_read(
        get_bgw_tile_addr(ppu.pfc.bgw_fetch_data[0], ppu.pfc.tile_y),
      );

      pipeline_load_sprite_data(0);
      ppu.pfc.cur_fetch_state = FS_DATA1;
      break;

    case FS_DATA1:
      ppu.pfc.bgw_fetch_data[2] = ppu_vram_read(
        get_bgw_tile_addr(ppu.pfc.bgw_fetch_data[0], ppu.pfc.tile_y + 1),
      );

      pipeline_load_sprite_data(1);
      ppu.pfc.cur_fetch_state = FS_IDLE;
      break;

    case FS_IDLE:
      ppu.pfc.cur_fetch_state = FS_PUSH;
      break;

    case FS_PUSH:
      if (pipeline_fifo_add()) {
        ppu.pfc.cur_fetch_state = FS_TILE;
      }
      break;
  }
}

export function pipeline_push_pixel(): void {
  const ppu = ppu_get_context();
  const lcd = lcd_get_context();

  if (ppu.pfc.pixel_fifo.size > 8) {
    const pixel_data = pixel_fifo_pop();

    if (ppu.pfc.line_x >= lcd.scroll_x % 8 || ppu.pfc.fetching_window) {
      ppu.video_buffer[ppu.pfc.pushed_x + lcd.ly * XRES] = pixel_data;
      ppu.pfc.pushed_x++;
    }

    ppu.pfc.line_x++;
  }
}

export function pipeline_process(): void {
  const ppu = ppu_get_context();
  const lcd = lcd_get_context();

  if (window_should_trigger_now()) {
    ppu.pfc.fetching_window = true;
    ppu.pfc.fetch_x = ppu.pfc.pushed_x;
    ppu.pfc.fifo_x = ppu.pfc.pushed_x;
    ppu.pfc.cur_fetch_state = FS_TILE;
    pipeline_fifo_reset();
  }

  ppu.pfc.map_y = (lcd.ly + lcd.scroll_y) & 0xff;
  ppu.pfc.map_x = (ppu.pfc.fetch_x + lcd.scroll_x) & 0xff;

  if (!(ppu.line_ticks & 1)) {
    pipeline_fetch();
  }

  pipeline_push_pixel();
}

export function pipeline_fifo_reset(): void {
  const ppu = ppu_get_context();

  while (ppu.pfc.pixel_fifo.size) {
    pixel_fifo_pop();
  }

  ppu.pfc.pixel_fifo.head = null;
  ppu.pfc.pixel_fifo.tail = null;
}
