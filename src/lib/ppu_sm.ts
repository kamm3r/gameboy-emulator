import { lcd_get_context, lcd_set_ly, lcd_set_mode } from "./lcd";
import { ppu_get_context, oam_line_entry, XRES, YRES } from "./ppu";
import { cpu_request_interrupt, INT_VBLANK, INT_LCD_STAT } from "./cpu";
import { cart_need_save, cart_battery_save } from "./cart";
import { render_scanline } from "./ppu_render";

export const LINES_PER_FRAME = 154;
export const TICKS_PER_LINE = 456;

const SS_HBLANK = 0;
const SS_VBLANK = 1;
const SS_OAM = 2;
const SS_LYC = 3;

export const MODE_HBLANK = 0;
export const MODE_VBLANK = 1;
export const MODE_OAM = 2;
export const MODE_XFER = 3;

const OAM_TICKS = 80;
const XFER_TICKS = 172;

function lcds_lyc_set(value: number): void {
  const lcd = lcd_get_context();

  if (value) {
    lcd.lcds |= 0x04;
  } else {
    lcd.lcds &= ~0x04;
  }
}

function set_ly(value: number): void {
  const lcd = lcd_get_context();
  lcd_set_ly(value & 0xff);

  if (lcd.ly === lcd.ly_compare) {
    lcds_lyc_set(1);

    if (lcds_stat_int(SS_LYC)) {
      cpu_request_interrupt(INT_LCD_STAT);
    }
  } else {
    lcds_lyc_set(0);
  }
}

function lcds_mode_set(mode: number): void {
  lcd_set_mode(mode);
}

export function lcds_mode(): number {
  return lcd_get_context().lcds & 0x03;
}

function lcds_stat_int(source: number): boolean {
  return (lcd_get_context().lcds & (1 << (source + 3))) !== 0;
}

export function increment_ly(): void {
  const lcd = lcd_get_context();
  const ppu = ppu_get_context();

  if (ppu.window_was_rendered) {
    ppu.window_line++;
  }

  ppu.window_was_rendered = false;
  lcd_set_ly((lcd.ly + 1) & 0xff);

  if (lcd.ly === lcd.ly_compare) {
    lcds_lyc_set(1);

    if (lcds_stat_int(SS_LYC)) {
      cpu_request_interrupt(INT_LCD_STAT);
    }
  } else {
    lcds_lyc_set(0);
  }
}

export function load_line_sprites(): void {
  const lcd = lcd_get_context();
  const ppu = ppu_get_context();
  const cur_y = lcd.ly;
  const sprite_height = lcd.lcdc & 0x04 ? 16 : 8;

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

  if (ppu.line_ticks === 1) {
    if (lcds_stat_int(SS_OAM)) {
      cpu_request_interrupt(INT_LCD_STAT);
    }

    ppu.line_sprites = null;
    ppu.line_sprite_count = 0;
    ppu.line_rendered = false;
    ppu.window_was_rendered = false;

    load_line_sprites();
  }

  if (ppu.line_ticks >= OAM_TICKS) {
    lcds_mode_set(MODE_XFER);
  }
}

export function ppu_mode_xfer(): void {
  const ppu = ppu_get_context();

  if (!ppu.line_rendered) {
    render_scanline();
    ppu.line_rendered = true;
  }

  if (ppu.line_ticks >= OAM_TICKS + XFER_TICKS) {
    lcds_mode_set(MODE_HBLANK);

    if (lcds_stat_int(SS_HBLANK)) {
      cpu_request_interrupt(INT_LCD_STAT);
    }
  }
}

export function ppu_mode_vblank(): void {
  const ppu = ppu_get_context();
  const lcd = lcd_get_context();

  if (ppu.line_ticks >= TICKS_PER_LINE) {
    increment_ly();

    if (lcd.ly >= LINES_PER_FRAME) {
      lcds_mode_set(MODE_OAM);
      set_ly(0);
      ppu.window_line = 0;
      ppu.line_rendered = false;
      ppu.window_was_rendered = false;
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
      lcds_mode_set(MODE_VBLANK);
      cpu_request_interrupt(INT_VBLANK);

      if (lcds_stat_int(SS_VBLANK)) {
        cpu_request_interrupt(INT_LCD_STAT);
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
      lcds_mode_set(MODE_OAM);
      ppu.line_rendered = false;
      ppu.window_was_rendered = false;
    }

    ppu.line_ticks = 0;
  }
}

export function ppu_tick(): void {
  const ppu = ppu_get_context();
  ppu.line_ticks++;

  switch (lcds_mode()) {
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
  const ppu = ppu_get_context();

  ppu.line_rendered = false;
  ppu.window_was_rendered = false;
  lcd_set_mode(MODE_OAM);
}