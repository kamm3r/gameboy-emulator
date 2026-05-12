import { useEffect, useState } from "react";
import { gamepad_set_button } from "@/lib/input/gamepad";
import { keybind_map, load_keybinds, save_keybinds } from "@/lib/input/keybinds";

export function useKeybinds() {
  const [keybinds, set_keybinds_state] = useState<keybind_map>(() =>
    load_keybinds(),
  );

  function set_keybinds(next: keybind_map): void {
    save_keybinds(next);
    set_keybinds_state(next);
  }

  useEffect(() => {
    function on_key_down(e: KeyboardEvent) {
      const button = keybinds[e.code];

      if (!button) {
        return;
      }

      e.preventDefault();
      gamepad_set_button(button, true);
    }

    function on_key_up(e: KeyboardEvent) {
      const button = keybinds[e.code];

      if (!button) {
        return;
      }

      e.preventDefault();
      gamepad_set_button(button, false);
    }

    window.addEventListener("keydown", on_key_down);
    window.addEventListener("keyup", on_key_up);

    return () => {
      window.removeEventListener("keydown", on_key_down);
      window.removeEventListener("keyup", on_key_up);
    };
  }, [keybinds]);

  return {
    keybinds,
    set_keybinds,
  };
}
