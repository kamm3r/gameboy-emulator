import { EmulatorView } from "@/components/emulator_view";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const [romData, setRomData] = useState<Uint8Array | null>(null);
  const [romName, setRomName] = useState("");

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    setRomData(new Uint8Array(buffer));
    setRomName(file.name);
  }

  return (
    <div className="emulator-container">
      <header className="emulator-header">
        <h1>Game Boy Emulator</h1>

        <input
          type="file"
          accept=".gb,.gbc"
          onChange={onFileChange}
        />

        <div style={{ marginTop: 8 }}>
          {romName || "No ROM selected"}
        </div>
      </header>

      <main style={{ marginTop: 16 }}>
        <EmulatorView romData={romData} romName={romName} />
      </main>
    </div>
  );
}