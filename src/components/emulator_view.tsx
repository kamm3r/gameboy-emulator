import { useEffect, useRef } from "react";
import { ui_init, ui_destroy, ui_update } from "@/lib/ui";
import {
  emu_init,
  emu_load_rom,
  emu_start,
  emu_stop,
  emu_run_chunk,
  emu_get_frame,
} from "@/lib/emu";

type Props = {
  romData: Uint8Array | null;
  romName: string;
};

export function EmulatorView({ romData, romName }: Props) {
  const mainRef = useRef<HTMLCanvasElement | null>(null);
  const debugRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const prevFrameRef = useRef(-1);

  useEffect(() => {
    if (!romData || !mainRef.current || !debugRef.current) {
      return;
    }

    ui_init(mainRef.current, debugRef.current);
    emu_init();

    if (!emu_load_rom(romData, romName)) {
      console.error("Failed to load ROM");
      return;
    }

    emu_start();

    const loop = () => {
      emu_run_chunk(2000);

      const currentFrame = emu_get_frame();
      if (currentFrame !== prevFrameRef.current) {
        ui_update();
        prevFrameRef.current = currentFrame;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      emu_stop();
      ui_destroy();
    };
  }, [romData, romName]);

  if (!romData) {
    return <div>Select a ROM file to start.</div>;
  }

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div>
        <div>Game</div>
        <canvas ref={mainRef} />
      </div>

      <div>
        <div>Tiles</div>
        <canvas ref={debugRef} />
      </div>
    </div>
  );
}