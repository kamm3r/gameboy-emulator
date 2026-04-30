import { step_sweep } from "./pulse";
import { ctx } from "./state";

type LengthChannel = {
  enabled: boolean;
  length_enabled: boolean;
  length_counter: number;
};

type EnvelopeChannel = {
  enabled: boolean;
  dac_enabled: boolean;
  current_volume: number;
  envelope_period: number;
  envelope_add: boolean;
  envelope_timer: number;
};

function step_length(channel: LengthChannel): void {
  if (!channel.length_enabled || channel.length_counter === 0) {
    return;
  }

  channel.length_counter--;

  if (channel.length_counter === 0) {
    channel.enabled = false;
  }
}

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

function step_all_lengths(): void {
  step_length(ctx.ch1);
  step_length(ctx.ch2);
  step_length(ctx.ch3);
  step_length(ctx.ch4);
}

function step_all_envelopes(): void {
  step_envelope(ctx.ch1);
  step_envelope(ctx.ch2);
  step_envelope(ctx.ch4);
}

export function frame_sequencer_next_step_clocks_length(): boolean {
  const next_step = (ctx.frame_seq_step + 1) & 7;
  return (next_step & 1) === 0;
}

export function frame_sequencer_in_first_half_of_length_period(): boolean {
  return !frame_sequencer_next_step_clocks_length();
}

export function frame_sequencer_tick(): void {
  const step = (ctx.frame_seq_step + 1) & 7;
  ctx.frame_seq_step = step;

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