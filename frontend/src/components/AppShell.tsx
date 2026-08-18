import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
import { CommandPalette } from './CommandPalette';
import { DemoBanner } from './DemoBanner';

export function AppShell() {
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [demoOpen, setDemoOpen] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-primary">
      <TopNav onDemoClick={() => setDemoOpen(d => !d)} demoActive={demoOpen} />
      <main className="flex-1">
        <Outlet />
      </main>
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <DemoBanner isOpen={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  );
}

