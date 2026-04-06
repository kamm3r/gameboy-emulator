import { emulation_run } from "./emu";

async function main(argc: number, argv: string[]): Promise<number> {
  return await emulation_run(argc, argv);
}

const filePath = process.argv;
await main(process.argv.length, filePath);
