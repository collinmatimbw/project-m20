import { useTheme } from '../contexts/ThemeContext';
import type { ThemeMode } from '../types';
import { cn } from '../utils/cn';

const MODES: { mode: ThemeMode; icon: string; label: string }[] = [
  { mode: 'light', icon: '☀', label: 'Light' },
  { mode: 'dark', icon: '☾', label: 'Dark' },
  { mode: 'system', icon: '⚙', label: 'System' },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={cn(
        'flex items-center gap-0.5 rounded-[2px] border p-0.5',
        className
      )}
      style={{ borderColor: 'var(--m20-line)', backgroundColor: 'var(--m20-panel-alt)' }}
      role="group"
      aria-label="Theme mode"
      title="Theme: light / dark / system"
    >
      {MODES.map(({ mode, icon, label }) => {
        const active = theme === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => setTheme(mode)}
            aria-pressed={active}
            aria-label={label}
            title={`${label} theme`}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-[1px] text-[13px] leading-none transition-colors',
              active ? 'text-white' : 'm20-muted hover:m20-accent-ink'
            )}
            style={
              active
                ? { backgroundColor: 'var(--m20-accent)' }
                : undefined
            }
          >
            <span aria-hidden="true">{icon}</span>
          </button>
        );
      })}
    </div>
  );
}
