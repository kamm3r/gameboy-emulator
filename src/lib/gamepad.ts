export type gamepad_state = {
  a: boolean;
  b: boolean;
  select: boolean;
  start: boolean;
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
};

export type KeyBindings = {
  up: string;
  down: string;
  left: string;
  right: string;
  a: string;
  b: string;
  start: string;
  select: string;
};

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
  a: "KeyX",
  b: "KeyZ",
  start: "Enter",
  select: "Tab",
};

type gamepad_context = {
  button_sel: boolean;
  dir_sel: boolean;
  controller: gamepad_state;
  keyBindings: KeyBindings;
  pressedKeys: Set<string>;
  initialized: boolean;
};

const createControllerState = (): gamepad_state => ({
  a: false,
  b: false,
  select: false,
  start: false,
  up: false,
  down: false,
  left: false,
  right: false,
});

const ctx: gamepad_context = {
  button_sel: false,
  dir_sel: false,
  controller: createControllerState(),
  keyBindings: { ...DEFAULT_KEY_BINDINGS },
  pressedKeys: new Set(),
  initialized: false,
};

function setButtonState(code: string, pressed: boolean): void {
  if (code === ctx.keyBindings.up) ctx.controller.up = pressed;
  if (code === ctx.keyBindings.down) ctx.controller.down = pressed;
  if (code === ctx.keyBindings.left) ctx.controller.left = pressed;
  if (code === ctx.keyBindings.right) ctx.controller.right = pressed;
  if (code === ctx.keyBindings.a) ctx.controller.a = pressed;
  if (code === ctx.keyBindings.b) ctx.controller.b = pressed;
  if (code === ctx.keyBindings.start) ctx.controller.start = pressed;
  if (code === ctx.keyBindings.select) ctx.controller.select = pressed;
}

function isControlledKey(code: string): boolean {
  const bindings = Object.values(ctx.keyBindings);
  return bindings.includes(code);
}

function handle_key_down(code: string): void {
  ctx.pressedKeys.add(code);
  setButtonState(code, true);
}

function handle_key_up(code: string): void {
  ctx.pressedKeys.delete(code);
  setButtonState(code, false);
}

function onKeyDown(e: KeyboardEvent): void {
  if (isControlledKey(e.code)) {
    e.preventDefault();
  }

  handle_key_down(e.code);
}

function onKeyUp(e: KeyboardEvent): void {
  if (isControlledKey(e.code)) {
    e.preventDefault();
  }

  handle_key_up(e.code);
}

export function gamepad_init(): void {
  if (ctx.initialized) {
    return;
  }

  if (typeof window !== "undefined") {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
  }

  ctx.initialized = true;
}

export function gamepad_shutdown(): void {
  if (!ctx.initialized) {
    return;
  }

  if (typeof window !== "undefined") {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
  }

  ctx.initialized = false;
  ctx.pressedKeys.clear();
  gamepad_reset_state();
}

export function gamepad_reset_state(): void {
  ctx.controller = createControllerState();
}

export function gamepad_set_keybindings(bindings: KeyBindings): void {
  ctx.keyBindings = { ...bindings };
}

export function gamepad_get_keybindings(): KeyBindings {
  return { ...ctx.keyBindings };
}

export function gamepad_button_sel(): boolean {
  return ctx.button_sel;
}

export function gamepad_dir_sel(): boolean {
  return ctx.dir_sel;
}

export function gamepad_set_sel(value: number): void {
  ctx.button_sel = (value & 0x20) !== 0;
  ctx.dir_sel = (value & 0x10) !== 0;
}

export function gamepad_get_state(): gamepad_state {
  return ctx.controller;
}

export function gamepad_set_button(
  button: keyof gamepad_state,
  pressed: boolean,
): void {
  ctx.controller[button] = pressed;
}

export function gamepad_get_output(): number {
  let output = 0xcf;

  if (!gamepad_button_sel()) {
    if (gamepad_get_state().start) {
      output &= ~(1 << 3);
    }
    if (gamepad_get_state().select) {
      output &= ~(1 << 2);
    }
    if (gamepad_get_state().a) {
      output &= ~(1 << 0);
    }
    if (gamepad_get_state().b) {
      output &= ~(1 << 1);
    }
  }

  if (!gamepad_dir_sel()) {
    if (gamepad_get_state().left) {
      output &= ~(1 << 1);
    }
    if (gamepad_get_state().right) {
      output &= ~(1 << 0);
    }
    if (gamepad_get_state().up) {
      output &= ~(1 << 2);
    }
    if (gamepad_get_state().down) {
      output &= ~(1 << 3);
    }
  }

  return output;
}