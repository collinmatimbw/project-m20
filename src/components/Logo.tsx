import { cn } from '../utils/cn';

export function Logo({ className, size = 56 }: { className?: string; size?: number }) {
  return (
    <img
      src="/logo.png"
      alt="M20"
      width={size}
      height={size}
      className={cn('shrink-0 select-none object-contain', className)}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex flex-col leading-none">
      <span
        className="m20-mono text-[15px] font-bold tracking-[0.2em]"
        style={{ color: 'var(--m20-ink)' }}
      >
        M20
      </span>
      {!compact && (
        <span className="m20-label mt-[3px] text-[8.5px] tracking-[0.18em]">
          Learning Index
        </span>
      )}
    </span>
  );
}
