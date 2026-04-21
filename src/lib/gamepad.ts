export type gamepad_state = {
  start: boolean;
  select: boolean;
  a: boolean;
  b: boolean;
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
};

export type gamepad_button = keyof gamepad_state;

type gamepad_context = {
  button_sel: boolean;
  dir_sel: boolean;
  controller: gamepad_state;
};

const ctx: gamepad_context = {
  button_sel: false,
  dir_sel: false,
  controller: {
    start: false,
    select: false,
    a: false,
    b: false,
    up: false,
    down: false,
    left: false,
    right: false,
  },
};

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

export function gamepad_set_button(button: gamepad_button, pressed: boolean) {
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