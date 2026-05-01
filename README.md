# Gameboy Emulator

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
  - [ ] apu
  - [ ] wave
  - [ ] noise
  - [ ] pulse

References:
https://gbdev.io/pandocs/

https://gekkio.fi/files/gb-docs/gbctr.pdf

https://www.pastraiser.com/cpu/gameboy/gameboy_opcodes.html

https://archive.org/details/GameBoyProgManVer1.1/mode/2up

https://github.com/rockytriton/LLD_gbemu/blob/main/docs/The%20Cycle-Accurate%20Game%20Boy%20Docs.pdf
