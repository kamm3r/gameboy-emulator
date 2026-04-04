import { emu_get_context } from "@/lib/emu";
import { bus_read } from "@/lib/bus";
import { ppu_get_context } from "@/lib/ppu";
import { gamepad_get_state } from "@/lib/gamepad";
import { SCREEN_WIDTH, SCREEN_HEIGHT, XRES, YRES } from "@/lib/common";

let mainCanvas: HTMLCanvasElement;
let mainCtx: CanvasRenderingContext2D;

let debugCanvas: HTMLCanvasElement;
let debugCtx: CanvasRenderingContext2D;

const scale = 4;

const tileColors = [0xffffffff, 0xffaaaaaa, 0xff555555, 0xff000000];

function argbToCss(color: number): string {
  const a = ((color >>> 24) & 0xff) / 255;
  const r = (color >>> 16) & 0xff;
  const g = (color >>> 8) & 0xff;
  const b = color & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function getOrCreateCanvas(
  id: string,
  width: number,
  height: number,
  title?: string,
): HTMLCanvasElement {
  let canvas = document.getElementById(id) as HTMLCanvasElement | null;

  if (!canvas) {
    const container = document.createElement("div");
    container.style.display = "inline-block";
    container.style.marginRight = "12px";

    if (title) {
      const label = document.createElement("div");
      label.textContent = title;
      label.style.fontFamily = "monospace";
      label.style.marginBottom = "4px";
      container.appendChild(label);
    }

    canvas = document.createElement("canvas");
    canvas.id = id;
    canvas.width = width;
    canvas.height = height;
    canvas.style.border = "1px solid #444";
    canvas.style.imageRendering = "pixelated";

    container.appendChild(canvas);
    document.body.appendChild(container);
  }

  return canvas;
}

export function ui_init(): void {
  mainCanvas = getOrCreateCanvas(
    "emu-screen",
    SCREEN_WIDTH * scale,
    SCREEN_HEIGHT * scale,
    "Game",
  );
  debugCanvas = getOrCreateCanvas(
    "emu-debug",
    (16 * 8 * scale) + (16 * scale),
    (32 * 8 * scale) + (64 * scale),
    "Tiles",
  );

  const maybeMainCtx = mainCanvas.getContext("2d");
  const maybeDebugCtx = debugCanvas.getContext("2d");

  if (!maybeMainCtx || !maybeDebugCtx) {
    throw new Error("Failed to get 2D canvas context");
  }

  mainCtx = maybeMainCtx;
  debugCtx = maybeDebugCtx;

  mainCtx.imageSmoothingEnabled = false;
  debugCtx.imageSmoothingEnabled = false;

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  console.log("UI INIT");
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function get_ticks(): number {
  return performance.now() | 0;
}

function fillRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
): void {
  ctx.fillStyle = argbToCss(color);
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

      const px = x + ((7 - bit) * scale);
      const py = y + ((tileY / 2) * scale);

      fillRect(debugCtx, px, py, scale, scale, tileColors[color]);
    }
  }
}

function update_dbg_window(): void {
  debugCtx.fillStyle = "#111111";
  debugCtx.fillRect(0, 0, debugCanvas.width, debugCanvas.height);

  let xDraw = 0;
  let yDraw = 0;
  let tileNum = 0;

  const addr = 0x8000;

  // 384 tiles, laid out in 24 x 16
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 16; x++) {
      display_tile(debugCtx, addr, tileNum, xDraw + (x * scale), yDraw + (y * scale));
      xDraw += 8 * scale;
      tileNum++;
    }

    yDraw += 8 * scale;
    xDraw = 0;
  }
}

export function ui_update(): void {
  const videoBuffer = ppu_get_context().video_buffer;

  for (let lineNum = 0; lineNum < YRES; lineNum++) {
    for (let x = 0; x < XRES; x++) {
      const color = videoBuffer[x + (lineNum * XRES)];
      fillRect(mainCtx, x * scale, lineNum * scale, scale, scale, color);
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

function onKeyDown(e: KeyboardEvent): void {
  if (
    e.code === "Tab" ||
    e.code === "ArrowUp" ||
    e.code === "ArrowDown" ||
    e.code === "ArrowLeft" ||
    e.code === "ArrowRight"
  ) {
    e.preventDefault();
  }

  ui_on_key(true, e.code);
}

function onKeyUp(e: KeyboardEvent): void {
  if (
    e.code === "Tab" ||
    e.code === "ArrowUp" ||
    e.code === "ArrowDown" ||
    e.code === "ArrowLeft" ||
    e.code === "ArrowRight"
  ) {
    e.preventDefault();
  }

  ui_on_key(false, e.code);
}

export function ui_handle_events(): void {
  // No-op in browser version.
  // Events are handled through window event listeners.
  // You can keep this function so existing emulator code doesn't need to change.

  if (document.visibilityState === "hidden") {
    // optional behavior could go here
  }

  if (emu_get_context().die) {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
  }
}