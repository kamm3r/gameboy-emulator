import { useEffect, useRef, useState } from "react";
import {
  Bug,
  Gamepad2,
  Maximize,
  Minimize,
  Pause,
  Play,
  Square,
  Upload,
} from "lucide-react";
import { emu_pause, emu_resume, emu_start, emu_stop } from "@/lib/emu";
import { ui_destroy, ui_init, ui_update } from "@/lib/ui";
import { XRES, YRES } from "@/lib/common";
import { cn } from "@/lib/utils";
import { useEmu } from "@/hooks/use_emu";
import { useEmulatorAudio } from "@/hooks/use_emulator_audio";
import { useKeybinds } from "@/hooks/use_keybinds";
import { useSetting } from "@/hooks/use_setting";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ActionButtons, DPad, PillButton, StartSelect } from "./touch_gamepad";
import { KeybindSettings } from "./keybinds_settings";
import {
  format_key_code,
  GAMEPAD_BUTTONS,
  get_keys_for_button,
} from "@/lib/input/keybinds";
import type { keybind_map } from "@/lib/input/keybinds";

type EmulatorViewProps = {
  rom_name: string;
  on_load_rom: (file: File) => void;
};

export function LoadRomButton({
  on_load_rom,
  variant = "secondary",
}: {
  on_load_rom: (file: File) => void;
  variant?: "default" | "secondary";
}) {
  return (
    <Button asChild variant={variant} size="sm">
      <label className="cursor-pointer">
        <Upload data-icon="inline-start" />
        load rom
        <input
          type="file"
          // octet-stream lets iOS pick .gb files it doesn't recognise
          accept=".gb,.gbc,application/octet-stream"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) on_load_rom(file);
            e.target.value = "";
          }}
        />
      </label>
    </Button>
  );
}

function StatusBadge({ running, paused }: { running: boolean; paused: boolean }) {
  if (!running) return <Badge variant="outline">idle</Badge>;
  if (paused) return <Badge variant="secondary">paused</Badge>;
  return <Badge>running</Badge>;
}

function useFullscreen(ref: React.RefObject<HTMLElement | null>) {
  const [active, set_active] = useState(false);
  const [supported, set_supported] = useState(false);

  useEffect(() => {
    // iPhone Safari has no element fullscreen; hide the button there
    set_supported(document.fullscreenEnabled);

    const on_change = () =>
      set_active(document.fullscreenElement === ref.current);
    document.addEventListener("fullscreenchange", on_change);
    return () => document.removeEventListener("fullscreenchange", on_change);
  }, [ref]);

  function toggle(): void {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void ref.current?.requestFullscreen();
    }
  }

  return { active, supported, toggle };
}

function SettingSwitch({
  id,
  label,
  icon: Icon,
  checked,
  onCheckedChange,
  className,
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
      <Label htmlFor={id} className="gap-1.5 text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </Label>
    </div>
  );
}

function KeyboardHints({ keybinds }: { keybinds: keybind_map }) {
  return (
    <div className="hidden flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground mouse:flex">
      {GAMEPAD_BUTTONS.map(({ button, label }) => (
        <span key={button} className="flex items-center gap-1 whitespace-nowrap">
          {label}
          {get_keys_for_button(keybinds, button).map((code) => (
            <kbd
              key={code}
              className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[0.7rem] text-foreground"
            >
              {format_key_code(code)}
            </kbd>
          ))}
        </span>
      ))}
    </div>
  );
}

export function EmulatorView({ rom_name, on_load_rom }: EmulatorViewProps) {
  useEmulatorAudio();

  const emu = useEmu();
  const { keybinds, set_keybinds } = useKeybinds();
  const [show_debug, set_show_debug] = useSetting("gb.debug", false);

  const stage_ref = useRef<HTMLDivElement | null>(null);
  const canvas_ref = useRef<HTMLCanvasElement | null>(null);
  const debug_canvas_ref = useRef<HTMLCanvasElement | null>(null);
  const fullscreen = useFullscreen(stage_ref);

  useEffect(() => {
    if (!canvas_ref.current) return;

    ui_init(canvas_ref.current, debug_canvas_ref.current);
    return () => ui_destroy();
  }, []);

  useEffect(() => {
    ui_update();
  }, [emu.current_frame, show_debug]);

  const has_rom = Boolean(rom_name);
  const aspect = XRES / YRES;

  return (
    <div className="flex flex-col gap-4">
      <Card size="sm">
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3 font-mono text-sm">
            <span className="truncate">{rom_name || "no rom"}</span>
            <StatusBadge running={emu.running} paused={emu.paused} />
            {emu.running && !emu.paused && (
              <span className="text-muted-foreground tabular-nums">
                {emu.fps} fps
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {has_rom && !emu.running && (
              <Button size="icon" variant="secondary" aria-label="start" onClick={emu_start}>
                <Play />
              </Button>
            )}
            {emu.running && (
              <Button
                size="icon"
                variant="secondary"
                aria-label={emu.paused ? "resume" : "pause"}
                onClick={emu.paused ? emu_resume : emu_pause}
              >
                {emu.paused ? <Play /> : <Pause />}
              </Button>
            )}
            {emu.running && (
              <Button size="icon" variant="secondary" aria-label="stop" onClick={emu_stop}>
                <Square />
              </Button>
            )}
            {fullscreen.supported && (
              <Button
                size="icon"
                variant="secondary"
                aria-label={fullscreen.active ? "exit fullscreen" : "fullscreen"}
                onClick={fullscreen.toggle}
              >
                {fullscreen.active ? <Minimize /> : <Maximize />}
              </Button>
            )}

            <Separator orientation="vertical" className="mx-1 h-6" />

            <SettingSwitch
              id="debug"
              label="debug"
              icon={Bug}
              checked={show_debug}
              onCheckedChange={set_show_debug}
              className="touch:hidden"
            />
            <div className="hidden mouse:block">
              <KeybindSettings keybinds={keybinds} onChange={set_keybinds} />
            </div>
            <LoadRomButton on_load_rom={on_load_rom} />
          </div>
        </CardContent>
      </Card>

      {/* Fullscreen target: screen plus touch controls */}
      <div
        ref={stage_ref}
        className={cn(
          "flex flex-col items-center gap-6",
          "landscape-phone:grid landscape-phone:grid-cols-[1fr_auto_1fr] landscape-phone:gap-4",
          fullscreen.active && "justify-center bg-background p-4",
        )}
      >
        {/* Landscape phone: D-pad + select on the left */}
        <div className="hidden w-full max-w-36 flex-col items-center gap-5 justify-self-center touch:landscape-phone:flex">
          <DPad className="w-full" />
          <PillButton button="select" label="select" />
        </div>

        <div className="flex w-full flex-col items-center gap-3 landscape-phone:w-auto">
          {/* Width capped so the screen fits the viewport height; the canvas
              fills it and its height follows the canvas's own aspect ratio */}
          <div
            className={cn(
              "relative",
              fullscreen.active
                ? "w-[min(100%,calc(100dvh*var(--screen-aspect)))]"
                : "w-[min(100%,calc(65dvh*var(--screen-aspect)))]",
              "landscape-phone:w-auto",
            )}
            style={{ "--screen-aspect": aspect } as React.CSSProperties}
          >
            <canvas
              ref={canvas_ref}
              aria-label="Game Boy screen"
              className={cn(
                "block aspect-(--screen-aspect) w-full rounded-md bg-black [image-rendering:pixelated]",
                fullscreen.active && "rounded-none",
                // Landscape: fill the height left over by the toolbar
                fullscreen.active
                  ? "landscape-phone:h-[calc(100dvh-2rem)]"
                  : "landscape-phone:h-[calc(100dvh-6rem)]",
                "landscape-phone:w-auto",
              )}
            />

            {!has_rom && (
              <Empty className="absolute inset-0 rounded-md border bg-card">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Gamepad2 />
                  </EmptyMedia>
                  <EmptyTitle>No ROM loaded</EmptyTitle>
                  <EmptyDescription>
                    Load a Game Boy ROM (.gb) to start playing
                    <span className="hidden mouse:inline">
                      , or drop one anywhere on the page
                    </span>
                    .
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <LoadRomButton on_load_rom={on_load_rom} variant="default" />
                </EmptyContent>
              </Empty>
            )}
          </div>
        </div>

        {/* Landscape phone: A/B + start on the right */}
        <div className="hidden w-full max-w-36 flex-col items-center gap-5 justify-self-center touch:landscape-phone:flex">
          <ActionButtons className="w-full" />
          <PillButton button="start" label="start" />
        </div>

        {/* Portrait / tablet touch controls */}
        <div className="hidden w-full max-w-md grid-cols-[1fr_auto_1fr] items-center gap-4 touch:grid landscape-phone:hidden!">
          <DPad className="w-full max-w-36" />
          <StartSelect className="flex-col self-end" />
          <ActionButtons className="w-full max-w-36 justify-self-end" />
        </div>
      </div>

      <KeyboardHints keybinds={keybinds} />

      <Card size="sm" className={cn("w-fit", !show_debug && "hidden")}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bug className="size-4" />
            VRAM tiles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <canvas
            ref={debug_canvas_ref}
            className="block rounded-md bg-black [image-rendering:pixelated]"
          />
        </CardContent>
      </Card>
    </div>
  );
}
