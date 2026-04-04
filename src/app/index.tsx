import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react';
export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {

  return (
    <div className="emulator-container">
      <header className="emulator-header">
        <h1>Game Boy Emulator</h1>

      </header>

    
    </div>
  );
}
