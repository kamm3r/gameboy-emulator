import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { EmulatorView } from "@/components/emulator_view";
import { emu_init, emu_load_rom, emu_start } from "@/lib/emu";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const [rom_name, set_rom_name] = useState("");

  async function on_file_change(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const rom_data = new Uint8Array(buffer);

    emu_init();

    const ok = emu_load_rom(rom_data, file.name);
    if (!ok) {
      console.error("failed to load rom");
      set_rom_name("");
      return;
    }

    set_rom_name(file.name);
    emu_start();
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8 flex items-baseline justify-between gap-4">
          <h1 className="text-xl font-medium">gameboy</h1>
          <label className="cursor-pointer text-sm text-zinc-400 hover:text-zinc-100">
            load rom
            <input
              type="file"
              accept=".gb,.gbc"
              className="hidden"
              onChange={on_file_change}
            />
          </label>
        </div>

        <EmulatorView rom_name={rom_name} />
      </div>
    </div>
  );
}