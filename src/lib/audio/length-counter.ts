export type length_counter_state = {
  enabled: boolean;
  counter: number;
};

export function length_counter_step(lc: length_counter_state): boolean {
  if (!lc.enabled || lc.counter === 0) {
    return false;
  }

  lc.counter--;

  return lc.counter === 0;
}

export function length_counter_handle_nrx4(
  lc: length_counter_state,
  channel_enabled: boolean,
  old_length_enabled: boolean,
  new_length_enabled: boolean,
  trigger: boolean,
  max_length: number,
  next_step_clocks_length: boolean,
  on_trigger: () => boolean,
): boolean {
  const first_half = !next_step_clocks_length;

  if (
    !old_length_enabled &&
    new_length_enabled &&
    first_half &&
    lc.counter > 0
  ) {
    lc.counter--;

    if (lc.counter === 0 && !trigger) {
      channel_enabled = false;
    }
  }

  lc.enabled = new_length_enabled;

  if (!trigger) {
    return channel_enabled;
  }

  if (lc.counter === 0) {
    lc.counter = max_length;

    if (new_length_enabled && first_half) {
      lc.counter--;
    }
  }

  return on_trigger();
}