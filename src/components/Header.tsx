import { useEffect, useState } from 'react';
import type { TabName, UserRole } from '../types';
import { Logo, Wordmark } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '../utils/cn';

const TABS: { id: TabName; label: string; code: string }[] = [
  { id: 'INDEX', label: 'Index', code: '01' },
  { id: 'REQUEST', label: 'Request', code: '02' },
  { id: 'SHARE', label: 'Share', code: '03' },
  { id: 'COMMUNITY', label: 'Community', code: '04' },
];

const ADMIN_TABS: { id: TabName; label: string; code: string }[] = [
  { id: 'INDEX', label: 'Index', code: '01' },
  { id: 'REQUEST', label: 'Request', code: '02' },
  { id: 'SHARE', label: 'Share', code: '03' },
  { id: 'COMMUNITY', label: 'Community', code: '04' },
  { id: 'ADMIN', label: 'Admin', code: '05' },
];

export function Header({
  active,
  onNavigate,
  onLogout,
  role,
}: {
  active: TabName;
  onNavigate: (tab: TabName) => void;
  onLogout: () => void;
  role: UserRole;
}) {
  const [open, setOpen] = useState(false);

  const tabs = role === 'admin' ? ADMIN_TABS : TABS;

  useEffect(() => {
    setOpen(false);
  }, [active]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur"
      style={{
        borderColor: 'var(--m20-line)',
        backgroundColor: 'color-mix(in srgb, var(--m20-bg) 88%, transparent)',
      }}
    >
      <div className="mx-auto flex h-20 max-w-[1400px] items-center gap-3 px-4 sm:px-6">
        {/* brand */}
        <button
          type="button"
          onClick={() => onNavigate('INDEX')}
          className="flex shrink-0 items-center gap-2.5"
          aria-label="M20 Learning Index — go to index"
        >
          <Logo size={84} />
          <Wordmark />
        </button>

        {/* desktop nav */}
        <nav
          className="ml-auto hidden items-center gap-0.5 md:flex"
          aria-label="Primary"
        >
          {tabs.map((t) => {
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onNavigate(t.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'group relative flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold tracking-[0.1em] uppercase transition-colors',
                  isActive ? 'm20-accent-ink' : 'm20-muted hover:m20-ink-soft'
                )}
              >
                <span className="m20-mono text-[9px] opacity-60">{t.code}</span>
                {t.label}
                <span
                  className="absolute inset-x-2 -bottom-[13px] h-[2px] transition-all"
                  style={{
                    backgroundColor: isActive ? 'var(--m20-accent)' : 'transparent',
                  }}
                />
              </button>
            );
          })}
        </nav>

        {/* right cluster: signout + theme toggle */}
        <div className="ml-auto flex items-center gap-3 md:ml-3">
          <button
            type="button"
            onClick={onLogout}
            className={cn(
              'm20-btn m20-btn-ghost m20-btn-sm',
              'hidden sm:flex'
            )}
            aria-label="Sign out"
          >
            Sign out
          </button>
          <ThemeToggle />

          {/* mobile hamburger */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            className="m20-btn h-9 w-9 p-0 md:hidden"
          >
            <span className="flex flex-col items-center justify-center gap-[3px]">
              <span
                className="block h-[1.5px] w-4 transition-transform"
                style={{
                  backgroundColor: 'currentColor',
                  transform: open ? 'translateY(4.5px) rotate(45deg)' : undefined,
                }}
              />
              <span
                className="block h-[1.5px] w-4"
                style={{
                  backgroundColor: 'currentColor',
                  opacity: open ? 0 : 1,
                }}
              />
              <span
                className="block h-[1.5px] w-4 transition-transform"
                style={{
                  backgroundColor: 'currentColor',
                  transform: open ? 'translateY(-4.5px) rotate(-45deg)' : undefined,
                }}
              />
            </span>
          </button>
        </div>
      </div>

      {/* mobile drawer */}
      {open && (
        <div
          className="fixed inset-x-0 top-20 bottom-0 z-40 md:hidden"
          style={{ backgroundColor: 'var(--m20-bg)' }}
        >
          <nav className="flex flex-col p-4" aria-label="Mobile">
            {tabs.map((t) => {
              const isActive = active === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onNavigate(t.id)}
                  className="m20-card m20-card-hover flex items-center gap-3 px-4 py-4 text-left"
                  style={{
                    borderColor: isActive ? 'var(--m20-accent)' : 'var(--m20-line)',
                    backgroundColor: isActive
                      ? 'var(--m20-accent-soft)'
                      : 'var(--m20-panel)',
                  }}
                >
                  <span className="m20-mono text-[11px] opacity-60">{t.code}</span>
                  <span
                    className="text-[13px] font-bold tracking-[0.12em] uppercase"
                    style={{
                      color: isActive ? 'var(--m20-accent-ink)' : 'var(--m20-ink)',
                    }}
                  >
                    {t.label}
                  </span>
                  {isActive && (
                    <span
                      className="m20-mono ml-auto text-[11px]"
                      style={{ color: 'var(--m20-accent)' }}
                    >
                      ▸
                    </span>
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={onLogout}
              className="m20-btn m20-btn-ghost m20-btn-sm mt-4 w-full"
            >
              Sign out
            </button>
            <p className="m20-label mt-4 px-1 leading-relaxed">
              Personal study reference. Source: nevonprojects.com
            </p>
          </nav>
        </div>
      )}
    </header>
  );
}
