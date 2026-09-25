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

const controller: gamepad_state = {
  start: false,
  select: false,
  a: false,
  b: false,
  up: false,
  down: false,
  left: false,
  right: false,
};

let button_sel = false;
let dir_sel = false;

// P1 bit for each button within its group (action: bit 5 low, direction: bit 4 low)
const ACTION_BITS: [gamepad_button, number][] = [
  ["a", 0], ["b", 1], ["select", 2], ["start", 3],
];
const DIRECTION_BITS: [gamepad_button, number][] = [
  ["right", 0], ["left", 1], ["up", 2], ["down", 3],
];

export function gamepad_set_sel(value: number): void {
  button_sel = (value & 0x20) !== 0;
  dir_sel = (value & 0x10) !== 0;
}

export function gamepad_set_button(button: gamepad_button, pressed: boolean) {
  controller[button] = pressed;
}

// Pressed buttons read as 0 in the selected group(s)
export function gamepad_get_output(): number {
  let output = 0xcf;

  for (const [button, bit] of button_sel ? [] : ACTION_BITS) {
    if (controller[button]) output &= ~(1 << bit);
  }

  for (const [button, bit] of dir_sel ? [] : DIRECTION_BITS) {
    if (controller[button]) output &= ~(1 << bit);
  }

  return output;
}
