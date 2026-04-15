import { useSyncExternalStore as use_sync_external_store } from "react";
import {
  emu_get_context,
  emu_get_server_context,
  emu_subscribe,
} from "@/lib/emu";

export function useEmu() {
  return use_sync_external_store(
    emu_subscribe,
    emu_get_context,
    emu_get_server_context,
  );
}
