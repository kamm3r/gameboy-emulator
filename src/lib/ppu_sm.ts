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

      if (!ppu.line_sprites) {
        ppu.line_sprites = entry;
        continue;
      }

      const head = ppu.line_sprites;
      const head_should_come_after =
        head.entry.x > e.x ||
        (head.entry.x === e.x && head.entry.oam_index > e.oam_index);

      if (head_should_come_after) {
        entry.next = ppu.line_sprites;
        ppu.line_sprites = entry;
        continue;
      }

      let prev: oam_line_entry = ppu.line_sprites;
      let le: oam_line_entry | null = ppu.line_sprites.next;

      while (le) {
        const le_should_come_after =
          le.entry.x > e.x ||
          (le.entry.x === e.x && le.entry.oam_index > e.oam_index);

        if (le_should_come_after) {
          prev.next = entry;
          entry.next = le;
          break;
        }

        prev = le;
        le = le.next;
      }

      if (!le) {
        prev.next = entry;
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

// Frame timing - removed busy-wait delay
// Let the emulator loop handle timing instead
let frame_count = 0;
let fps_timer_start = 0;

function update_fps(): void {
  const now = performance.now();

  if (fps_timer_start === 0) {
    fps_timer_start = now;
  }

  frame_count++;

  if (now - fps_timer_start >= 1000) {
    console.log(`FPS: ${frame_count}`);
    frame_count = 0;
    fps_timer_start = now;

    if (cart_need_save()) {
      cart_battery_save();
    }
  }
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

      // FPS counting without blocking
      update_fps();
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

  // Reset FPS timer
  frame_count = 0;
  fps_timer_start = 0;
}