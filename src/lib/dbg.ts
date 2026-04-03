import { bus_read, bus_write } from "@/lib/bus";

const DBG_MSG_SIZE = 1024;

const dbg_msg = new Uint8Array(DBG_MSG_SIZE);
let msg_size = 0;

export function dbg_update(): void {
    if (bus_read(0xff02) === 0x81) {
        const c = bus_read(0xff01);

        dbg_msg[msg_size++] = c;

        bus_write(0xff02, 0);
    }
}

export function dbg_print(): void {
    // empty - matching original
}
