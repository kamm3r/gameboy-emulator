// frame-sequencer.ts

import { step_sweep } from "./pulse";
import { length_counter_step } from "./length-counter";
import { ctx } from "./state";

type EnvelopeChannel = {
  enabled: boolean;
  dac_enabled: boolean;
  current_volume: number;
  envelope_period: number;
  envelope_add: boolean;
  envelope_timer: number;
};

function step_envelope(channel: EnvelopeChannel): void {
  if (
    !channel.enabled ||
    !channel.dac_enabled ||
    channel.envelope_period === 0
  ) {
    return;
  }

  channel.envelope_timer--;

  if (channel.envelope_timer > 0) {
    return;
  }

  channel.envelope_timer = channel.envelope_period;

  if (channel.envelope_add) {
    if (channel.current_volume < 15) {
      channel.current_volume++;
    }
  } else if (channel.current_volume > 0) {
    channel.current_volume--;
  }
}

function step_channel_length(ch: {
  enabled: boolean;
  length: { enabled: boolean; counter: number };
}): void {
  if (length_counter_step(ch.length)) {
    ch.enabled = false;
  }
}

function step_all_lengths(): void {
  step_channel_length(ctx.ch1);
  step_channel_length(ctx.ch2);
  step_channel_length(ctx.ch3);
  step_channel_length(ctx.ch4);
}

function step_all_envelopes(): void {
  step_envelope(ctx.ch1);
  step_envelope(ctx.ch2);
  step_envelope(ctx.ch4);
}

export function frame_sequencer_tick(): void {
  const step = (ctx.frame_seq_step + 1) & 7;
  ctx.frame_seq_step = step;

  if (!ctx.enabled) {
    return;
  }

  switch (step) {
    case 0:
    case 4:
      step_all_lengths();
      return;
    case 2:
    case 6:
      step_all_lengths();
      step_sweep();
      return;
    case 7:
      step_all_envelopes();
      return;
    default:
      return;
  }
}