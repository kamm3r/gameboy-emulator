import { length_counter_step } from "./length-counter";
import { step_sweep } from "./pulse";
import { ctx, type envelope, type length_counter } from "./state";

function step_length(lc: length_counter, ch: { enabled: boolean }): void {
  if (length_counter_step(lc)) {
    ch.enabled = false;
  }
}

function step_envelope(
  env: envelope,
  enabled: boolean,
  dac_enabled: boolean,
): void {
  if (!enabled || !dac_enabled) {
    return;
  }

  env.timer--;

  if (env.timer > 0) {
    return;
  }

  env.timer = env.period === 0 ? 8 : env.period;

  if (env.period === 0) {
    return;
  }

  if (env.add_mode) {
    if (env.current_volume < 15) {
      env.current_volume++;
    }
  } else if (env.current_volume > 0) {
    env.current_volume--;
  }
}

function step_all_lengths(): void {
  step_length(ctx.ch1.length, ctx.ch1);
  step_length(ctx.ch2.length, ctx.ch2);
  step_length(ctx.ch3.length, ctx.ch3);
  step_length(ctx.ch4.length, ctx.ch4);
}

function step_all_envelopes(): void {
  step_envelope(ctx.ch1.env, ctx.ch1.enabled, ctx.ch1.dac_enabled);
  step_envelope(ctx.ch2.env, ctx.ch2.enabled, ctx.ch2.dac_enabled);
  step_envelope(ctx.ch4.env, ctx.ch4.enabled, ctx.ch4.dac_enabled);
}

export function frame_sequencer_tick(): void {
  ctx.frame_seq_step = (ctx.frame_seq_step + 1) & 7;

  switch (ctx.frame_seq_step) {
    case 0:
    case 4:
      step_all_lengths();
      break;

    case 2:
    case 6:
      step_all_lengths();
      step_sweep();
      break;

    case 7:
      step_all_envelopes();
      break;
  }
}
