import { NO_IMPL, stringCopyLimit } from "@/lib/common";
import fs from "node:fs";

type rom_header = {
  entry: number;
  logo: number;

  title: string;
  new_lic_code: number;
  sgb_flag: number;
  type: number;
  rom_size: number;
  ram_size: number;
  dest_code: number;
  lic_code: number;
  version: number;
  checksum: number;
  global_checksum: number;
};

type cartridge_context = {
  filename: string;
  rom_size: number;
  rom_data: Buffer;
  header: rom_header;
};

const ctx: Partial<cartridge_context> = {};

const ROM_TYPES: string[] = [
  "ROM ONLY",
  "MBC1",
  "MBC1+RAM",
  "MBC1+RAM+BATTERY",
  "0x04 ???",
  "MBC2",
  "MBC2+BATTERY",
  "0x07 ???",
  "ROM+RAM 1",
  "ROM+RAM+BATTERY 1",
  "0x0A ???",
  "MMM01",
  "MMM01+RAM",
  "MMM01+RAM+BATTERY",
  "0x0E ???",
  "MBC3+TIMER+BATTERY",
  "MBC3+TIMER+RAM+BATTERY 2",
  "MBC3",
  "MBC3+RAM 2",
  "MBC3+RAM+BATTERY 2",
  "0x14 ???",
  "0x15 ???",
  "0x16 ???",
  "0x17 ???",
  "0x18 ???",
  "MBC5",
  "MBC5+RAM",
  "MBC5+RAM+BATTERY",
  "MBC5+RUMBLE",
  "MBC5+RUMBLE+RAM",
  "MBC5+RUMBLE+RAM+BATTERY",
  "0x1F ???",
  "MBC6",
  "0x21 ???",
  "MBC7+SENSOR+RUMBLE+RAM+BATTERY",
];

const LIC_CODE: Record<number, string> = {
  0x00: "None",
  0x01: "Nintendo R&D1",
  0x08: "Capcom",
  0x13: "Electronic Arts",
  0x18: "Hudson Soft",
  0x19: "b-ai",
  0x20: "kss",
  0x22: "pow",
  0x24: "PCM Complete",
  0x25: "san-x",
  0x28: "Kemco Japan",
  0x29: "seta",
  0x30: "Viacom",
  0x31: "Nintendo",
  0x32: "Bandai",
  0x33: "Ocean/Acclaim",
  0x34: "Konami",
  0x35: "Hector",
  0x37: "Taito",
  0x38: "Hudson",
  0x39: "Banpresto",
  0x41: "Ubi Soft",
  0x42: "Atlus",
  0x44: "Malibu",
  0x46: "angel",
  0x47: "Bullet-Proof",
  0x49: "irem",
  0x50: "Absolute",
  0x51: "Acclaim",
  0x52: "Activision",
  0x53: "American sammy",
  0x54: "Konami",
  0x55: "Hi tech entertainment",
  0x56: "LJN",
  0x57: "Matchbox",
  0x58: "Mattel",
  0x59: "Milton Bradley",
  0x60: "Titus",
  0x61: "Virgin",
  0x64: "LucasArts",
  0x67: "Ocean",
  0x69: "Electronic Arts",
  0x70: "Infogrames",
  0x71: "Interplay",
  0x72: "Broderbund",
  0x73: "sculptured",
  0x75: "sci",
  0x78: "THQ",
  0x79: "Accolade",
  0x80: "misawa",
  0x83: "lozc",
  0x86: "Tokuma Shoten Intermedia",
  0x87: "Tsukuda Original",
  0x91: "Chunsoft",
  0x92: "Video system",
  0x93: "Ocean/Acclaim",
  0x95: "Varie",
  0x96: "Yonezawa/s’pal",
  0x97: "Kaneko",
  0x99: "Pack in soft",
  0xa4: "Konami (Yu-Gi-Oh!)",
};

export function cart_lic_name(): string {
  if (ctx.header!.new_lic_code <= 0xa4) {
    return LIC_CODE[ctx.header!.lic_code];
  }
  return "UNKNOWN";
}

export function cart_type_name(): string {
  if (ctx.header!.type <= 0x22) {
    return ROM_TYPES[ctx.header!.type];
  }
  return "UNKNOWN";
}

export function cart_load(cart: string): boolean {
  ctx.filename = stringCopyLimit(cart, 16);

  let fileData: Buffer;

  try {
    // TODO: figure out endcoding
    fileData = fs.readFileSync(cart);
  } catch (err) {
    console.assert(false, `Failed to open: \n ${cart} \n  ${err}`);
    return false;
  }

  console.log(`Opened: \n ${ctx.filename}`);
  ctx.rom_size = fileData.length;
  ctx.rom_data = fileData;

  ctx.header = {
    entry: fileData.readUInt16LE(0x0100),
    logo: fileData.readUInt16LE(0x0104),
    title: fileData.toString("utf8", 0x0134, 0x0143).replace(/\x00/g, ""),
    new_lic_code: fileData.readUInt16BE(0x0144),
    sgb_flag: fileData.readUInt8(0x0146),
    type: fileData.readUInt8(0x0147),
    rom_size: fileData.readUInt8(0x0148),
    ram_size: fileData.readUInt8(0x0149),
    dest_code: fileData.readUInt8(0x014a),
    lic_code: fileData.readUInt8(0x014b),
    version: fileData.readUInt8(0x014c),
    checksum: fileData.readUInt8(0x014d),
    global_checksum: fileData.readUInt16BE(0x014e),
  };

  console.log("Cartridge Loaded:");
  console.log(`\t Title    : ${ctx.header.title}`);
  console.log(
    `\t Type     : ${ctx.header.type
      .toString(16)
      .toUpperCase()} (${cart_type_name()})`
  );
  console.log(`\t ROM Size : ${32 << ctx.header.rom_size} KB`);
  console.log(
    `\t RAM Size : ${ctx.header.ram_size.toString(16).toUpperCase()}`
  );
  console.log(
    `\t LIC Code : ${ctx.header.lic_code
      .toString(16)
      .toUpperCase()} (${cart_lic_name()})`
  );
  console.log(`\t ROM Vers : ${ctx.header.version.toString(16).toUpperCase()}`);

  let checksum = 0;
  for (let address = 0x0134; address <= 0x014c; ++address) {
    checksum = checksum - ctx.rom_data[address] - 1;
  }
  console.log(
    `\t Checksum : ${ctx.header.checksum.toString(16).toUpperCase()} (${
      checksum & 0xff ? "PASSED" : "FAILED"
    })`
  );

  return true;
}

export function cart_read(address: number): number {
  return ctx.rom_data![address];
}

export function cart_write(address: number, value: number): void {
  NO_IMPL();
}
