import { bus_read } from "@/lib/memory/bus";
import { emu_get_context } from "@/lib/emu";
import { gamepad_get_state } from "@/lib/input/gamepad";
import { SCREEN_HEIGHT, SCREEN_WIDTH, XRES, YRES, argb_to_css, COLORS_DEFAULT } from "@/lib/common";
import { ppu_get_context } from "@/lib/ppu/ppu";

type ui_context = {
  main_canvas: HTMLCanvasElement | null;
  main_ctx: CanvasRenderingContext2D | null;
  debug_canvas: HTMLCanvasElement | null;
  debug_ctx: CanvasRenderingContext2D | null;
  scale: number;
  initialized: boolean;
  image_data: ImageData | null;
};

const ui: ui_context = {
  main_canvas: null,
  main_ctx: null,
  debug_canvas: null,
  debug_ctx: null,
  scale: 4,
  initialized: false,
  image_data: null,
};

const tile_colors = COLORS_DEFAULT;

export function ui_init(
  main_canvas: HTMLCanvasElement,
  debug_canvas?: HTMLCanvasElement | null,
  scale = 4,
): void {
  const main_ctx = main_canvas.getContext("2d");

  if (!main_ctx) {
    throw new Error("Failed to get main canvas 2D context");
  }

  const debug_ctx = debug_canvas?.getContext("2d") ?? null;

  ui.scale = scale;

  main_canvas.width = SCREEN_WIDTH;
  main_canvas.height = SCREEN_HEIGHT;
  main_canvas.style.width = `${SCREEN_WIDTH * scale}px`;
  main_canvas.style.height = `${SCREEN_HEIGHT * scale}px`;

  main_ctx.imageSmoothingEnabled = false;

  if (debug_canvas && debug_ctx) {
    debug_canvas.width = (16 * 8 * scale) + (16 * scale);
    debug_canvas.height = (32 * 8 * scale) + (64 * scale);
    debug_ctx.imageSmoothingEnabled = false;
  }

  ui.main_canvas = main_canvas;
  ui.main_ctx = main_ctx;
  ui.debug_canvas = debug_canvas ?? null;
  ui.debug_ctx = debug_ctx;
  ui.image_data = new ImageData(XRES, YRES);
  ui.initialized = true;

  window.addEventListener("keydown", on_key_down);
  window.addEventListener("keyup", on_key_up);
}

export function ui_destroy(): void {
  window.removeEventListener("keydown", on_key_down);
  window.removeEventListener("keyup", on_key_up);

  ui.main_canvas = null;
  ui.main_ctx = null;
  ui.debug_canvas = null;
  ui.debug_ctx = null;
  ui.image_data = null;
  ui.initialized = false;
}

function fill_rect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
): void {
  ctx.fillStyle = argb_to_css(color >>> 0);
  ctx.fillRect(x, y, w, h);
}

function display_tile(
  ctx: CanvasRenderingContext2D,
  start_location: number,
  tile_num: number,
  x: number,
  y: number,
): void {
  const scale = ui.scale;

  for (let tile_y = 0; tile_y < 16; tile_y += 2) {
    const b1 = bus_read(start_location + (tile_num * 16) + tile_y);
    const b2 = bus_read(start_location + (tile_num * 16) + tile_y + 1);

    const row_y = y + ((tile_y / 2) * scale);

    for (let bit = 7; bit >= 0; bit--) {
      const hi = ((b1 >> bit) & 1) << 1;
      const lo = (b2 >> bit) & 1;
      const color = hi | lo;

      const px = x + ((7 - bit) * scale);

      fill_rect(ctx, px, row_y, scale, scale, tile_colors[color]);
    }
  }
}

function update_dbg_window(): void {
  if (!ui.debug_ctx || !ui.debug_canvas) {
    return;
  }

  ui.debug_ctx.fillStyle = "#111111";
  ui.debug_ctx.fillRect(0, 0, ui.debug_canvas.width, ui.debug_canvas.height);

  const scale = ui.scale;
  const addr = 0x8000;
  let x_draw = 0;
  let y_draw = 0;
  let tile_num = 0;

  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 16; x++) {
      display_tile(
        ui.debug_ctx,
        addr,
        tile_num,
        x_draw + (x * scale),
        y_draw + (y * scale),
      );

      x_draw += 8 * scale;
      tile_num++;
    }

    y_draw += 8 * scale;
    x_draw = 0;
  }
}

export function ui_update(): void {
  if (!ui.initialized || !ui.main_ctx || !ui.image_data) {
    return;
  }

  const video_buffer = ppu_get_context().video_buffer;
  const data = ui.image_data.data;

  for (let i = 0; i < video_buffer.length; i++) {
    const color = video_buffer[i] >>> 0;

    const j = i * 4;
    data[j + 0] = (color >>> 16) & 0xff;
    data[j + 1] = (color >>> 8) & 0xff;
    data[j + 2] = color & 0xff;
    data[j + 3] = (color >>> 24) & 0xff;
  }

  ui.main_ctx.putImageData(ui.image_data, 0, 0);

  update_dbg_window();
}

function ui_on_key(down: boolean, key_code: string): void {
  const pad = gamepad_get_state();

  switch (key_code) {
    case "KeyZ":
      pad.b = down;
      break;
    case "KeyX":
      pad.a = down;
      break;
    case "Enter":
      pad.start = down;
      break;
    case "Tab":
      pad.select = down;
      break;
    case "ArrowUp":
      pad.up = down;
      break;
    case "ArrowDown":
      pad.down = down;
      break;
    case "ArrowLeft":
      pad.left = down;
      break;
    case "ArrowRight":
      pad.right = down;
      break;
  }
}

function should_prevent_default(code: string): boolean {
  return (
    code === "Tab" ||
    code === "ArrowUp" ||
    code === "ArrowDown" ||
    code === "ArrowLeft" ||
    code === "ArrowRight"
  );
}

function on_key_down(e: KeyboardEvent): void {
  if (should_prevent_default(e.code)) {
    e.preventDefault();
  }

  ui_on_key(true, e.code);
}

function on_key_up(e: KeyboardEvent): void {
  if (should_prevent_default(e.code)) {
    e.preventDefault();
  }

  ui_on_key(false, e.code);
}

export function ui_handle_events(): void {
  if (emu_get_context().die) {
    ui_destroy();
  }
}
