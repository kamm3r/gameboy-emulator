import { useEffect, useRef, useState } from "react";
import { Bug, Pause, Play, Square } from "lucide-react";
import {
  emu_get_ticks,
  emu_pause,
  emu_resume,
  emu_start,
  emu_stop,
} from "@/lib/emu";
import { ui_destroy, ui_init, ui_update } from "@/lib/ui";
import { gamepad_button, gamepad_set_button } from "@/lib/input/gamepad";
import { useEmu } from "@/hooks/use_emu";
import { useEmulatorAudio } from "@/hooks/use_emulator_audio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useKeybinds } from "@/hooks/use_keybinds";
import { KeybindSettings } from "./keybinds_settings";
import {
  format_key_code,
  GAMEPAD_BUTTONS,
  get_key_for_button,
} from "@/lib/input/keybinds";

type EmulatorViewProps = {
  rom_name: string;
};

type StatusBadgeProps = {
  status: "idle" | "running" | "paused";
};

function StatusBadge({ status }: StatusBadgeProps) {
  if (status === "running") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/15">
        running
      </Badge>
    );
  }

  if (status === "paused") {
    return (
      <Badge className="bg-yellow-500/15 text-yellow-300 hover:bg-yellow-500/15">
        paused
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="bg-zinc-800 text-zinc-400">
      idle
    </Badge>
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
        "flex select-none items-center justify-center touch-none " +
        "bg-zinc-800 font-medium text-zinc-200 transition " +
        "hover:bg-zinc-700 active:scale-95 active:bg-zinc-600 " +
        className
      }
    >
      {label}
    </button>
  );
}

function GamepadControls() {
  return (
    <div className="flex items-center justify-between gap-8 py-2">
      <div className="grid h-36 w-36 grid-cols-3 grid-rows-3 gap-1">
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

      <div className="flex gap-4">
        <PadButton
          button="select"
          label="select"
          className="h-8 w-20 rotate-[-25deg] rounded-full text-xs"
        />

        <PadButton
          button="start"
          label="start"
          className="h-8 w-20 rotate-[-25deg] rounded-full text-xs"
        />
      </div>

      <div className="flex rotate-[-25deg] items-center gap-4">
        <PadButton
          button="b"
          label="B"
          className="h-16 w-16 rounded-full bg-red-950 text-lg text-white hover:bg-red-900 active:bg-red-800"
        />

        <PadButton
          button="a"
          label="A"
          className="h-16 w-16 rounded-full bg-red-950 text-lg text-white hover:bg-red-900 active:bg-red-800"
        />
      </div>
    </div>
  );
}
type KeyboardHelpProps = {
  keybinds: Record<string, gamepad_button>;
};

function KeyboardHelp({ keybinds }: KeyboardHelpProps) {
  return (
    <Card className="w-fit border-zinc-800 bg-zinc-950/70">
      <CardContent className="pt-6">
        <div className="font-mono text-xs leading-5 text-zinc-500">
          <div className="mb-1 text-zinc-400">keyboard</div>

          {GAMEPAD_BUTTONS.map(({ button, label }) => {
            const key_code = get_key_for_button(keybinds, button);

            return (
              <div key={button}>
                {label} — {format_key_code(key_code)}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function EmulatorView({ rom_name }: EmulatorViewProps) {
  useEmulatorAudio();

  const emu = useEmu();
  const { keybinds, set_keybinds } = useKeybinds();

  const canvas_ref = useRef<HTMLCanvasElement | null>(null);
  const debug_canvas_ref = useRef<HTMLCanvasElement | null>(null);

  const [show_debug, set_show_debug] = useState(false);

  useEffect(() => {
    let lastTicks = emu_get_ticks();

    const id = window.setInterval(() => {
      const ticks = emu_get_ticks();
      console.log("ticks/sec", ticks - lastTicks);
      lastTicks = ticks;
    }, 1000);

    return () => window.clearInterval(id);
  }, []);

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

  const status = emu.running ? (emu.paused ? "paused" : "running") : "idle";

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-zinc-800 bg-zinc-950/70">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
          <div className="min-w-0 space-y-2">
            <div className="flex min-w-0 items-center gap-2 font-mono text-sm">
              <span className="shrink-0 text-zinc-500">rom</span>
              <span className="truncate text-zinc-100">
                {rom_name || "none"}
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono text-sm">
              <span className="text-zinc-500">status</span>
              <StatusBadge status={status} />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-zinc-500">fps</span>
              <span className="text-zinc-100">
                {emu.running && !emu.paused ? `${emu.fps} fps` : "—"}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {can_start && (
              <Button
                type="button"
                size="icon"
                variant="secondary"
                title="start"
                aria-label="start"
                onClick={() => emu_start()}
              >
                <Play className="h-4 w-4" />
              </Button>
            )}

            {can_pause && (
              <Button
                type="button"
                size="icon"
                variant="secondary"
                title="pause"
                aria-label="pause"
                onClick={() => emu_pause()}
              >
                <Pause className="h-4 w-4" />
              </Button>
            )}

            {can_resume && (
              <Button
                type="button"
                size="icon"
                variant="secondary"
                title="resume"
                aria-label="resume"
                onClick={() => emu_resume()}
              >
                <Play className="h-4 w-4" />
              </Button>
            )}

            {can_stop && (
              <Button
                type="button"
                size="icon"
                variant="secondary"
                title="stop"
                aria-label="stop"
                onClick={() => emu_stop()}
              >
                <Square className="h-4 w-4" />
              </Button>
            )}

            <Separator
              orientation="vertical"
              className="mx-1 h-8 bg-zinc-800"
            />
            <KeybindSettings keybinds={keybinds} onChange={set_keybinds} />
            <div className="flex items-center gap-2 rounded-md border border-zinc-800 px-3 py-2">
              <Bug className="h-4 w-4 text-zinc-500" />
              <span className="hidden text-xs text-zinc-400 sm:inline">
                debug
              </span>
              <Switch checked={show_debug} onCheckedChange={set_show_debug} />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div
            className={
              show_debug
                ? "grid items-start gap-8 lg:grid-cols-[auto_auto]"
                : "flex flex-col"
            }
          >
            <div className="flex flex-col gap-4">
              <canvas
                ref={canvas_ref}
                className="block rounded-md bg-black [image-rendering:pixelated]"
                style={{
                  width: 480,
                  aspectRatio: "160 / 144",
                }}
              />

              <GamepadControls />
            </div>

            <div className={show_debug ? "block" : "hidden"}>
              <div className="mb-2 flex items-center gap-2 font-mono text-xs text-zinc-500">
                <Bug className="h-3.5 w-3.5" />
                render debug
              </div>

              <canvas
                ref={debug_canvas_ref}
                className="block rounded-md bg-black [image-rendering:pixelated]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <KeyboardHelp keybinds={keybinds} />
    </div>
  );
}
