# Gēmubōi Emulator

TODO:better name and readme

```sh
#test roms
npx tsx ./src/lib/main.ts ./roms/tetris_world.gb

pnpx tsx ./src/lib/main.ts ./roms/tetris_world.gb
```

### TODO

- [x] load roms
- [x] cpu
  - [x] instructions
  - [x] registers
- [x] ppu
- [x] bus
- [x] timer
- [x] emulation
- [x] ui integration
- [ ] audio
  - [x] 01-registers.gb
  - [x] 02-len ctr.gb
  - [ ] 03-trigger.gb
  - [x] 04-sweep.gb
  - [x] 05-sweep details.gb
  - [x] 06-overflow on trigger.gb
  - [x] 07-len sweep period sync.gb
  - [ ] 08-len ctr during power.gb
  - [ ] 09-wave read while on.gb
  - [ ] 10-wave trigger while on.gb
  - [ ] 11-regs after power.gb
  - [ ] 12-wave write while on.gb

References:
https://gbdev.io/pandocs/

https://gekkio.fi/files/gb-docs/gbctr.pdf

https://www.pastraiser.com/cpu/gameboy/gameboy_opcodes.html

https://archive.org/details/GameBoyProgManVer1.1/mode/2up

https://github.com/rockytriton/LLD_gbemu/blob/main/docs/The%20Cycle-Accurate%20Game%20Boy%20Docs.pdf
