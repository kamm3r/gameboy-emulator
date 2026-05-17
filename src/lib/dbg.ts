let message = "";

export function dbg_clear(): void {
  message = "";
}

export function dbg_write(char: number): void {
  if (char >= 0x20 && char <= 0x7e) {
    message += String.fromCharCode(char);
  }
}

export function dbg_get_message(): string {
  return message;
}

export function dbg_update(): void {
  // stub - serial output handled in bus
}

export function dbg_print(): void {
  // stub
}
