import { ctx, type audio_sample_chunk } from "./state";

function next_power_of_two(v: number): number {
  v--;
  v |= v >> 1;
  v |= v >> 2;
  v |= v >> 4;
  v |= v >> 8;
  v |= v >> 16;
  v++;
  return v;
}

function queue_capacity(): number {
  return ctx.sample_queue_l.length;
}

function queue_reset(capacity: number): void {
  const aligned = next_power_of_two(Math.max(1, capacity | 0));
  ctx.sample_queue_l = new Float32Array(aligned);
  ctx.sample_queue_r = new Float32Array(aligned);
  ctx.sample_queue_read = 0;
  ctx.sample_queue_write = 0;
  ctx.sample_queue_count = 0;
}

export function trim_audio_queue(): void {
  const raw_capacity = Math.max(1, ctx.max_buffered_samples | 0);
  const aligned_capacity = next_power_of_two(raw_capacity);
  const current_capacity = queue_capacity();

  if (current_capacity !== aligned_capacity) {
    queue_reset(raw_capacity);
    return;
  }

  while (ctx.sample_queue_count > aligned_capacity) {
    ctx.sample_queue_read = (ctx.sample_queue_read + 1) & (aligned_capacity - 1);
    ctx.sample_queue_count--;
  }
}

export function audio_push_sample(left: number, right: number): void {
  const capacity = queue_capacity();

  if (capacity <= 0) {
    return;
  }

  if (ctx.sample_queue_count >= capacity) {
    ctx.sample_queue_read = (ctx.sample_queue_read + 1) & (capacity - 1);
    ctx.sample_queue_count--;
  }

  ctx.sample_queue_l[ctx.sample_queue_write] = left;
  ctx.sample_queue_r[ctx.sample_queue_write] = right;
  ctx.sample_queue_write = (ctx.sample_queue_write + 1) & (capacity - 1);
  ctx.sample_queue_count++;
}

export function audio_get_queued_sample_count(): number {
  return ctx.sample_queue_count;
}

export function audio_consume_samples(max_samples?: number): audio_sample_chunk {
  const available = ctx.sample_queue_count;
  const count =
    max_samples === undefined
      ? available
      : Math.max(0, Math.min(available, max_samples | 0));

  const left = new Float32Array(count);
  const right = new Float32Array(count);
  const capacity = queue_capacity();

  if (capacity <= 0) {
    return { left, right };
  }

  const mask = capacity - 1;
  for (let i = 0; i < count; i++) {
    const idx = (ctx.sample_queue_read + i) & mask;
    left[i] = ctx.sample_queue_l[idx];
    right[i] = ctx.sample_queue_r[idx];
  }

  ctx.sample_queue_read = (ctx.sample_queue_read + count) & mask;
  ctx.sample_queue_count -= count;

  return { left, right };
}

export function audio_clear_samples(): void {
  ctx.sample_queue_read = 0;
  ctx.sample_queue_write = 0;
  ctx.sample_queue_count = 0;
}