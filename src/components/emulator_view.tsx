import { useEffect, useRef } from "react";
import { emu_pause, emu_resume, emu_start, emu_stop } from "@/lib/emu";
import { ui_destroy, ui_init, ui_update } from "@/lib/ui";
import { useEmu } from "@/hooks/use_emu";

type EmulatorViewProps = {
  rom_name: string;
};

export function EmulatorView({ rom_name }: EmulatorViewProps) {
  const emu = useEmu();
  const canvas_ref = useRef<HTMLCanvasElement | null>(null);
  const debug_canvas_ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvas_ref.current;
    const debug_canvas = debug_canvas_ref.current;

    if (!canvas) {
      return;
    }

    ui_init(canvas, debug_canvas, 2);

    return () => {
      ui_destroy();
    };
  }, []);

  useEffect(() => {
    ui_update();
  }, [emu.current_frame]);

  const has_rom = Boolean(rom_name);
  const can_start = has_rom && !emu.running;
  const can_pause = emu.running && !emu.paused;
  const can_resume = emu.running && emu.paused;
  const can_stop = emu.running;

  const status = emu.running
    ? emu.paused
      ? "paused"
      : "running"
    : "idle";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-8">
        <canvas
          ref={canvas_ref}
          className="block bg-black [image-rendering:pixelated]"
          style={{
            width: 480,
            aspectRatio: "160 / 144",
          }}
        />

        <canvas
          ref={debug_canvas_ref}
          className="block bg-black [image-rendering:pixelated]"
        />
      </div>

      <div className="flex gap-2">
        <button
          className="px-3 py-1 text-sm text-zinc-200 hover:text-white disabled:text-zinc-600"
          disabled={!can_start}
          onClick={() => emu_start()}
        >
          start
        </button>
        <button
          className="px-3 py-1 text-sm text-zinc-200 hover:text-white disabled:text-zinc-600"
          disabled={!can_pause}
          onClick={() => emu_pause()}
        >
          pause
        </button>
        <button
          className="px-3 py-1 text-sm text-zinc-200 hover:text-white disabled:text-zinc-600"
          disabled={!can_resume}
          onClick={() => emu_resume()}
        >
          resume
        </button>
        <button
          className="px-3 py-1 text-sm text-zinc-200 hover:text-white disabled:text-zinc-600"
          disabled={!can_stop}
          onClick={() => emu_stop()}
        >
          stop
        </button>
      </div>

      <div className="font-mono text-sm text-zinc-400 leading-6">
        <div>
          <span className="text-zinc-500">rom</span> {rom_name || "none"}
        </div>
        <div>
          <span className="text-zinc-500">status</span> {status}
        </div>
        <div>
          <span className="text-zinc-500">ticks</span> {emu.ticks}
        </div>
        <div>
          <span className="text-zinc-500">frame</span> {emu.current_frame}
        </div>
      </div>
    </div>
  );
}