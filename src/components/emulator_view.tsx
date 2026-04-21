import { useEffect, useRef } from "react";
import { emu_pause, emu_resume, emu_start, emu_stop } from "@/lib/emu";
import { ui_destroy, ui_init, ui_update } from "@/lib/ui";
import {
  gamepad_button,
  gamepad_set_button,
} from "@/lib/gamepad";
import { useEmu } from "@/hooks/use_emu";
import { useEmulatorAudio } from "@/hooks/use_emulator_audio";

type EmulatorViewProps = {
  rom_name: string;
};

const KEY_MAP: Record<string, gamepad_button> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyZ: "a",
  KeyX: "b",
  Enter: "start",
  ShiftRight: "select",
  ShiftLeft: "select",
};

export function EmulatorView({ rom_name }: EmulatorViewProps) {
  useEmulatorAudio();
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

  useEffect(() => {
    function on_key_down(e: KeyboardEvent) {
      const btn = KEY_MAP[e.code];
      if (!btn) return;
      e.preventDefault();
      gamepad_set_button(btn, true);
    }

    function on_key_up(e: KeyboardEvent) {
      const btn = KEY_MAP[e.code];
      if (!btn) return;
      e.preventDefault();
      gamepad_set_button(btn, false);
    }

    window.addEventListener("keydown", on_key_down);
    window.addEventListener("keyup", on_key_up);

    return () => {
      window.removeEventListener("keydown", on_key_down);
      window.removeEventListener("keyup", on_key_up);
    };
  }, []);

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

      <GamepadControls />

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

      <div className="font-mono text-xs text-zinc-500 leading-5">
        <div className="mb-1 text-zinc-400">keyboard</div>
        <div>arrows — d-pad</div>
        <div>z — a</div>
        <div>x — b</div>
        <div>enter — start</div>
        <div>shift — select</div>
      </div>
    </div>
  );
}

type PadButtonProps = {
  button: gamepad_button;
  label: string;
  className?: string;
};

function PadButton({ button, label, className = "" }: PadButtonProps) {
  function press(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    gamepad_set_button(button, true);
  }

  function release(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    gamepad_set_button(button, false);
  }

  return (
    <button
      type="button"
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      onContextMenu={(e) => e.preventDefault()}
      className={
        "select-none touch-none flex items-center justify-center " +
        "bg-zinc-800 text-zinc-200 font-medium " +
        "active:bg-zinc-600 active:scale-95 transition-transform " +
        className
      }
    >
      {label}
    </button>
  );
}

function GamepadControls() {
  return (
    <div className="flex items-center justify-between gap-8 py-4">
      {/* d-pad */}
      <div className="grid grid-cols-3 grid-rows-3 gap-1 w-36 h-36">
        <div />
        <PadButton button="up" label="▲" className="rounded-t-md" />
        <div />
        <PadButton button="left" label="◀" className="rounded-l-md" />
        <div className="bg-zinc-800" />
        <PadButton button="right" label="▶" className="rounded-r-md" />
        <div />
        <PadButton button="down" label="▼" className="rounded-b-md" />
        <div />
      </div>

      {/* start / select */}
      <div className="flex gap-4">
        <PadButton
          button="select"
          label="select"
          className="h-8 w-20 rounded-full text-xs rotate-[-25deg]"
        />
        <PadButton
          button="start"
          label="start"
          className="h-8 w-20 rounded-full text-xs rotate-[-25deg]"
        />
      </div>

      {/* a / b */}
      <div className="flex items-center gap-4 rotate-[-25deg]">
        <PadButton
          button="b"
          label="B"
          className="h-16 w-16 rounded-full bg-red-900 active:bg-red-700 text-white text-lg"
        />
        <PadButton
          button="a"
          label="A"
          className="h-16 w-16 rounded-full bg-red-900 active:bg-red-700 text-white text-lg"
        />
      </div>
    </div>
  );
}