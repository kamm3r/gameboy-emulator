export type mixer_state = {
  left_volume: number;
  right_volume: number;
  left_prev: number;
  right_prev: number;
};

export function mixer_init(): mixer_state {
  return {
    left_volume: 7,
    right_volume: 7,
    left_prev: 0,
    right_prev: 0,
  };
}

export function mixer_mix(
  m: mixer_state,
  ch1: number,
  ch2: number,
  ch3: number,
  ch4: number,
  nr51: number,
): [number, number] {
  let left = 0;
  let right = 0;

  if (nr51 & 0x10) left += ch1;
  if (nr51 & 0x20) left += ch2;
  if (nr51 & 0x40) left += ch3;
  if (nr51 & 0x80) left += ch4;

  if (nr51 & 0x01) right += ch1;
  if (nr51 & 0x02) right += ch2;
  if (nr51 & 0x04) right += ch3;
  if (nr51 & 0x08) right += ch4;

  left = left / 4;
  right = right / 4;

  left = left * (m.left_volume / 7);
  right = right * (m.right_volume / 7);

  const lpf = 0.999;
  m.left_prev = left + lpf * (m.left_prev - left);
  m.right_prev = right + lpf * (m.right_prev - right);

  return [m.left_prev, m.right_prev];
}

export function mixer_update_volumes(m: mixer_state, nr50: number): void {
  m.left_volume = (nr50 >> 4) & 0x07;
  m.right_volume = nr50 & 0x07;
}
