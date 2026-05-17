import { emu_init, emu_load_and_start } from "./emu";

async function main(argc: number, argv: string[]): Promise<number> {
  emu_init();

  if (argc > 1) {
    const filePath = argv[1];
    console.log(`Loading ROM: ${filePath}`);

    try {
      const response = await fetch(filePath);
      const data = new Uint8Array(await response.arrayBuffer());
      const success = emu_load_and_start(data, filePath);

      if (!success) {
        console.error("Failed to load ROM");
        return 1;
      }
    } catch (err) {
      console.error(`Error loading ROM: ${err}`);
      return 1;
    }
  }

  return 0;
}

if (typeof process !== "undefined" && process.argv) {
  main(process.argv.length, process.argv).catch(console.error);
}
