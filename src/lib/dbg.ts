import { bus_read, bus_write } from "@/lib/bus";

const DBG_MSG_SIZE = 4096;

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
    // empty - matching original
}

export function dbg_get_messages(): string {
    let result = "";
    for (let i = 0; i < msg_size; i++) {
        if (dbg_msg[i] === 0x00) break;
        result += String.fromCharCode(dbg_msg[i]);
    }
    return result;
}

export function dbg_clear(): void {
    msg_size = 0;
}
