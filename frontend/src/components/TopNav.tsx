import * as React from 'react';
import { NavLink } from 'react-router-dom';
import { Shield, Menu, X, Zap } from 'lucide-react';
import { cn } from '@/utils';

const navItems = [
  { label: 'Overview', path: '/' },
  { label: 'Agents', path: '/agents' },
  { label: 'Compare', path: '/compare' },
];

interface TopNavProps {
  onDemoClick?: () => void;
  demoActive?: boolean;
}

export function TopNav({ onDemoClick, demoActive }: TopNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center px-4 md:px-8">
          <div className="mr-4 hidden md:flex">
            <NavLink to="/" className="mr-6 flex items-center space-x-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="hidden font-bold tracking-tight sm:inline-block">
                Sentinel
              </span>
            </NavLink>
            <nav className="flex items-center space-x-6 text-sm font-medium">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'transition-colors hover:text-primary',
                      isActive ? 'text-primary' : 'text-muted'
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <button
            className="inline-flex items-center justify-center rounded-md p-2 text-muted hover:bg-surface hover:text-primary md:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </button>
          
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="w-full flex-1 md:w-auto md:flex-none">
              <button
                className="inline-flex h-9 w-full items-center justify-between rounded-md border border-border bg-surface px-3 text-sm text-muted shadow-sm transition-colors hover:bg-border/50 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 sm:w-64"
                onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
              >
                <span className="hidden lg:inline-flex">Search documentation...</span>
                <span className="inline-flex lg:hidden">Search...</span>
                <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </button>
            </div>
            <div className="flex items-center gap-2">
              {onDemoClick && (
                <button
                  onClick={onDemoClick}
                  className={cn(
                    'hidden sm:flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                    demoActive
                      ? 'border-info/40 bg-info/10 text-info'
                      : 'border-border/50 bg-surface text-muted hover:text-primary'
                  )}
                >
                  <Zap className="h-3 w-3" />
                  Demo
                </button>
              )}
              <div className="flex items-center gap-2 rounded-full border border-border/50 bg-surface px-3 py-1.5 text-xs font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success"></span>
                </span>
                <span className="hidden text-muted sm:inline-block">System Online</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Sheet */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-3/4 max-w-sm border-r border-border bg-surface shadow-2xl transition-transform">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <NavLink to="/" className="flex items-center space-x-2" onClick={() => setMobileMenuOpen(false)}>
                <Shield className="h-5 w-5 text-primary" />
                <span className="font-bold tracking-tight">Sentinel</span>
              </NavLink>
              <button
                className="rounded-md p-2 text-muted hover:bg-border/50 hover:text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <nav className="flex flex-col space-y-4 text-sm font-medium">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'transition-colors hover:text-primary',
                        isActive ? 'text-primary' : 'text-muted'
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
