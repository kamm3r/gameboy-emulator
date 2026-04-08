import { BETWEEN, formatter, NO_IMPL, stringCopyLimit } from "@/lib/common";
import fs from "node:fs";

type rom_header = {
  entry: Buffer;
  logo: Buffer;

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

  ram_enabled: boolean;
  ram_banking: boolean;

  rom_bank_x: Buffer;
  banking_mode: number;

  rom_bank_value: number;
  ram_bank_value: number;

  ram_bank: Buffer | null;
  ram_banks: Array<Buffer | null>;

  battery: boolean;
  need_save: boolean;
};

const ctx: cartridge_context = {
  filename: "",
  rom_size: 0,
  rom_data: Buffer.alloc(0),
  header: {
    entry: Buffer.alloc(4),
    logo: Buffer.alloc(0x30),
    title: "",
    new_lic_code: 0,
    sgb_flag: 0,
    type: 0,
    rom_size: 0,
    ram_size: 0,
    dest_code: 0,
    lic_code: 0,
    version: 0,
    checksum: 0,
    global_checksum: 0,
  },

  ram_enabled: false,
  ram_banking: false,

  rom_bank_x: Buffer.alloc(0),
  banking_mode: 0,

  rom_bank_value: 1,
  ram_bank_value: 0,

  ram_bank: null,
  ram_banks: new Array<Buffer | null>(16).fill(null),

  battery: false,
  need_save: false,
};

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

function parse_rom_header(rom: Buffer): rom_header {
  const base = 0x0100;

  return {
    entry: rom.subarray(base + 0x00, base + 0x04),
    logo: rom.subarray(base + 0x04, base + 0x34),
    title: rom
      .toString("ascii", base + 0x34, base + 0x44)
      .replace(/\x00.*$/, ""),
    new_lic_code: rom.readUInt16BE(base + 0x44),
    sgb_flag: rom.readUInt8(base + 0x46),
    type: rom.readUInt8(base + 0x47),
    rom_size: rom.readUInt8(base + 0x48),
    ram_size: rom.readUInt8(base + 0x49),
    dest_code: rom.readUInt8(base + 0x4a),
    lic_code: rom.readUInt8(base + 0x4b),
    version: rom.readUInt8(base + 0x4c),
    checksum: rom.readUInt8(base + 0x4d),
    global_checksum: rom.readUInt16BE(base + 0x4e),
  };
}

export function cart_need_save(): boolean {
  return ctx.need_save;
}
export function cart_mbc1(): boolean {
  return BETWEEN(ctx.header.type, 1, 3);
}

export function cart_battery(): boolean {
  return ctx.header.type === 3;
}

export function cart_lic_name(): string {
  if (ctx.header.new_lic_code <= 0xa4) {
    return LIC_CODE[ctx.header.lic_code];
  }
  return "UNKNOWN";
}

export function cart_type_name(): string {
  if (ctx.header.type <= 0x22) {
    return ROM_TYPES[ctx.header.type];
  }
  return "UNKNOWN";
}

export function cart_setup_banking(): void {
  for (let i = 0; i < 16; ++i) {
    ctx.ram_banks[i] = null;

    if (
      (ctx.header?.ram_size == 2 && i == 0) ||
      (ctx.header?.ram_size == 3 && i < 4) ||
      (ctx.header?.ram_size == 4 && i < 16) ||
      (ctx.header?.ram_size == 5 && i < 8)
    ) {
      ctx.ram_banks![i] = Buffer.alloc(0x2000);
    }
  }
  ctx.ram_bank = ctx.ram_banks[0];
  ctx.rom_bank_x = ctx.rom_data.subarray(0x4000, 0x8000); //rom bank 1
}

export function cart_load(cart: string): boolean {
  ctx.filename = cart;

  let fileData: Buffer;

  try {
    fileData = fs.readFileSync(cart);
  } catch (err) {
    console.assert(false, `Failed to open: \n ${cart} \n  ${err}`);
    return false;
  }

  console.log(`Opened: \n ${ctx.filename}`);
  ctx.rom_size = fileData.length;
  ctx.rom_data = fileData;

  ctx.header = parse_rom_header(ctx.rom_data)
  ctx.battery = cart_battery();
  ctx.need_save = false;

  console.log("Cartridge Loaded:\n");
  console.log(formatter("\t Title    : %s\n", ctx.header.title));
  console.log(
    formatter("\t Type     : %2.2X (%s)\n", ctx.header.type, cart_type_name()),
  );
  console.log(formatter("\t ROM Size : %d KB", 32 << ctx.header.rom_size));
  console.log(formatter("\t RAM Size : %2.2X", ctx.header.ram_size));
  console.log(
    formatter("\t LIC Code : %2.2X (%s)", ctx.header.lic_code, cart_lic_name()),
  );
  console.log(formatter("\t ROM Vers : %2.2X", ctx.header.version));

  cart_setup_banking();

  let checksum = 0;
  for (let address = 0x0134; address <= 0x014c; ++address) {
    checksum = checksum - ctx.rom_data[address] - 1;
  }
  console.log(
    formatter(
      "\t Checksum : %2.2X (%s)\n",
      ctx.header.checksum,
      checksum & 0xff ? "PASSED" : "FAILED",
    ),
  );

  if (ctx.battery) {
    cart_battery_load();
  }

  return true;
}

export function cart_battery_load(): void {
  if (!ctx.ram_bank) {
    return;
  }

  const fn = `${ctx.filename}.battery`;

  let fp: Buffer;
  try {
    fp = fs.readFileSync(fn);
  } catch {
    console.error(`FAILED TO OPEN: ${fn}`);
    return;
  }

  fp.copy(ctx.ram_bank, 0, 0, Math.min(0x2000, fp.length));
}

export function cart_battery_save(): void {
  if (!ctx.ram_bank) {
    return;
  }

  const fn = `${ctx.filename}.battery`;

  try {
    fs.writeFileSync(fn, ctx.ram_bank.subarray(0, 0x2000));
  } catch {
    console.error(`FAILED TO OPEN: ${fn}`);
  }
}

export function cart_read(address: number): number {
  if(!cart_mbc1() || address< 0x4000){
    return ctx.rom_data[address];
  }
  if((address & 0xe000) === 0xa000){
    if (!ctx.ram_enabled) {
      return 0xff;
    }

    if (!ctx.ram_bank) {
      return 0xff;
    }

    return ctx.ram_bank[address - 0xa000];
  }
  return ctx.rom_bank_x[address - 0x4000];
}

export function cart_write(address: number, value: number): void {
    if (!cart_mbc1()) {
    return;
  }

  if (address < 0x2000) {
    ctx.ram_enabled = (value & 0xf) === 0xa;
  }

  if ((address & 0xe000) === 0x2000) {
    if (value === 0) {
      value = 1;
    }

    value &= 0b11111;

    ctx.rom_bank_value = value;
    ctx.rom_bank_x = ctx.rom_data.subarray(
      0x4000 * ctx.rom_bank_value,
      0x4000 * (ctx.rom_bank_value + 1)
    );
  }

  if ((address & 0xe000) === 0x4000) {
    ctx.ram_bank_value = value & 0b11;

    if (ctx.ram_banking) {
      if (cart_need_save()) {
        cart_battery_save();
      }

      ctx.ram_bank = ctx.ram_banks[ctx.ram_bank_value];
    }
  }

  if ((address & 0xe000) === 0x6000) {
    ctx.banking_mode = value & 1;
    ctx.ram_banking = !!ctx.banking_mode;

    if (ctx.ram_banking) {
      if (cart_need_save()) {
        cart_battery_save();
      }

      ctx.ram_bank = ctx.ram_banks[ctx.ram_bank_value];
    }
  }

  if ((address & 0xe000) === 0xa000) {
    if (!ctx.ram_enabled) {
      return;
    }

    if (!ctx.ram_bank) {
      return;
    }

    ctx.ram_bank[address - 0xa000] = value;

    if (ctx.battery) {
      ctx.need_save = true;
    }
  }
}
