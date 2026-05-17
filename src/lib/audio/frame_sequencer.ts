export type frame_sequencer_state = {
  step: number;
  counter: number;
};

export function fs_init(): frame_sequencer_state {
  return { step: 0, counter: 0 };
}

export function fs_tick(fs: frame_sequencer_state): number {
  fs.counter++;

  if (fs.counter < 2) {
    return -1;
  }

  fs.counter = 0;
  const step = fs.step;
  fs.step = (fs.step + 1) & 7;
  return step;
}
