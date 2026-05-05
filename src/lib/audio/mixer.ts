import { noise_output } from "./noise";
import { pulse_output } from "./pulse";
import { audio_push_sample } from "./queue";
import { ctx } from "./state";
import { wave_output } from "./wave";

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

function clamp(v: number): number {
  return v > 1 ? 1 : v < -1 ? -1 : v;
}

export function mix_and_push_sample(): void {
  if (!ctx.enabled) {
    audio_push_sample(0, 0);
    return;
  }

  const c1 = pulse_output(ctx.ch1);
  const c2 = pulse_output(ctx.ch2);
  const c3 = wave_output();
  const c4 = noise_output();

  const nr51 = ctx.nr51;

  let left = 0;
  let right = 0;

  if ((nr51 & 0x10) !== 0) {
    left += c1;
  }
  if ((nr51 & 0x20) !== 0) {
    left += c2;
  }
  if ((nr51 & 0x40) !== 0) {
    left += c3;
  }
  if ((nr51 & 0x80) !== 0) {
    left += c4;
  }

  if ((nr51 & 0x01) !== 0) {
    right += c1;
  }
  if ((nr51 & 0x02) !== 0) {
    right += c2;
  }
  if ((nr51 & 0x04) !== 0) {
    right += c3;
  }
  if ((nr51 & 0x08) !== 0) {
    right += c4;
  }

  const lv = (((ctx.nr50 >> 4) & 7) + 1) / 8;
  const rv = ((ctx.nr50 & 7) + 1) / 8;

  left *= lv * 0.25;
  right *= rv * 0.25;

  left = high_pass_left(left);
  right = high_pass_right(right);

  audio_push_sample(clamp(left), clamp(right));
}