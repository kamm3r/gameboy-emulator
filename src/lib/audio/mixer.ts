import { BIT } from "@/lib/common";
import { noise_output } from "./noise";
import { pulse_output } from "./pulse";
import { trim_audio_queue } from "./queue";
import { ctx } from "./state";
import { wave_output } from "./wave";

function clamp_sample(v: number): number {
  if (v > 1) {
    return 1;
  }

  if (v < -1) {
    return -1;
  }

  return v;
}

function high_pass_left(input: number): number {
  const output = input - ctx.hpf_cap_l;
  ctx.hpf_cap_l = input - output * 0.996;
  return output;
}

function high_pass_right(input: number): number {
  const output = input - ctx.hpf_cap_r;
  ctx.hpf_cap_r = input - output * 0.996;
  return output;
}

export function mix_and_push_sample(): void {
  if (!ctx.enabled) {
    ctx.sample_queue_l.push(0);
    ctx.sample_queue_r.push(0);
    trim_audio_queue();
    return;
  }

  const ch1 = pulse_output(ctx.ch1);
  const ch2 = pulse_output(ctx.ch2);
  const ch3 = wave_output();
  const ch4 = noise_output();

  let left = 0;
  let right = 0;

  if (BIT(ctx.nr51, 4)) {
    left += ch1;
  }
  if (BIT(ctx.nr51, 5)) {
    left += ch2;
  }
  if (BIT(ctx.nr51, 6)) {
    left += ch3;
  }
  if (BIT(ctx.nr51, 7)) {
    left += ch4;
  }

  if (BIT(ctx.nr51, 0)) {
    right += ch1;
  }
  if (BIT(ctx.nr51, 1)) {
    right += ch2;
  }
  if (BIT(ctx.nr51, 2)) {
    right += ch3;
  }
  if (BIT(ctx.nr51, 3)) {
    right += ch4;
  }

  const left_volume = ((ctx.nr50 >> 4) & 0x07) / 7;
  const right_volume = (ctx.nr50 & 0x07) / 7;

  left *= left_volume * 0.25;
  right *= right_volume * 0.25;

  left = high_pass_left(left);
  right = high_pass_right(right);

  ctx.sample_queue_l.push(clamp_sample(left));
  ctx.sample_queue_r.push(clamp_sample(right));

  trim_audio_queue();
}