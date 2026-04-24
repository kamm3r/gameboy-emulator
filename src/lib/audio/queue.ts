import { ctx, type audio_sample_chunk } from "./state";

function queue_capacity(): number {
  return ctx.sample_queue_l.length;
}

function queue_reset(capacity: number): void {
  ctx.sample_queue_l = new Float32Array(capacity);
  ctx.sample_queue_r = new Float32Array(capacity);
  ctx.sample_queue_read = 0;
  ctx.sample_queue_write = 0;
  ctx.sample_queue_count = 0;
}

export function trim_audio_queue(): void {
  const capacity = Math.max(1, ctx.max_buffered_samples | 0);

  if (queue_capacity() !== capacity) {
    queue_reset(capacity);
    return;
  }

  while (ctx.sample_queue_count > ctx.max_buffered_samples) {
    ctx.sample_queue_read = (ctx.sample_queue_read + 1) % queue_capacity();
    ctx.sample_queue_count--;
  }
}

export function audio_push_sample(left: number, right: number): void {
  const capacity = queue_capacity();

  if (capacity <= 0) {
    return;
  }

  if (ctx.sample_queue_count >= capacity) {
    ctx.sample_queue_read = (ctx.sample_queue_read + 1) % capacity;
    ctx.sample_queue_count--;
  }

  ctx.sample_queue_l[ctx.sample_queue_write] = left;
  ctx.sample_queue_r[ctx.sample_queue_write] = right;
  ctx.sample_queue_write = (ctx.sample_queue_write + 1) % capacity;
  ctx.sample_queue_count++;
}

export function audio_get_queued_sample_count(): number {
  return ctx.sample_queue_count;
}

export function audio_consume_samples(
  max_samples?: number,
): audio_sample_chunk {
  const available = ctx.sample_queue_count;
  const count =
    max_samples === undefined
      ? available
      : Math.max(0, Math.min(available, max_samples | 0));

  const left = new Float32Array(count);
  const right = new Float32Array(count);
  const capacity = queue_capacity();

  for (let i = 0; i < count; i++) {
    const idx = (ctx.sample_queue_read + i) % capacity;
    left[i] = ctx.sample_queue_l[idx];
    right[i] = ctx.sample_queue_r[idx];
  }

  ctx.sample_queue_read = (ctx.sample_queue_read + count) % capacity;
  ctx.sample_queue_count -= count;

  return { left, right };
}

export function audio_clear_samples(): void {
  ctx.sample_queue_read = 0;
  ctx.sample_queue_write = 0;
  ctx.sample_queue_count = 0;
}