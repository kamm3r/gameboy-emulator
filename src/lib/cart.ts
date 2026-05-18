import { ROM_BANK_SIZE, RAM_BANK_SIZE } from "./common";

type mbc_type = "rom_only" | "mbc1" | "mbc3";

type cart_context = {
  rom: Uint8Array;
  rom_banks: number;
  rom_bank: number;

  ram: Uint8Array;
  ram_banks: number;
  ram_bank: number;
  ram_enable: boolean;

  mbc: mbc_type;
  mbc1_mode: boolean;

  need_save: boolean;
  battery: boolean;
  save_key: string;

  rtc_regs: number[];
  rtc_latch: number[];
  rtc_selected: number;
};

const ctx: cart_context = {
  rom: new Uint8Array(0),
  rom_banks: 0,
  rom_bank: 1,

  ram: new Uint8Array(0),
  ram_banks: 0,
  ram_bank: 0,
  ram_enable: false,

  mbc: "rom_only",
  mbc1_mode: false,

  need_save: false,
  battery: false,
  save_key: "",

  rtc_regs: [0, 0, 0, 0, 0],
  rtc_latch: [0, 0, 0, 0, 0],
  rtc_selected: 0,
};

function get_ram_size(byte: number): number {
  switch (byte) {
    case 0: return 0;
    case 1: return 0x800;
    case 2: return 0x2000;
    case 3: return 0x8000;
    case 4: return 0x20000;
    case 5: return 0x10000;
    default: return 0;
  }
}

function detect_mbc(type: number): mbc_type {
  if (type >= 0x01 && type <= 0x03) return "mbc1";
  if (type >= 0x0f && type <= 0x13) return "mbc3";
  return "rom_only";
}

export function cart_load(data: Uint8Array, filename?: string): boolean {
  if (data.length < 0x150) {
    return false;
  }

  const type = data[0x0147];
  const ram_size_code = data[0x0149];
  const rom_size = data.length;

  ctx.mbc = detect_mbc(type);
  ctx.rom = new Uint8Array(rom_size);
  ctx.rom.set(data);
  ctx.rom_banks = Math.max(2, rom_size / ROM_BANK_SIZE);
  ctx.rom_bank = 1;

  ctx.ram_banks = get_ram_size(ram_size_code) / RAM_BANK_SIZE;
  if (ctx.ram_banks < 1) ctx.ram_banks = 0;
  ctx.ram = new Uint8Array(Math.max(ctx.ram_banks, 1) * RAM_BANK_SIZE);
  ctx.ram.fill(0);
  ctx.ram_bank = 0;
  ctx.ram_enable = false;
  ctx.mbc1_mode = false;
  ctx.need_save = false;

  ctx.battery = type === 0x03 || type === 0x09 || type === 0x0d || type === 0x13;
  ctx.save_key = filename ? `gbe_save_${filename}` : "gbe_save";

  if (ctx.battery) {
    try {
      const saved = localStorage.getItem(ctx.save_key);
      if (saved) {
        const data = JSON.parse(saved) as number[][];
        for (let b = 0; b < data.length && b < ctx.ram_banks; b++) {
          ctx.ram.set(new Uint8Array(data[b]), b * RAM_BANK_SIZE);
        }
      }
    } catch {
      // ignore
    }
  }

  return true;
}

export function cart_read(address: number): number {
  const addr = address & 0xffff;

  if (addr < 0x4000) {
    return ctx.rom[addr];
  }

  if (addr < 0x8000) {
    const bank = ctx.rom_bank % ctx.rom_banks;
    return ctx.rom[bank * ROM_BANK_SIZE + (addr & 0x3fff)];
  }

  if (addr >= 0xa000 && addr < 0xc000 && ctx.ram_enable) {
    const bank = ctx.mbc === "mbc1" && ctx.mbc1_mode ? ctx.ram_bank : 0;
    const real_bank = Math.min(bank, Math.max(ctx.ram_banks - 1, 0));

    if (ctx.mbc === "mbc3" && ctx.ram_bank >= 0x08 && ctx.ram_bank <= 0x0c) {
      return ctx.rtc_regs[ctx.ram_bank - 0x08];
    }

    return ctx.ram[real_bank * RAM_BANK_SIZE + (addr & 0x1fff)];
  }

  return 0xff;
}

export function cart_write(address: number, value: number): void {
  const addr = address & 0xffff;
  value &= 0xff;

  if (addr < 0x2000) {
    if (ctx.mbc === "mbc1" || ctx.mbc === "mbc3") {
      ctx.ram_enable = (value & 0x0f) === 0x0a;
    }
    return;
  }

  if (addr < 0x4000) {
    if (ctx.mbc === "mbc1") {
      let bank = value & 0x1f;
      if (bank === 0) bank = 1;
      ctx.rom_bank = (ctx.rom_bank & 0xe0) | bank;
    } else if (ctx.mbc === "mbc3") {
      let bank = value & 0x7f;
      if (bank === 0) bank = 1;
      ctx.rom_bank = bank;
    }
    return;
  }

  if (addr < 0x6000) {
    if (ctx.mbc === "mbc1") {
      if (ctx.mbc1_mode) {
        ctx.ram_bank = value & 0x03;
      } else {
        ctx.rom_bank = (ctx.rom_bank & 0x1f) | ((value & 0x03) << 5);
      }
    } else if (ctx.mbc === "mbc3") {
      ctx.ram_bank = value & 0x0f;
    }
    return;
  }

  if (addr < 0x8000) {
    if (ctx.mbc === "mbc1") {
      ctx.mbc1_mode = (value & 0x01) !== 0;
    } else if (ctx.mbc === "mbc3") {
      if (value === 0) {
        ctx.rtc_latch = [...ctx.rtc_regs];
      }
    }
    return;
  }

  if (addr >= 0xa000 && addr < 0xc000 && ctx.ram_enable) {
    if (ctx.mbc === "mbc3" && ctx.ram_bank >= 0x08 && ctx.ram_bank <= 0x0c) {
      ctx.rtc_regs[ctx.ram_bank - 0x08] = value;
    } else {
      const bank = ctx.mbc === "mbc1" && ctx.mbc1_mode ? ctx.ram_bank : 0;
      const real_bank = Math.min(bank, Math.max(ctx.ram_banks - 1, 0));
      ctx.ram[real_bank * RAM_BANK_SIZE + (addr & 0x1fff)] = value;
      ctx.need_save = true;
    }
  }
}

export function cart_need_save(): boolean {
  return ctx.need_save && ctx.battery;
}

export function cart_battery_save(): void {
  if (!ctx.battery || !ctx.need_save) {
    return;
  }

  try {
    const data: number[][] = [];
    for (let b = 0; b < ctx.ram_banks; b++) {
      const start = b * RAM_BANK_SIZE;
      data.push(Array.from(ctx.ram.slice(start, start + RAM_BANK_SIZE)));
    }
    localStorage.setItem(ctx.save_key, JSON.stringify(data));
    ctx.need_save = false;
  } catch {
    // ignore
  }
}
