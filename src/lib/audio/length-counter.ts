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
 * next_step_clocks_length: true if the NEXT frame sequencer step
 * will clock the length counter (i.e., next step is even: 0,2,4,6).
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
  // "first half" = the next step will NOT clock length.
  // This means we are in a position where the extra clock applies
  // when length enable goes from 0 to 1.
  //
  // Actually the correct definition used by blargg tests:
  // The extra clock happens when the current frame sequencer position
  // is such that the length counter was NOT JUST clocked but WILL be
  // clocked next. The standard convention is:
  //   extra_clock_applies = next step IS a length step
  const extra_clock = next_step_clocks_length;

  // Extra clock: enabling length when next step clocks length,
  // with non-zero counter
  if (
    !old_length_enabled &&
    new_length_enabled &&
    extra_clock &&
    lc.counter > 0
  ) {
    lc.counter--;
    if (lc.counter === 0 && !trigger) {
      channel_enabled = false;
    }
  }

  lc.enabled = new_length_enabled;

  if (trigger) {
    if (lc.counter === 0) {
      lc.counter = max_length;
      if (new_length_enabled && extra_clock) {
        lc.counter--;
      }
    }

    channel_enabled = on_trigger();
  }

  return channel_enabled;
}