import { ppu_get_context, fetched_sprite, oam_line_entry } from "./ppu";
import { lcd_get_context } from "./lcd";
import { bus_read } from "./bus";

export const XRES = 160;
export const YRES = 144;

const FS_TILE = 0;
const FS_DATA0 = 1;
const FS_DATA1 = 2;
const FS_IDLE = 3;
const FS_PUSH = 4;

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

export function window_visible(): boolean {
  const lcd = lcd_get_context();
  return LCDC_WIN_ENABLE() && lcd.win_x >= 0 &&
    lcd.win_x <= 166 && lcd.win_y >= 0 &&
    lcd.win_y < YRES;
}

export function pixel_fifo_push(value: number): void {
  const ppu = ppu_get_context();
  const next = { value, next: null };

  if (!ppu.pfc.pixel_fifo.head) {
    ppu.pfc.pixel_fifo.head = ppu.pfc.pixel_fifo.tail = next;
  } else {
    ppu.pfc.pixel_fifo.tail!.next = next;
    ppu.pfc.pixel_fifo.tail = next;
  }

  ppu.pfc.pixel_fifo.size++;
}

export function pixel_fifo_pop(): number {
  const ppu = ppu_get_context();
  if (ppu.pfc.pixel_fifo.size <= 0) {
    console.error("ERR IN PIXEL FIFO!\n");
    process.exit(-8);
  }

  const popped = ppu.pfc.pixel_fifo.head!;
  ppu.pfc.pixel_fifo.head = popped.next;
  ppu.pfc.pixel_fifo.size--;

  const val = popped.value;
  return val;
}

export function fetch_sprite_pixels(bit: number, color: number, bg_color: number): number {
  const ppu = ppu_get_context();
  const lcd = lcd_get_context();

  for (let i = 0; i < ppu.fetched_entry_count; i++) {
    const sprite = ppu.fetched_entries[i];
    const sp_x = (sprite.x - 8) + ((lcd.scroll_x % 8));

    if (sp_x + 8 < ppu.pfc.fifo_x) {
      continue;
    }

    const offset = ppu.pfc.fifo_x - sp_x;

    if (offset < 0 || offset > 7) {
      continue;
    }

    bit = 7 - offset;

    if (sprite.f_x_flip) {
      bit = offset;
    }

    const hi = !!(ppu.pfc.fetch_entry_data[i * 2] & (1 << bit)) ? 1 : 0;
    const lo = (!!(ppu.pfc.fetch_entry_data[(i * 2) + 1] & (1 << bit)) ? 1 : 0) << 1;

    const bg_priority = sprite.f_bgp;

    if (!(hi | lo)) {
      continue;
    }

    if (!bg_priority || bg_color === 0) {
      color = sprite.f_pn ?
        lcd.sp2_colors[hi | lo] : lcd.sp1_colors[hi | lo];

      if (hi | lo) {
        break;
      }
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

  const x = ppu.pfc.fetch_x - (8 - (lcd.scroll_x % 8));

  for (let i = 0; i < 8; i++) {
    const bit = 7 - i;
    const hi = !!(ppu.pfc.bgw_fetch_data[1] & (1 << bit)) ? 1 : 0;
    const lo = (!!(ppu.pfc.bgw_fetch_data[2] & (1 << bit)) ? 1 : 0) << 1;
    let color = lcd.bg_colors[hi | lo];

    if (!LCDC_BGW_ENABLE()) {
      color = lcd.bg_colors[0];
    }

    if (LCDC_OBJ_ENABLE()) {
      color = fetch_sprite_pixels(bit, color, hi | lo);
    }

    if (x >= 0) {
      pixel_fifo_push(color);
      ppu.pfc.fifo_x++;
    }
  }

  return true;
}

export function pipeline_load_sprite_tile(): void {
  const ppu = ppu_get_context();
  const lcd = lcd_get_context();
  let le = ppu.line_sprites;

  while (le) {
    const sp_x = (le.entry.x - 8) + (lcd.scroll_x % 8);

    if ((sp_x >= ppu.pfc.fetch_x && sp_x < ppu.pfc.fetch_x + 8) ||
      ((sp_x + 8) >= ppu.pfc.fetch_x && (sp_x + 8) < ppu.pfc.fetch_x + 8)) {
      ppu.fetched_entries[ppu.fetched_entry_count++] = le.entry as unknown as fetched_sprite;
    }

    le = le.next;

    if (!le || ppu.fetched_entry_count >= 3) {
      break;
    }
  }
}

export function pipeline_load_sprite_data(offset: number): void {
  const ppu = ppu_get_context();
  const lcd = lcd_get_context();
  const cur_y = lcd.ly;
  const sprite_height = LCDC_OBJ_HEIGHT();

  for (let i = 0; i < ppu.fetched_entry_count; i++) {
    let ty = ((cur_y + 16) - ppu.fetched_entries[i].y) * 2;

    if (ppu.fetched_entries[i].f_y_flip) {
      ty = ((sprite_height * 2) - 2) - ty;
    }

    let tile_index = ppu.fetched_entries[i].tile;

    if (sprite_height === 16) {
      tile_index &= ~1;
    }

    ppu.pfc.fetch_entry_data[(i * 2) + offset] =
      bus_read(0x8000 + (tile_index * 16) + ty + offset);
  }
}

export function pipeline_load_window_tile(): void {
  const ppu = ppu_get_context();
  const lcd = lcd_get_context();

  if (!window_visible()) {
    return;
  }

  const window_y = lcd.win_y;

  if (ppu.pfc.fetch_x + 7 >= lcd.win_x &&
    ppu.pfc.fetch_x + 7 < lcd.win_x + YRES + 14) {
    if (lcd.ly >= window_y && lcd.ly < window_y + XRES) {
      const w_tile_y = Math.floor(ppu.window_line / 8);

      ppu.pfc.bgw_fetch_data[0] = bus_read(LCDC_WIN_MAP_AREA() +
        Math.floor((ppu.pfc.fetch_x + 7 - lcd.win_x) / 8) +
        (w_tile_y * 32));

      if (LCDC_BGW_DATA_AREA() === 0x8800) {
        ppu.pfc.bgw_fetch_data[0] += 128;
      }
    }
  }
}

export function pipeline_fetch(): void {
  const ppu = ppu_get_context();
  const lcd = lcd_get_context();

  switch (ppu.pfc.cur_fetch_state) {
    case FS_TILE: {
      ppu.fetched_entry_count = 0;

      if (LCDC_BGW_ENABLE()) {
        ppu.pfc.bgw_fetch_data[0] = bus_read(LCDC_BG_MAP_AREA() +
          Math.floor(ppu.pfc.map_x / 8) +
          (Math.floor(ppu.pfc.map_y / 8) * 32));

        if (LCDC_BGW_DATA_AREA() === 0x8800) {
          ppu.pfc.bgw_fetch_data[0] += 128;
        }

        pipeline_load_window_tile();
      }

      if (LCDC_OBJ_ENABLE() && ppu.line_sprites) {
        pipeline_load_sprite_tile();
      }

      ppu.pfc.cur_fetch_state = FS_DATA0;
      ppu.pfc.fetch_x += 8;
      break;
    }

    case FS_DATA0: {
      ppu.pfc.bgw_fetch_data[1] = bus_read(LCDC_BGW_DATA_AREA() +
        (ppu.pfc.bgw_fetch_data[0] * 16) +
        ppu.pfc.tile_y);

      pipeline_load_sprite_data(0);

      ppu.pfc.cur_fetch_state = FS_DATA1;
      break;
    }

    case FS_DATA1: {
      ppu.pfc.bgw_fetch_data[2] = bus_read(LCDC_BGW_DATA_AREA() +
        (ppu.pfc.bgw_fetch_data[0] * 16) +
        ppu.pfc.tile_y + 1);

      pipeline_load_sprite_data(1);

      ppu.pfc.cur_fetch_state = FS_IDLE;
      break;
    }

    case FS_IDLE: {
      ppu.pfc.cur_fetch_state = FS_PUSH;
      break;
    }

    case FS_PUSH: {
      if (pipeline_fifo_add()) {
        ppu.pfc.cur_fetch_state = FS_TILE;
      }
      break;
    }
  }
}

export function pipeline_push_pixel(): void {
  const ppu = ppu_get_context();
  const lcd = lcd_get_context();

  if (ppu.pfc.pixel_fifo.size > 8) {
    const pixel_data = pixel_fifo_pop();

    if (ppu.pfc.line_x >= (lcd.scroll_x % 8)) {
      ppu.video_buffer[ppu.pfc.pushed_x + (lcd.ly * XRES)] = pixel_data;
      ppu.pfc.pushed_x++;
    }

    ppu.pfc.line_x++;
  }
}

export function pipeline_process(): void {
  const ppu = ppu_get_context();
  const lcd = lcd_get_context();

  ppu.pfc.map_y = (lcd.ly + lcd.scroll_y);
  ppu.pfc.map_x = (ppu.pfc.fetch_x + lcd.scroll_x);
  ppu.pfc.tile_y = ((lcd.ly + lcd.scroll_y) % 8) * 2;

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
}
