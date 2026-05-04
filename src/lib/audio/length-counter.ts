export type length_counter_state = {
  enabled: boolean;
  counter: number;
};

export function length_counter_step(
  lc: length_counter_state,
): boolean {
  if (!lc.enabled || lc.counter === 0) {
    return false;
  }

  lc.counter--;

  return lc.counter === 0;
}

/**
 * Handle NRx4 write with all obscure timing edge cases.
 * Returns the new channel-enabled state.
 */
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
  // "first half" = the next frame sequencer step will NOT clock length
  // i.e., the current position is in the first half of the length period
  const first_half = !next_step_clocks_length;

  // Extra clock: enabling length enable in first half with non-zero counter
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

  // If counter is zero, reload with max
  if (lc.counter === 0) {
    lc.counter = max_length;

    // If length is now enabled and we're in first half,
    // the freshly loaded counter gets decremented
    if (new_length_enabled && first_half) {
      lc.counter--;
    }
  }

  // Execute trigger
  channel_enabled = on_trigger();

  return channel_enabled;
}