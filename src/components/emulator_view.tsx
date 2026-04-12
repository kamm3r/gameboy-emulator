import { useEffect, useRef } from "react";
import {
  emu_pause,
  emu_resume,
  emu_start,
  emu_stop,
} from "@/lib/emu";
import { ppu_get_context } from "@/lib/ppu";
import { useEmu } from "@/hooks/use_emu";

type emulator_view_props = {
  rom_name: string;
};

export function EmulatorView({
  rom_name,
}: emulator_view_props) {
  const emu = useEmu();
  const canvas_ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvas_ref.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const ppu_ctx = ppu_get_context();

    // change this to whatever your actual framebuffer field is called
    const frame_buffer = ppu_ctx.current_frame;

    if (!frame_buffer) {
      return;
    }

    // expects RGBA buffer: 160 * 144 * 4
    const image_data = new ImageData(frame_buffer, 160, 144);
    context.putImageData(image_data, 0, 0);
  }, [emu.current_frame]);

  return (
    <div>
      <canvas
        ref={canvas_ref}
        width={160}
        height={144}
        style={{
          width: 320,
          height: 288,
          imageRendering: "pixelated",
          border: "1px solid #666",
        }}
      />

      <div>rom: {rom_name || "none"}</div>
      <div>running: {String(emu.running)}</div>
      <div>paused: {String(emu.paused)}</div>
      <div>ticks: {emu.ticks}</div>
      <div>frame: {emu.current_frame}</div>

      <button onClick={() => emu_start()}>start</button>
      <button onClick={() => emu_pause()}>pause</button>
      <button onClick={() => emu_resume()}>resume</button>
      <button onClick={() => emu_stop()}>stop</button>
    </div>
  );
}