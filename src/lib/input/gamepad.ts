export type gamepad_state = {
  a: boolean;
  b: boolean;
  start: boolean;
  select: boolean;
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
};

export type gamepad_button = keyof gamepad_state;

const pad: gamepad_state = {
  a: false,
  b: false,
  start: false,
  select: false,
  up: false,
  down: false,
  left: false,
  right: false,
};

let sel_dpad = true;
let sel_buttons = true;

export function gamepad_set_sel(value: number): void {
  sel_dpad = (value & 0x10) === 0;
  sel_buttons = (value & 0x20) === 0;
}

export function gamepad_get_output(): number {
  let result = 0xcf;

  if (sel_dpad) {
    if (pad.right) result &= ~0x01;
    if (pad.left) result &= ~0x02;
    if (pad.up) result &= ~0x04;
    if (pad.down) result &= ~0x08;
  }

  if (sel_buttons) {
    if (pad.a) result &= ~0x01;
    if (pad.b) result &= ~0x02;
    if (pad.select) result &= ~0x04;
    if (pad.start) result &= ~0x08;
  }

  return result;
}

export function gamepad_get_state(): gamepad_state {
  return pad;
}

export function gamepad_set_button(button: gamepad_button, pressed: boolean): void {
  pad[button] = pressed;
}
