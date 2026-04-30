export type length_counter = {
  enabled: boolean;
  counter: number;
  max: number;
};

export function length_load_64(counter: length_counter, value: number): void {
  counter.counter = 64 - (value & 0x3f);
}

export function length_load_256(counter: length_counter, value: number): void {
  counter.counter = 256 - value;
}

export function length_step(counter: {
  enabled: boolean;
  counter: number;
  channel_enabled: boolean;
}): void {
  if (!counter.enabled || counter.counter === 0) {
    return;
  }

  counter.counter--;

  if (counter.counter === 0) {
    counter.channel_enabled = false;
  }
}