import { emu_get_context } from "@/lib/emu";
import { bus_read } from "@/lib/bus";
import { ppu_get_context } from "@/lib/ppu";
import { gamepad_get_state } from "@/lib/gamepad";
import { SCREEN_WIDTH, SCREEN_HEIGHT, XRES, YRES } from "@/lib/common";

type ui_context = {
  mainCanvas: HTMLCanvasElement | null;
  mainCtx: CanvasRenderingContext2D | null;
  debugCanvas: HTMLCanvasElement | null;
  debugCtx: CanvasRenderingContext2D | null;
  scale: number;
  initialized: boolean;
};

const ui: ui_context = {
  mainCanvas: null,
  mainCtx: null,
  debugCanvas: null,
  debugCtx: null,
  scale: 4,
  initialized: false,
};

const tileColors = [0xffffffff, 0xffaaaaaa, 0xff555555, 0xff000000];

function argb_to_css(color: number): string {
  const a = ((color >>> 24) & 0xff) / 255;
  const r = (color >>> 16) & 0xff;
  const g = (color >>> 8) & 0xff;
  const b = color & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function ui_init(
  mainCanvas: HTMLCanvasElement,
  debugCanvas: HTMLCanvasElement,
): void {
  const mainCtx = mainCanvas.getContext("2d");
  const debugCtx = debugCanvas.getContext("2d");

  if (!mainCtx || !debugCtx) {
    throw new Error("Failed to get canvas 2D context");
  }

  mainCanvas.width = SCREEN_WIDTH * ui.scale;
  mainCanvas.height = SCREEN_HEIGHT * ui.scale;
  debugCanvas.width = (16 * 8 * ui.scale) + (16 * ui.scale);
  debugCanvas.height = (32 * 8 * ui.scale) + (64 * ui.scale);

  mainCtx.imageSmoothingEnabled = false;
  debugCtx.imageSmoothingEnabled = false;

  ui.mainCanvas = mainCanvas;
  ui.mainCtx = mainCtx;
  ui.debugCanvas = debugCanvas;
  ui.debugCtx = debugCtx;
  ui.initialized = true;

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
}

export function ui_destroy(): void {
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("keyup", onKeyUp);

  ui.mainCanvas = null;
  ui.mainCtx = null;
  ui.debugCanvas = null;
  ui.debugCtx = null;
  ui.initialized = false;
}

export function get_ticks(): number {
  return performance.now() | 0;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fillRect(
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
  startLocation: number,
  tileNum: number,
  x: number,
  y: number,
): void {
  for (let tileY = 0; tileY < 16; tileY += 2) {
    const b1 = bus_read(startLocation + (tileNum * 16) + tileY);
    const b2 = bus_read(startLocation + (tileNum * 16) + tileY + 1);

    for (let bit = 7; bit >= 0; bit--) {
      const hi = Number(Boolean(b1 & (1 << bit))) << 1;
      const lo = Number(Boolean(b2 & (1 << bit)));
      const color = hi | lo;

      const px = x + ((7 - bit) * ui.scale);
      const py = y + ((tileY / 2) * ui.scale);

      fillRect(ctx, px, py, ui.scale, ui.scale, tileColors[color]);
    }
  }
}

function update_dbg_window(): void {
  if (!ui.debugCtx || !ui.debugCanvas) return;

  ui.debugCtx.fillStyle = "#111111";
  ui.debugCtx.fillRect(0, 0, ui.debugCanvas.width, ui.debugCanvas.height);

  let xDraw = 0;
  let yDraw = 0;
  let tileNum = 0;

  const addr = 0x8000;

  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 16; x++) {
      display_tile(
        ui.debugCtx,
        addr,
        tileNum,
        xDraw + (x * ui.scale),
        yDraw + (y * ui.scale),
      );
      xDraw += 8 * ui.scale;
      tileNum++;
    }

    yDraw += 8 * ui.scale;
    xDraw = 0;
  }
}

export function ui_update(): void {
  if (!ui.initialized || !ui.mainCtx) return;

  const videoBuffer = ppu_get_context().video_buffer;

  for (let lineNum = 0; lineNum < YRES; lineNum++) {
    for (let x = 0; x < XRES; x++) {
      const color = videoBuffer[x + (lineNum * XRES)];
      fillRect(
        ui.mainCtx,
        x * ui.scale,
        lineNum * ui.scale,
        ui.scale,
        ui.scale,
        color,
      );
    }
  }

  update_dbg_window();
}

function ui_on_key(down: boolean, keyCode: string): void {
  const pad = gamepad_get_state();

  switch (keyCode) {
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

function shouldPreventDefault(code: string): boolean {
  return (
    code === "Tab" ||
    code === "ArrowUp" ||
    code === "ArrowDown" ||
    code === "ArrowLeft" ||
    code === "ArrowRight"
  );
}

function onKeyDown(e: KeyboardEvent): void {
  if (shouldPreventDefault(e.code)) {
    e.preventDefault();
  }

  ui_on_key(true, e.code);
}

function onKeyUp(e: KeyboardEvent): void {
  if (shouldPreventDefault(e.code)) {
    e.preventDefault();
  }

  ui_on_key(false, e.code);
}

export function ui_handle_events(): void {
  if (emu_get_context().die) {
    ui_destroy();
  }
}