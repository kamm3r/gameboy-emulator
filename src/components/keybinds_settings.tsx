import { useEffect, useState } from "react";
import { Keyboard, RotateCcw } from "lucide-react";
import type { gamepad_button } from "@/lib/input/gamepad";
import {
  GAMEPAD_BUTTONS,
  format_key_code,
  get_keys_for_button,
  reset_keybinds,
  set_keybind_for_button,
} from "@/lib/input/keybinds";
import type { keybind_map } from "@/lib/input/keybinds";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type KeybindSettingsProps = {
  keybinds: keybind_map;
  onChange: (keybinds: keybind_map) => void;
};

export function KeybindSettings({ keybinds, onChange }: KeybindSettingsProps) {
  const [listening_for, set_listening_for] = useState<gamepad_button | "">("");

  useEffect(() => {
    if (!listening_for) return;

    function on_key_down(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();

      if (e.code === "Escape" || !listening_for) {
        set_listening_for("");
        return;
      }

      const next = set_keybind_for_button(keybinds, listening_for, e.code);

      onChange(next);
      set_listening_for("");
    }

    window.addEventListener("keydown", on_key_down, { capture: true });

    return () => {
      window.removeEventListener("keydown", on_key_down, { capture: true });
    };
  }, [keybinds, listening_for, onChange]);

  function reset() {
    const next = reset_keybinds();
    onChange(next);
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) set_listening_for("");
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="secondary" size="sm">
          <Keyboard data-icon="inline-start" />
          controls
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard controls</DialogTitle>
          <DialogDescription>
            Click a binding, then press a key to replace it. Press escape to
            cancel.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {GAMEPAD_BUTTONS.map(({ button, label }) => {
            const key_codes = get_keys_for_button(keybinds, button);
            const is_listening = listening_for === button;

            return (
              <div
                key={button}
                className="flex items-center justify-between gap-4 rounded-md border bg-muted/50 px-3 py-2"
              >
                <div className="font-mono text-sm text-muted-foreground">{label}</div>

                <Button
                  type="button"
                  variant={is_listening ? "outline" : "secondary"}
                  size="sm"
                  className="min-w-28 justify-center font-mono"
                  onClick={() => set_listening_for(button)}
                >
                  {is_listening
                    ? "press key..."
                    : key_codes.length > 0
                      ? key_codes.map(format_key_code).join(" / ")
                      : format_key_code(null)}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={reset}>
            <RotateCcw data-icon="inline-start" />
            reset defaults
          </Button>

          <DialogClose asChild>
            <Button type="button" variant="secondary" size="sm">
              done
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
