import { emulation_run } from "./emulation";

function main(argc: number, argv: string[]): number {
  return emulation_run(argc, argv);
}

const filePath = process.argv;
main(process.argv.length, filePath);
