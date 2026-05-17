import { gamepad_button } from "./gamepad";

export const GAMEPAD_BUTTONS: { button: gamepad_button; label: string }[] = [
  { button: "up", label: "Up" },
  { button: "down", label: "Down" },
  { button: "left", label: "Left" },
  { button: "right", label: "Right" },
  { button: "a", label: "A" },
  { button: "b", label: "B" },
  { button: "start", label: "Start" },
  { button: "select", label: "Select" },
];

export const DEFAULT_KEYBINDS: Record<string, gamepad_button> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyZ: "b",
  KeyX: "a",
  Enter: "start",
  Tab: "select",
};

export type keybind_map = Record<string, gamepad_button>;

function createDefaultMap(): keybind_map {
  return { ...DEFAULT_KEYBINDS };
}

export function load_keybinds(): keybind_map {
  try {
    const stored = localStorage.getItem("gbe-keybinds");
    if (stored) {
      return JSON.parse(stored) as keybind_map;
    }
  } catch {
    // ignore
  }
  return createDefaultMap();
}

export function save_keybinds(keybinds: keybind_map): void {
  try {
    localStorage.setItem("gbe-keybinds", JSON.stringify(keybinds));
  } catch {
    // ignore
  }
}

export function reset_keybinds(): keybind_map {
  const next = createDefaultMap();
  save_keybinds(next);
  return next;
}

export function set_keybind_for_button(
  keybinds: keybind_map,
  button: gamepad_button,
  key: string,
): keybind_map {
  const next: keybind_map = { ...keybinds };

  for (const [k, v] of Object.entries(next)) {
    if (v === button) {
      delete next[k];
    }
  }

  next[key] = button;
  return next;
}

export function get_key_for_button(
  keybinds: Record<string, gamepad_button>,
  button: gamepad_button,
): string {
  for (const [key, btn] of Object.entries(keybinds)) {
    if (btn === button) return key;
  }
  return "?";
}

export function format_key_code(code: string): string {
  return code.replace(/^Key/, "").replace(/^Digit/, "");
}
