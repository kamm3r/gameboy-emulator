import { emulation_run } from "./emu";

function main(argc: number, argv: string[]): number {
  return emulation_run(argc, argv);
}

const filePath = process.argv;
main(process.argv.length, filePath);
