import { ctx } from "./state";
import { step_sweep } from "./pulse";

function step_length(channel: {
  enabled: boolean;
  length_enabled: boolean;
  length_counter: number;
}): void {
  if (!channel.enabled || !channel.length_enabled) {
    return;
  }

  if (channel.length_counter > 0) {
    channel.length_counter--;
    if (channel.length_counter === 0) {
      channel.enabled = false;
    }
  }
}

function step_envelope(channel: {
  enabled: boolean;
  dac_enabled: boolean;
  current_volume: number;
  envelope_period: number;
  envelope_add: boolean;
  envelope_timer: number;
}): void {
  if (!channel.enabled || !channel.dac_enabled) {
    return;
  }

  if (channel.envelope_period === 0) {
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

export function frame_sequencer_tick(): void {
  switch (ctx.frame_seq_step) {
    case 0:
    case 2:
    case 4:
    case 6:
      step_length(ctx.ch1);
      step_length(ctx.ch2);
      step_length(ctx.ch3);
      step_length(ctx.ch4);

      if (ctx.frame_seq_step === 2 || ctx.frame_seq_step === 6) {
        step_sweep();
      }
      break;

    case 7:
      step_envelope(ctx.ch1);
      step_envelope(ctx.ch2);
      step_envelope(ctx.ch4);
      break;
  }

  ctx.frame_seq_step = (ctx.frame_seq_step + 1) & 7;
}