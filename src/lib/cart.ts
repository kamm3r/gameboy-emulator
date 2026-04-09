import { BETWEEN, formatter } from "@/lib/common";

type rom_header = {
  entry: Uint8Array;
  logo: Uint8Array;

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
  rom_data: Uint8Array;
  header: rom_header;

  ram_enabled: boolean;
  ram_banking: boolean;

  rom_bank_x: Uint8Array;
  banking_mode: number;

  rom_bank_value: number;
  ram_bank_value: number;

  ram_bank: Uint8Array | null;
  ram_banks: Array<Uint8Array | null>;

  battery: boolean;
  need_save: boolean;
};

const ctx: cartridge_context = {
  filename: "",
  rom_size: 0,
  rom_data: new Uint8Array(0),
  header: {
    entry: new Uint8Array(4),
    logo: new Uint8Array(0x30),
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

  rom_bank_x: new Uint8Array(0),
  banking_mode: 0,

  rom_bank_value: 1,
  ram_bank_value: 0,

  ram_bank: null,
  ram_banks: new Array<Uint8Array | null>(16).fill(null),

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

function read_u8(data: Uint8Array, offset: number): number {
  return data[offset] ?? 0;
}

function read_u16_be(data: Uint8Array, offset: number): number {
  return ((data[offset] ?? 0) << 8) | (data[offset + 1] ?? 0);
}

function read_ascii(data: Uint8Array, start: number, end: number): string {
  let out = "";

  for (let i = start; i < end; i++) {
    const c = data[i] ?? 0;
    if (c === 0) break;
    out += String.fromCharCode(c);
  }

  return out;
}

function parse_rom_header(rom: Uint8Array): rom_header {
  const base = 0x0100;

  return {
    entry: rom.slice(base + 0x00, base + 0x04),
    logo: rom.slice(base + 0x04, base + 0x34),
    title: read_ascii(rom, base + 0x34, base + 0x44),
    new_lic_code: read_u16_be(rom, base + 0x44),
    sgb_flag: read_u8(rom, base + 0x46),
    type: read_u8(rom, base + 0x47),
    rom_size: read_u8(rom, base + 0x48),
    ram_size: read_u8(rom, base + 0x49),
    dest_code: read_u8(rom, base + 0x4a),
    lic_code: read_u8(rom, base + 0x4b),
    version: read_u8(rom, base + 0x4c),
    checksum: read_u8(rom, base + 0x4d),
    global_checksum: read_u16_be(rom, base + 0x4e),
  };
}

function battery_key(): string {
  return `gb_battery_${ctx.filename || ctx.header.title || "default"}`;
}

function get_rom_bank_count(): number {
  return Math.max(1, ctx.rom_data.length >>> 14);
}

function normalize_mbc1_bank(bank: number): number {
  const romBanks = get_rom_bank_count();
  let out = bank % romBanks;

  if ((out & 0x1f) === 0) {
    out += 1;
  }

  out %= romBanks;
  return out;
}

function update_rom_bank(): void {
  let bank = ctx.rom_bank_value & 0x1f;
  if (bank === 0) bank = 1;

  if (!ctx.ram_banking) {
    bank |= (ctx.ram_bank_value & 0x03) << 5;
  }

  bank = normalize_mbc1_bank(bank);

  const start = 0x4000 * bank;
  const end = start + 0x4000;
  ctx.rom_bank_x = ctx.rom_data.slice(start, end);
}

function get_ram_bank_count(): number {
  switch (ctx.header.ram_size) {
    case 0x02:
      return 1;
    case 0x03:
      return 4;
    case 0x04:
      return 16;
    case 0x05:
      return 8;
    default:
      return 0;
  }
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
  if (ctx.header.lic_code === 0x33) {
    return LIC_CODE[ctx.header.new_lic_code] ?? "UNKNOWN";
  }

  return LIC_CODE[ctx.header.lic_code] ?? "UNKNOWN";
}

export function cart_type_name(): string {
  if (ctx.header.type <= 0x22) {
    return ROM_TYPES[ctx.header.type] ?? "UNKNOWN";
  }

  return "UNKNOWN";
}

export function cart_setup_banking(): void {
  for (let i = 0; i < 16; ++i) {
    ctx.ram_banks[i] = null;
  }

  const ramBanks = get_ram_bank_count();
  for (let i = 0; i < ramBanks; ++i) {
    ctx.ram_banks[i] = new Uint8Array(0x2000);
  }

  ctx.ram_bank = ctx.ram_banks[0];
  update_rom_bank();
}

export function cart_load(data: Uint8Array, filename = "rom.gb"): boolean {
  ctx.filename = filename;
  ctx.rom_size = data.length;
  ctx.rom_data = new Uint8Array(data);

  ctx.header = parse_rom_header(ctx.rom_data);
  ctx.battery = cart_battery();
  ctx.need_save = false;
  ctx.ram_enabled = false;
  ctx.ram_banking = false;
  ctx.rom_bank_value = 1;
  ctx.ram_bank_value = 0;
  ctx.banking_mode = 0;
  ctx.ram_bank = null;
  ctx.rom_bank_x = new Uint8Array(0);
  ctx.ram_banks.fill(null);

  console.log(`Opened: ${ctx.filename}`);
  console.log("Cartridge Loaded:");
  console.log(formatter("\t Title    : %s", ctx.header.title));
  console.log(
    formatter("\t Type     : %2.2X (%s)", ctx.header.type, cart_type_name()),
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
    checksum = checksum - (ctx.rom_data[address] ?? 0) - 1;
  }

  console.log(
    formatter(
      "\t Checksum : %2.2X (%s)",
      ctx.header.checksum,
      ((checksum & 0xff) === ctx.header.checksum) ? "PASSED" : "FAILED",
    ),
  );

  if (ctx.battery) {
    cart_battery_load();
  }

  return true;
}

export function cart_battery_load(): void {
  const ramBanks = get_ram_bank_count();
  if (ramBanks === 0) return;

  const raw = localStorage.getItem(battery_key());
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw) as number[][];
    if (!Array.isArray(parsed)) return;

    for (let bank = 0; bank < Math.min(ramBanks, parsed.length); bank++) {
      const dst = ctx.ram_banks[bank];
      const src = parsed[bank];
      if (!dst || !Array.isArray(src)) continue;

      for (let i = 0; i < Math.min(0x2000, src.length); i++) {
        dst[i] = src[i] & 0xff;
      }
    }
  } catch (err) {
    console.error("Failed to load battery save", err);
  }
}

export function cart_battery_save(): void {
  const ramBanks = get_ram_bank_count();
  if (ramBanks === 0) return;

  try {
    const dump: number[][] = [];

    for (let bank = 0; bank < ramBanks; bank++) {
      dump.push(Array.from(ctx.ram_banks[bank] ?? new Uint8Array(0x2000)));
    }

    localStorage.setItem(battery_key(), JSON.stringify(dump));
    ctx.need_save = false;
  } catch (err) {
    console.error("Failed to save battery RAM", err);
  }
}

export function cart_read(address: number): number {
  address &= 0xffff;

  if (!cart_mbc1()) {
    return ctx.rom_data[address] ?? 0xff;
  }

  if (address < 0x4000) {
    return ctx.rom_data[address] ?? 0xff;
  }

  if (address >= 0x4000 && address < 0x8000) {
    return ctx.rom_bank_x[address - 0x4000] ?? 0xff;
  }

  if (address >= 0xa000 && address < 0xc000) {
    if (!ctx.ram_enabled || !ctx.ram_bank) {
      return 0xff;
    }

    return ctx.ram_bank[address - 0xa000] ?? 0xff;
  }

  return 0xff;
}

export function cart_write(address: number, value: number): void {
  address &= 0xffff;
  value &= 0xff;

  if (!cart_mbc1()) {
    return;
  }

  if (address < 0x2000) {
    ctx.ram_enabled = (value & 0x0f) === 0x0a;
    return;
  }

  if (address >= 0x2000 && address < 0x4000) {
    let bank = value & 0x1f;
    if (bank === 0) bank = 1;

    ctx.rom_bank_value = bank;
    update_rom_bank();
    return;
  }

  if (address >= 0x4000 && address < 0x6000) {
    ctx.ram_bank_value = value & 0x03;

    if (ctx.ram_banking) {
      if (cart_need_save()) {
        cart_battery_save();
      }

      ctx.ram_bank = ctx.ram_banks[ctx.ram_bank_value] ?? null;
    }

    update_rom_bank();
    return;
  }

  if (address >= 0x6000 && address < 0x8000) {
    ctx.banking_mode = value & 1;
    ctx.ram_banking = ctx.banking_mode === 1;

    if (ctx.ram_banking) {
      if (cart_need_save()) {
        cart_battery_save();
      }

      ctx.ram_bank = ctx.ram_banks[ctx.ram_bank_value] ?? null;
    } else {
      ctx.ram_bank = ctx.ram_banks[0] ?? null;
    }

    update_rom_bank();
    return;
  }

  if (address >= 0xa000 && address < 0xc000) {
    if (!ctx.ram_enabled || !ctx.ram_bank) {
      return;
    }

    ctx.ram_bank[address - 0xa000] = value;

    if (ctx.battery) {
      ctx.need_save = true;
    }
  }
}