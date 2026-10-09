import { cn } from '../utils/cn';

export type Status = 'pending' | 'under-review' | 'approved' | 'rejected';

const STYLES: Record<Status, { fg: string; bg: string; mark: string }> = {
  pending: { fg: 'var(--m20-muted)', bg: 'var(--m20-panel-alt)', mark: '◷' },
  'under-review': { fg: 'var(--m20-warn)', bg: 'var(--m20-warn-soft)', mark: '◐' },
  approved: { fg: 'var(--m20-ok)', bg: 'var(--m20-ok-soft)', mark: '✓' },
  rejected: { fg: 'var(--m20-danger)', bg: 'var(--m20-danger-soft)', mark: '✕' },
};

export function StatusBadge({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  const s = STYLES[status] ?? STYLES.pending;
  return (
    <span
      className={cn('m20-badge', className)}
      style={{ color: s.fg, backgroundColor: s.bg, borderColor: s.fg }}
    >
      <span aria-hidden="true">{s.mark}</span>
      {status.replace('-', ' ')}
    </span>
  );
}

export function LevelBadge({ level }: { level: string }) {
  const tone =
    level === 'Beginner'
      ? 'var(--m20-ok)'
      : level === 'Intermediate'
        ? 'var(--m20-warn)'
        : 'var(--m20-danger)';
  return (
    <span
      className="m20-badge"
      style={{
        color: tone,
        borderColor: tone,
        backgroundColor: 'transparent',
      }}
    >
      {level}
    </span>
  );
}

export function MetaTag({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="m20-badge"
      style={{
        color: 'var(--m20-muted)',
        borderColor: 'var(--m20-line)',
        backgroundColor: 'var(--m20-panel-alt)',
      }}
    >
      {children}
    </span>
  );
}
