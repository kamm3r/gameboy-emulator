export function length_clock(length: number, length_enable: boolean): number {
  if (!length_enable || length === 0) {
    return length;
  }

  const new_length = length - 1;

  if (new_length === 0) {
    return 0;
  }

  return new_length;
}
