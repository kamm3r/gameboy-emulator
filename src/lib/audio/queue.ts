import { ctx, type audio_sample_chunk } from "./state";

export function trim_audio_queue(): void {
  if (ctx.sample_queue_l.length > ctx.max_buffered_samples) {
    ctx.sample_queue_l.splice(
      0,
      ctx.sample_queue_l.length - ctx.max_buffered_samples,
    );
  }

  if (ctx.sample_queue_r.length > ctx.max_buffered_samples) {
    ctx.sample_queue_r.splice(
      0,
      ctx.sample_queue_r.length - ctx.max_buffered_samples,
    );
  }
}

export function audio_get_queued_sample_count(): number {
  return Math.min(ctx.sample_queue_l.length, ctx.sample_queue_r.length);
}

export function audio_consume_samples(
  max_samples?: number,
): audio_sample_chunk {
  const available = audio_get_queued_sample_count();
  const count =
    max_samples === undefined
      ? available
      : Math.max(0, Math.min(available, max_samples | 0));

  const left = new Float32Array(count);
  const right = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    left[i] = ctx.sample_queue_l[i] ?? 0;
    right[i] = ctx.sample_queue_r[i] ?? 0;
  }

  if (count > 0) {
    ctx.sample_queue_l.splice(0, count);
    ctx.sample_queue_r.splice(0, count);
  }

  return { left, right };
}

export function audio_clear_samples(): void {
  ctx.sample_queue_l.length = 0;
  ctx.sample_queue_r.length = 0;
}