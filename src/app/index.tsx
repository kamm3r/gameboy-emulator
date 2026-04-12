import { EmulatorView } from "@/components/emulator_view";
import { emu_init, emu_load_rom, emu_start } from "@/lib/emu";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const [rom_name, set_rom_name] = useState("");

  async function on_file_change(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

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
    <div className="emulator-container">
      <header className="emulator-header">
        <h1>Game Boy Emulator</h1>

        <input
          type="file"
          accept=".gb,.gbc"
          onChange={on_file_change}
        />

        <div style={{ marginTop: 8 }}>
          {rom_name || "No ROM selected"}
        </div>
      </header>

      <main style={{ marginTop: 16 }}>
        <EmulatorView rom_name={rom_name} />
      </main>
    </div>
  );
}