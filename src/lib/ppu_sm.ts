import { lcd_get_context } from "./lcd";
import { ppu_get_context, oam_line_entry, XRES, YRES } from "./ppu";
import { cpu_request_interrupt } from "./cpu";
import { cart_need_save, cart_battery_save } from "./cart";
import {
  pipeline_fifo_reset,
  pipeline_process,
  window_visible,
  FS_TILE,
} from "./ppu_pipeline";

export const LINES_PER_FRAME = 154;
export const TICKS_PER_LINE = 456;

const IT_VBLANK = 0;
const IT_LCD_STAT = 1;

const SS_HBLANK = 0;
const SS_VBLANK = 1;
const SS_LYC = 2;

export const MODE_HBLANK = 0;
export const MODE_VBLANK = 1;
export const MODE_OAM = 2;
export const MODE_XFER = 3;

function LCDS_LYC_SET(value: number): void {
  const lcd = lcd_get_context();

  if (value) {
    lcd.lcds |= 0x04;
  } else {
    lcd.lcds &= ~0x04;
  }
}

function LCDS_MODE_SET(mode: number): void {
  const lcd = lcd_get_context();
  lcd.lcds = (lcd.lcds & 0xfc) | (mode & 0x03);
}

export function LCDS_MODE(): number {
  return lcd_get_context().lcds & 0x03;
}

function LCDS_STAT_INT(source: number): boolean {
  return (lcd_get_context().lcds & (1 << (source + 3))) !== 0;
}

export function increment_ly(): void {
  const lcd = lcd_get_context();
  const ppu = ppu_get_context();

  if (window_visible() && lcd.ly >= lcd.win_y && lcd.ly < lcd.win_y + YRES) {
    ppu.window_line++;
  }

  lcd.ly = (lcd.ly + 1) & 0xff;

  if (lcd.ly === lcd.ly_compare) {
    LCDS_LYC_SET(1);

    if (LCDS_STAT_INT(SS_LYC)) {
      cpu_request_interrupt(IT_LCD_STAT);
    }
  } else {
    LCDS_LYC_SET(0);
  }
}

export function load_line_sprites(): void {
  const lcd = lcd_get_context();
  const ppu = ppu_get_context();
  const cur_y = lcd.ly;
  const sprite_height = (lcd.lcdc & 0x04) ? 16 : 8;

  ppu.line_sprites = null;
  ppu.line_entry_array = [];
  ppu.line_sprite_count = 0;

  for (let i = 0; i < 40; i++) {
    const e = ppu.oam_ram[i];

    if (!e.x) {
      continue;
    }

    if (ppu.line_sprite_count >= 10) {
      break;
    }

    if (e.y <= cur_y + 16 && e.y + sprite_height > cur_y + 16) {
      const entry: oam_line_entry = {
        entry: e,
        next: null,
      };

      ppu.line_entry_array[ppu.line_sprite_count++] = entry;

      if (!ppu.line_sprites || ppu.line_sprites.entry.x > e.x) {
        entry.next = ppu.line_sprites;
        ppu.line_sprites = entry;
        continue;
      }

      let le = ppu.line_sprites;
      let prev: oam_line_entry | null = le;

      while (le) {
        if (le.entry.x > e.x) {
          if (prev) {
            prev.next = entry;
          }
          entry.next = le;
          break;
        }

        if (!le.next) {
          le.next = entry;
          break;
        }

        prev = le;
        le = le.next;
      }
    }
  }
}

export function ppu_mode_oam(): void {
  const ppu = ppu_get_context();

  if (ppu.line_ticks >= 80) {
    LCDS_MODE_SET(MODE_XFER);

    ppu.pfc.cur_fetch_state = FS_TILE;
    ppu.pfc.line_x = 0;
    ppu.pfc.fetch_x = 0;
    ppu.pfc.pushed_x = 0;
    ppu.pfc.fifo_x = 0;
  }

  if (ppu.line_ticks === 1) {
    ppu.line_sprites = null;
    ppu.line_sprite_count = 0;
    load_line_sprites();
  }
}

export function ppu_mode_xfer(): void {
  const ppu = ppu_get_context();

  pipeline_process();

  if (ppu.pfc.pushed_x >= XRES) {
    pipeline_fifo_reset();
    LCDS_MODE_SET(MODE_HBLANK);

    if (LCDS_STAT_INT(SS_HBLANK)) {
      cpu_request_interrupt(IT_LCD_STAT);
    }
  }
}

export function ppu_mode_vblank(): void {
  const ppu = ppu_get_context();
  const lcd = lcd_get_context();

  if (ppu.line_ticks >= TICKS_PER_LINE) {
    increment_ly();

    if (lcd.ly >= LINES_PER_FRAME) {
      LCDS_MODE_SET(MODE_OAM);
      lcd.ly = 0;
      ppu.window_line = 0;
    }

    ppu.line_ticks = 0;
  }
}

const target_frame_time = Math.floor(1000 / 60);
let prev_frame_time = 0;
let start_timer = 0;
let frame_count = 0;

function get_ticks(): number {
  return Date.now();
}

function delay(ms: number): void {
  const end = Date.now() + ms;
  while (Date.now() < end) {}
}

export function ppu_mode_hblank(): void {
  const ppu = ppu_get_context();
  const lcd = lcd_get_context();

  if (ppu.line_ticks >= TICKS_PER_LINE) {
    increment_ly();

    if (lcd.ly >= YRES) {
      LCDS_MODE_SET(MODE_VBLANK);
      cpu_request_interrupt(IT_VBLANK);

      if (LCDS_STAT_INT(SS_VBLANK)) {
        cpu_request_interrupt(IT_LCD_STAT);
      }

      ppu.current_frame++;

      const end = get_ticks();
      const frame_time = end - prev_frame_time;

      if (frame_time < target_frame_time) {
        delay(target_frame_time - frame_time);
      }

      if (end - start_timer >= 1000) {
        const fps = frame_count;
        start_timer = end;
        frame_count = 0;

        console.log(`FPS: ${fps}`);

        if (cart_need_save()) {
          cart_battery_save();
        }
      }

      frame_count++;
      prev_frame_time = get_ticks();
    } else {
      LCDS_MODE_SET(MODE_OAM);
    }

    ppu.line_ticks = 0;
  }
}

export function ppu_tick(): void {
  const ppu = ppu_get_context();
  ppu.line_ticks++;

  switch (LCDS_MODE()) {
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

export function ppu_sm_init(): void {
  const lcd = lcd_get_context();
  lcd.lcds = (lcd.lcds & 0xfc) | MODE_OAM;
}