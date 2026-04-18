import { dma_start } from "@/lib/dma";

export type lcd_context = {
  lcdc: number;
  lcds: number;
  scroll_y: number;
  scroll_x: number;
  ly: number;
  ly_compare: number;
  dma: number;
  bg_palette: number;
  obj_palette: [number, number];
  win_y: number;
  win_x: number;

  bg_colors: [number, number, number, number];
  sp1_colors: [number, number, number, number];
  sp2_colors: [number, number, number, number];
};

const colorsDefault: [number, number, number, number] = [
  0xffffffff,
  0xffaaaaaa,
  0xff555555,
  0xff000000,
];

const ctx: lcd_context = {
  lcdc: 0x91,
  lcds: 0,
  scroll_y: 0,
  scroll_x: 0,
  ly: 0,
  ly_compare: 0,
  dma: 0,
  bg_palette: 0xfc,
  obj_palette: [0xff, 0xff],
  win_y: 0,
  win_x: 0,
  bg_colors: [...colorsDefault],
  sp1_colors: [...colorsDefault],
  sp2_colors: [...colorsDefault],
};

function update_lyc_flag(): void {
  if (ctx.ly === ctx.ly_compare) {
    ctx.lcds |= 0x04;
  } else {
    ctx.lcds &= ~0x04;
  }
}

function update_palette(paletteData: number, pal: number): void {
  let p_colors = ctx.bg_colors;

  switch (pal) {
    case 1:
      p_colors = ctx.sp1_colors;
      break;
    case 2:
      p_colors = ctx.sp2_colors;
      break;
  }

  p_colors[0] = colorsDefault[paletteData & 0b11];
  p_colors[1] = colorsDefault[(paletteData >> 2) & 0b11];
  p_colors[2] = colorsDefault[(paletteData >> 4) & 0b11];
  p_colors[3] = colorsDefault[(paletteData >> 6) & 0b11];
}

export function lcd_init(): void {
  ctx.lcdc = 0x91;
  ctx.lcds = 0;
  ctx.scroll_y = 0;
  ctx.scroll_x = 0;
  ctx.ly = 0;
  ctx.ly_compare = 0;
  ctx.dma = 0;
  ctx.bg_palette = 0xfc;
  ctx.obj_palette[0] = 0xff;
  ctx.obj_palette[1] = 0xff;
  ctx.win_y = 0;
  ctx.win_x = 0;

  for (let i = 0; i < 4; i++) {
    ctx.bg_colors[i] = colorsDefault[i];
    ctx.sp1_colors[i] = colorsDefault[i];
    ctx.sp2_colors[i] = colorsDefault[i];
  }

  update_lyc_flag();
}

export function lcd_get_context(): lcd_context {
  return ctx;
}

export function lcd_set_ly(value: number): void {
  ctx.ly = value & 0xff;
  update_lyc_flag();
}

export function lcd_set_mode(mode: number): void {
  ctx.lcds = (ctx.lcds & ~0x03) | (mode & 0x03);
}

export function lcd_read(address: number): number {
  switch (address & 0xffff) {
    case 0xff40:
      return ctx.lcdc;
    case 0xff41:
      return ctx.lcds | 0x80;
    case 0xff42:
      return ctx.scroll_y;
    case 0xff43:
      return ctx.scroll_x;
    case 0xff44:
      return ctx.ly;
    case 0xff45:
      return ctx.ly_compare;
    case 0xff46:
      return ctx.dma;
    case 0xff47:
      return ctx.bg_palette;
    case 0xff48:
      return ctx.obj_palette[0];
    case 0xff49:
      return ctx.obj_palette[1];
    case 0xff4a:
      return ctx.win_y;
    case 0xff4b:
      return ctx.win_x;
    default:
      console.log(
        `UNSUPPORTED lcd_read(${address.toString(16).padStart(4, "0")})`,
      );
      return 0xff;
  }
}

export function lcd_write(address: number, value: number): void {
  address &= 0xffff;
  value &= 0xff;

  switch (address) {
    case 0xff40:
      ctx.lcdc = value;
      break;
    case 0xff41:
      ctx.lcds = (ctx.lcds & 0x07) | (value & 0x78);
      break;
    case 0xff42:
      ctx.scroll_y = value;
      break;
    case 0xff43:
      ctx.scroll_x = value;
      break;
    case 0xff44:
      break;
    case 0xff45:
      ctx.ly_compare = value;
      update_lyc_flag();
      break;
    case 0xff46:
      ctx.dma = value;
      dma_start(value);
      break;
    case 0xff47:
      ctx.bg_palette = value;
      update_palette(value, 0);
      break;
    case 0xff48:
      ctx.obj_palette[0] = value;
      update_palette(value & 0xfc, 1);
      break;
    case 0xff49:
      ctx.obj_palette[1] = value;
      update_palette(value & 0xfc, 2);
      break;
    case 0xff4a:
      ctx.win_y = value;
      break;
    case 0xff4b:
      ctx.win_x = value;
      break;
    default:
      console.log(
        `UNSUPPORTED lcd_write(${address.toString(16).padStart(4, "0")})`,
      );
      break;
  }
}