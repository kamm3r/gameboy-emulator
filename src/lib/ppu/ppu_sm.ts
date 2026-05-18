import { cart_battery_save, cart_need_save } from "../cart";
import { YRES } from "../common";
import { cpu_request_interrupt, INT_LCD_STAT, INT_VBLANK } from "../cpu/cpu";
import { lcd_get_context, lcd_set_ly, lcd_set_mode } from "../lcd";
import { type oam_entry, ppu_get_context } from "./ppu";
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

function stat_interrupt_enabled(source: number): boolean {
  return (lcd_get_context().lcds & (1 << (source + 3))) !== 0;
}

function update_lyc_flag(): void {
  const lcd = lcd_get_context();

  const was_set = (lcd.lcds & 0x04) !== 0;
  const is_set = lcd.ly === lcd.ly_compare;

  if (is_set) {
    lcd.lcds |= 0x04;
  } else {
    lcd.lcds &= ~0x04;
  }

  if (!was_set && is_set && stat_interrupt_enabled(SS_LYC)) {
    cpu_request_interrupt(INT_LCD_STAT);
  }
}

function set_ly(value: number): void {
  lcd_set_ly(value & 0xff);
  update_lyc_flag();
}

function set_mode(mode: number): void {
  lcd_set_mode(mode);
}

export function lcds_mode(): number {
  return lcd_get_context().lcds & 0x03;
}

export function increment_ly(): void {
  const lcd = lcd_get_context();
  const ppu = ppu_get_context();

  if (ppu.window_was_rendered) {
    ppu.window_line++;
  }

  ppu.window_was_rendered = false;

  lcd_set_ly((lcd.ly + 1) & 0xff);
  update_lyc_flag();
}

function sprite_comes_before(a: oam_entry, b: oam_entry): boolean {
  if (a.x !== b.x) {
    return a.x < b.x;
  }

  return a.oam_index < b.oam_index;
}

function insert_line_sprite(sprite: oam_entry): void {
  const ppu = ppu_get_context();
  const sprites = ppu.line_sprites;

  let index = ppu.line_sprite_count;

  while (index > 0 && sprite_comes_before(sprite, sprites[index - 1])) {
    sprites[index] = sprites[index - 1];
    index--;
  }

  sprites[index] = sprite;
  ppu.line_sprite_count++;
}

export function load_line_sprites(): void {
  const lcd = lcd_get_context();
  const ppu = ppu_get_context();

  const cur_y = lcd.ly;
  const sprite_height = (lcd.lcdc & 0x04) !== 0 ? 16 : 8;
  const oam = ppu.oam_ram;

  ppu.line_sprite_count = 0;

  for (let i = 0; i < 40; i++) {
    const sprite = oam[i];

    const sprite_top = sprite.y - 16;
    const sprite_bottom = sprite_top + sprite_height;

    if (cur_y < sprite_top || cur_y >= sprite_bottom) {
      continue;
    }

    insert_line_sprite(sprite);

    if (ppu.line_sprite_count >= 10) {
      break;
    }
  }
}

export function ppu_mode_oam(): void {
  const ppu = ppu_get_context();

  if (ppu.line_ticks === 1) {
    if (stat_interrupt_enabled(SS_OAM)) {
      cpu_request_interrupt(INT_LCD_STAT);
    }

    ppu.line_sprite_count = 0;
    ppu.line_rendered = false;
    ppu.window_was_rendered = false;

    load_line_sprites();
  }

  if (ppu.line_ticks >= OAM_TICKS) {
    set_mode(MODE_XFER);
  }
}

export function ppu_mode_xfer(): void {
  const ppu = ppu_get_context();

  if (!ppu.line_rendered) {
    render_scanline();
    ppu.line_rendered = true;
  }

  if (ppu.line_ticks >= OAM_TICKS + XFER_TICKS) {
    set_mode(MODE_HBLANK);

    if (stat_interrupt_enabled(SS_HBLANK)) {
      cpu_request_interrupt(INT_LCD_STAT);
    }
  }
}

export function ppu_mode_vblank(): void {
  const ppu = ppu_get_context();
  const lcd = lcd_get_context();

  if (ppu.line_ticks < TICKS_PER_LINE) {
    return;
  }

  increment_ly();

  if (lcd.ly >= LINES_PER_FRAME) {
    set_mode(MODE_OAM);
    set_ly(0);

    ppu.window_line = 0;
    ppu.line_rendered = false;
    ppu.window_was_rendered = false;
  }

  ppu.line_ticks = 0;
}

export function ppu_mode_hblank(): void {
  const ppu = ppu_get_context();
  const lcd = lcd_get_context();

  if (ppu.line_ticks < TICKS_PER_LINE) {
    return;
  }

  increment_ly();

  if (lcd.ly >= YRES) {
    set_mode(MODE_VBLANK);
    cpu_request_interrupt(INT_VBLANK);

    if (stat_interrupt_enabled(SS_VBLANK)) {
      cpu_request_interrupt(INT_LCD_STAT);
    }

    ppu.current_frame++;

    if (cart_need_save()) {
      cart_battery_save();
    }
  } else {
    set_mode(MODE_OAM);

    ppu.line_rendered = false;
    ppu.window_was_rendered = false;
  }

  ppu.line_ticks = 0;
}

export function ppu_tick(): void {
  const lcd = lcd_get_context();

  if ((lcd.lcdc & 0x80) === 0) {
    return;
  }

  const ppu = ppu_get_context();
  ppu.line_ticks++;

  switch (lcd.lcds & 0x03) {
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

  ppu.current_frame = 0;
  ppu.line_ticks = 0;

  ppu.line_sprite_count = 0;

  ppu.window_line = 0;
  ppu.line_rendered = false;
  ppu.window_was_rendered = false;

  set_mode(MODE_OAM);
  set_ly(0);
}