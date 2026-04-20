import { bus_read, bus_write } from "@/lib/bus";

const DBG_MSG_SIZE = 1024;

const dbg_msg = new Uint8Array(DBG_MSG_SIZE);
let msg_size = 0;

export function dbg_update(): void {
    if (bus_read(0xff02) === 0x81) {
        const c = bus_read(0xff01);

        if (msg_size < DBG_MSG_SIZE) {
          dbg_msg[msg_size++] = c;
        }

        bus_write(0xff02, 0);
    }
}

export function dbg_print(): void {
   if (dbg_msg[0]){
    console.log(`DBG: ${dbg_msg}\n`)
   }
}

export function dbg_get_message(): string {
  let out = "";
  for (let i = 0; i < msg_size; i++) {
    out += String.fromCharCode(dbg_msg[i]);
  }
  return out;
}

export function dbg_clear(): void {
  msg_size = 0;
}