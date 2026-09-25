import { XRES, YRES } from "@/lib/common";
import { ppu_get_context, ppu_update_dirty_tiles } from "@/lib/ppu/ppu";

// Tile viewer: 384 tiles in a 16 x 24 grid with a 1px gap
const TILES_X = 16;
const TILES_Y = 24;
const DEBUG_W = TILES_X * 9 - 1;
const DEBUG_H = TILES_Y * 9 - 1;
const DEBUG_SHADES = [0xffffffff, 0xffaaaaaa, 0xff555555, 0xff000000];
const DEBUG_GAP = 0xff111111;

type view = {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  image: ImageData;
  pixels: Uint32Array;
};

let main: view | null = null;
let debug: view | null = null;

// scale sets a fixed CSS size; without it the canvas is sized by CSS
function make_view(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  scale?: number,
): view {
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get canvas 2D context");
  }

  canvas.width = width;
  canvas.height = height;
  ctx.imageSmoothingEnabled = false;

  if (scale) {
    canvas.style.width = `${width * scale}px`;
    canvas.style.height = `${height * scale}px`;
  }

  const image = new ImageData(width, height);
  return { ctx, canvas, image, pixels: new Uint32Array(image.data.buffer) };
}

// 0xAARRGGBB -> little-endian RGBA bytes (0xAABBGGRR)
function argb_to_abgr(c: number): number {
  return (
    ((c & 0xff00ff00) | ((c >>> 16) & 0xff) | ((c & 0xff) << 16)) >>> 0
  );
}

export function ui_init(
  main_canvas: HTMLCanvasElement,
  debug_canvas?: HTMLCanvasElement | null,
  debug_scale = 2,
): void {
  main = make_view(main_canvas, XRES, YRES);
  debug = debug_canvas
    ? make_view(debug_canvas, DEBUG_W, DEBUG_H, debug_scale)
    : null;
}

export function ui_destroy(): void {
  main = null;
  debug = null;
}

function update_debug_view(v: view): void {
  ppu_update_dirty_tiles();

  const decoded = ppu_get_context().decoded_tiles;
  v.pixels.fill(argb_to_abgr(DEBUG_GAP));

  for (let tile = 0; tile < TILES_X * TILES_Y; tile++) {
    const x0 = (tile % TILES_X) * 9;
    const y0 = Math.floor(tile / TILES_X) * 9;

    for (let i = 0; i < 64; i++) {
      const shade = DEBUG_SHADES[decoded[tile * 64 + i]];
      v.pixels[(y0 + (i >> 3)) * DEBUG_W + x0 + (i & 7)] = argb_to_abgr(shade);
    }
  }

  v.ctx.putImageData(v.image, 0, 0);
}

export function ui_update(): void {
  if (!main) {
    return;
  }

  const video = ppu_get_context().video_buffer;

  for (let i = 0; i < video.length; i++) {
    main.pixels[i] = argb_to_abgr(video[i]);
  }

  main.ctx.putImageData(main.image, 0, 0);

  // Skip the tile viewer while it's hidden (display: none)
  if (debug && debug.canvas.offsetParent !== null) {
    update_debug_view(debug);
  }
}
