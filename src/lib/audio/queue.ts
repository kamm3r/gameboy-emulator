const QUEUE_SIZE = 8192;
const buffer = new Float32Array(QUEUE_SIZE);
let write_pos = 0;
let read_pos = 0;

export function audio_queue_push(sample: Float32Array): void {
  for (let i = 0; i < sample.length; i++) {
    buffer[write_pos] = sample[i];
    write_pos = (write_pos + 1) & (QUEUE_SIZE - 1);

    if (write_pos === read_pos) {
      read_pos = (read_pos + 1) & (QUEUE_SIZE - 1);
    }
  }
}

export function audio_queue_read(output: Float32Array): number {
  let count = 0;

  while (count < output.length && read_pos !== write_pos) {
    output[count] = buffer[read_pos];
    read_pos = (read_pos + 1) & (QUEUE_SIZE - 1);
    count++;
  }

  return count;
}

export function audio_queue_size(): number {
  return (write_pos - read_pos) & (QUEUE_SIZE - 1);
}

export function audio_get_queued_sample_count(): number {
  return audio_queue_size();
}

export function audio_clear_samples(): void {
  read_pos = 0;
  write_pos = 0;
}

export function audio_consume_samples(count: number): { left: Float32Array; right: Float32Array } {
  const available = audio_queue_size();

  if (available <= 0) {
    return { left: new Float32Array(0), right: new Float32Array(0) };
  }

  const take = Math.min(count, available >> 1);
  const left = new Float32Array(take);
  const right = new Float32Array(take);

  for (let i = 0; i < take; i++) {
    left[i] = buffer[read_pos];
    read_pos = (read_pos + 1) & (QUEUE_SIZE - 1);
    right[i] = buffer[read_pos];
    read_pos = (read_pos + 1) & (QUEUE_SIZE - 1);
  }

  return { left, right };
}
