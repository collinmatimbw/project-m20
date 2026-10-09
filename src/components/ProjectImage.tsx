import { useState } from 'react';
import { cn } from '../utils/cn';

interface Props {
  /** Local image path, or null/undefined when the record has no photo. */
  src?: string | null;
  alt: string;
  /** Shown in the fallback panel and as the accessible label. */
  category?: string;
  className?: string;
  /** Renders at low resolution — used by the PDF exporter. */
  compact?: boolean;
}

/**
 * Project banner for the detail header.
 *
 * Real photo when the record has one. Falls back to a labelled panel when there
 * is no image, or when the file is missing or fails to decode, so the header
 * never collapses. The photo sits under a light scrim in dark mode because most
 * of them are bright studio renders on white.
 */
export function ProjectImage({ src, alt, category, className, compact }: Props) {
  const [failed, setFailed] = useState(false);
  const showPhoto = !!src && !failed;

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{
        backgroundColor: 'var(--m20-panel-alt)',
        minHeight: compact ? 120 : 168,
      }}
    >
      {showPhoto ? (
        <>
          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            draggable={false}
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
            style={{ position: 'absolute', inset: 0 }}
          />
          {/* keeps bright white-background photos from glaring in dark mode */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(to top, color-mix(in srgb, var(--m20-bg) 55%, transparent) 0%, transparent 55%)',
            }}
          />
        </>
      ) : (
        <FallbackPanel category={category} compact={compact} />
      )}
    </div>
  );
}

function FallbackPanel({ category, compact }: { category?: string; compact?: boolean }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-1.5"
      style={{
        backgroundImage:
          'linear-gradient(var(--m20-line-soft) 1px, transparent 1px), linear-gradient(90deg, var(--m20-line-soft) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
      }}
      aria-hidden="true"
    >
      <span
        className="m20-mono font-bold"
        style={{ color: 'var(--m20-accent)', fontSize: compact ? 20 : 26 }}
      >
        ▧
      </span>
      {category && (
        <span
          className="m20-label px-4 text-center"
          style={{ color: 'var(--m20-muted)' }}
        >
          {category}
        </span>
      )}
    </div>
  );
}
