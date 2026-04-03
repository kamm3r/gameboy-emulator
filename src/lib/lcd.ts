import { dma_start } from "@/lib/dma";

export type lcd_context = {
  lcdc: number;
  scroll_x: number;
  scroll_y: number;
  ly: number;
  ly_compare: number;
  bg_palette: number;
  obj_palette: number[];
  win_y: number;
  win_x: number;
  bg_colors: number[];
  sp1_colors: number[];
  sp2_colors: number[];
};

const colors_default: number[] = [0xffffffff, 0xffaaaaaa, 0xff555555, 0xff000000];

const ctx: lcd_context = {
  lcdc: 0x91,
  scroll_x: 0,
  scroll_y: 0,
  ly: 0,
  ly_compare: 0,
  bg_palette: 0xfc,
  obj_palette: [0xff, 0xff],
  win_y: 0,
  win_x: 0,
  bg_colors: [0xffffffff, 0xffaaaaaa, 0xff555555, 0xff000000],
  sp1_colors: [0xffffffff, 0xffaaaaaa, 0xff555555, 0xff000000],
  sp2_colors: [0xffffffff, 0xffaaaaaa, 0xff555555, 0xff000000],
};

export function lcd_init(): void {
  ctx.lcdc = 0x91;
  ctx.scroll_x = 0;
  ctx.scroll_y = 0;
  ctx.ly = 0;
  ctx.ly_compare = 0;
  ctx.bg_palette = 0xfc;
  ctx.obj_palette[0] = 0xff;
  ctx.obj_palette[1] = 0xff;
  ctx.win_y = 0;
  ctx.win_x = 0;

  for (let i = 0; i < 4; i++) {
    ctx.bg_colors[i] = colors_default[i];
    ctx.sp1_colors[i] = colors_default[i];
    ctx.sp2_colors[i] = colors_default[i];
  }
}

export function lcd_get_context(): lcd_context {
  return ctx;
}

export function lcd_read(address: number): number {
  const offset = address - 0xff40;
  const p = ctx as unknown as number[];
  return p[offset];
}

function update_palette(palette_data: number, pal: number): void {
  let p_colors = ctx.bg_colors;

  if (pal === 1) {
    p_colors = ctx.sp1_colors;
  } else if (pal === 2) {
    p_colors = ctx.sp2_colors;
  }

  p_colors[0] = colors_default[palette_data & 0b11];
  p_colors[1] = colors_default[(palette_data >> 2) & 0b11];
  p_colors[2] = colors_default[(palette_data >> 4) & 0b11];
  p_colors[3] = colors_default[(palette_data >> 6) & 0b11];
}

export function lcd_write(address: number, value: number): void {
  const offset = address - 0xff40;
  const p = ctx as unknown as number[];
  p[offset] = value;

  if (offset === 6) {
    dma_start(value);
  }

  if (address === 0xff47) {
    update_palette(value, 0);
  } else if (address === 0xff48) {
    update_palette(value & 0b11111100, 1);
  } else if (address === 0xff49) {
    update_palette(value & 0b11111100, 2);
  }
}
