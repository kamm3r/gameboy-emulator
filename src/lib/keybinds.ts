import type { gamepad_button } from "@/lib/gamepad";

export type keybind_map = Record<string, gamepad_button>;

export type keybind_entry = {
  button: gamepad_button;
  label: string;
};

export const KEYBIND_STORAGE_KEY = "gameboy_keybinds_v1";

export const GAMEPAD_BUTTONS: keybind_entry[] = [
  {
    button: "up",
    label: "d-pad up",
  },
  {
    button: "down",
    label: "d-pad down",
  },
  {
    button: "left",
    label: "d-pad left",
  },
  {
    button: "right",
    label: "d-pad right",
  },
  {
    button: "a",
    label: "a",
  },
  {
    button: "b",
    label: "b",
  },
  {
    button: "start",
    label: "start",
  },
  {
    button: "select",
    label: "select",
  },
];

export const DEFAULT_KEYBINDS: keybind_map = {
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

export function load_keybinds(): keybind_map {
  if (typeof window === "undefined") {
    return DEFAULT_KEYBINDS;
  }

  const raw = window.localStorage.getItem(KEYBIND_STORAGE_KEY);

  if (!raw) {
    return DEFAULT_KEYBINDS;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== "object") {
      return DEFAULT_KEYBINDS;
    }

    return {
      ...DEFAULT_KEYBINDS,
      ...(parsed as keybind_map),
    };
  } catch {
    return DEFAULT_KEYBINDS;
  }
}

export function save_keybinds(keybinds: keybind_map): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(KEYBIND_STORAGE_KEY, JSON.stringify(keybinds));
}

export function reset_keybinds(): keybind_map {
  save_keybinds(DEFAULT_KEYBINDS);
  return DEFAULT_KEYBINDS;
}

export function get_key_for_button(
  keybinds: keybind_map,
  button: gamepad_button,
): string | null {
  for (const [code, mapped_button] of Object.entries(keybinds)) {
    if (mapped_button === button) {
      return code;
    }
  }

  return null;
}

export function set_keybind_for_button(
  keybinds: keybind_map,
  button: gamepad_button,
  code: string,
): keybind_map {
  const next: keybind_map = {};

  for (const [existing_code, existing_button] of Object.entries(keybinds)) {
    const is_same_button = existing_button === button;
    const is_same_key = existing_code === code;

    if (!is_same_button && !is_same_key) {
      next[existing_code] = existing_button;
    }
  }

  next[code] = button;

  return next;
}

export function format_key_code(code: string | null): string {
  if (!code) {
    return "unbound";
  }

  if (code.startsWith("Key")) {
    return code.replace("Key", "").toLowerCase();
  }

  if (code.startsWith("Digit")) {
    return code.replace("Digit", "");
  }

  if (code === "ArrowUp") {
    return "↑";
  }

  if (code === "ArrowDown") {
    return "↓";
  }

  if (code === "ArrowLeft") {
    return "←";
  }

  if (code === "ArrowRight") {
    return "→";
  }

  if (code === "ShiftLeft") {
    return "left shift";
  }

  if (code === "ShiftRight") {
    return "right shift";
  }

  if (code === "Enter") {
    return "enter";
  }

  if (code === "Space") {
    return "space";
  }

  if (code === "Escape") {
    return "esc";
  }

  if (code === "Backspace") {
    return "backspace";
  }

  if (code === "Tab") {
    return "tab";
  }

  return code.toLowerCase();
}
