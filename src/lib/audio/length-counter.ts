// length-counter.ts

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
 * Handle NRx4 write. Returns the new channel-enabled state.
 *
 * The `on_trigger` callback must perform all trigger actions EXCEPT
 * length reload (which this function handles). It must return the
 * channel enabled state after trigger.
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
  // We are in the "first half" if the next step does NOT clock length.
  // Steps 0,2,4,6 clock length. So if the next step is odd, we're in
  // second half. If the next step is even, we're in first half... wait.
  //
  // Actually: "first half" means the CURRENT frame sequencer position
  // is such that the NEXT length clock hasn't happened yet.
  // Length is clocked on steps 0,2,4,6.
  // If we are at step 7 (next=0, which clocks length), we are NOT in
  // first half. "first half" = next step does NOT clock length.
  const first_half = !next_step_clocks_length;

  // Extra clock when enabling length counter in first half
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

  if (trigger) {
    // Reload length if it's zero
    if (lc.counter === 0) {
      lc.counter = max_length;

      // Extra clock: if enabling length in first half, decrement
      // the freshly loaded max length
      if (new_length_enabled && first_half) {
        lc.counter--;
      }
    }

    // Execute trigger callback
    channel_enabled = on_trigger();
  }

  return channel_enabled;
}