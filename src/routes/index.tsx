import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { EmulatorView } from '@/components/emulator_view'
import { emu_init, emu_load_rom, emu_start } from '@/lib/emu'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const [rom_name, set_rom_name] = useState('')
  const [dragging, set_dragging] = useState(false)

  async function load_rom(file: File) {
    const rom_data = new Uint8Array(await file.arrayBuffer())

    emu_init()

    if (!emu_load_rom(rom_data, file.name)) {
      console.error('failed to load rom')
      set_rom_name('')
      return
    }

    set_rom_name(file.name)
    emu_start()
  }

  return (
    <div
      className={cn(
        'min-h-dvh transition-colors',
        dragging && 'bg-muted',
      )}
      onDragOver={(e) => {
        e.preventDefault()
        set_dragging(true)
      }}
      onDragLeave={(e) => {
        // Only when leaving the page, not when moving between children
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          set_dragging(false)
        }
      }}
      onDrop={(e) => {
        e.preventDefault()
        set_dragging(false)
        const file = e.dataTransfer.files.item(0)
        if (file) void load_rom(file)
      }}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8 landscape-phone:py-2">
        <h1 className="text-lg font-medium landscape-phone:hidden">Gēmubōi</h1>
        <EmulatorView rom_name={rom_name} on_load_rom={load_rom} />
      </div>
    </div>
  )
}
