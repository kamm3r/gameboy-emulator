import { useEffect, useRef } from "react";
import { emu_pause, emu_resume, emu_start, emu_stop } from "@/lib/emu";
import { ui_destroy, ui_init, ui_update } from "@/lib/ui";
import { useEmu } from "@/hooks/use_emu";

type emulator_view_props = {
  rom_name: string;
};

export function EmulatorView({ rom_name }: emulator_view_props) {
  const emu = useEmu();
  const canvas_ref = useRef<HTMLCanvasElement | null>(null);
  const debug_canvas_ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvas_ref.current;
    const debugCanvas = debug_canvas_ref.current;

    if (!canvas) {
      return;
    }

    ui_init(canvas, debugCanvas, 2);

    return () => {
      ui_destroy();
    };
  }, []);

  useEffect(() => {
    ui_update();
  }, [emu.current_frame]);

  return (
    <div>
      <canvas
        ref={canvas_ref}
        style={{
          imageRendering: "pixelated",
          border: "1px solid #666",
        }}
      />

      <canvas
        ref={debug_canvas_ref}
        style={{
          imageRendering: "pixelated",
          border: "1px solid #666",
          marginTop: 8,
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