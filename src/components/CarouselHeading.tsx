import { useEffect, useState } from 'react';

const PHRASES = [
  'Engineering Project Specifications',
  'Mechanical Project Specifications',
  'Electrical Project Specifications',
  'Software Project Specifications',
  'Biomedical Project Specifications',
  'Instrumentation Project Specifications',
];

const ROTATE_MS = 2800;
const TRANSITION_MS = 500;

export function CarouselHeading() {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState<'out' | 'in'>('in');

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setDir('out');
        setTimeout(() => {
          setIdx((i) => (i + 1) % PHRASES.length);
          setDir('in');
          schedule();
        }, TRANSITION_MS);
      }, ROTATE_MS);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  return (
    <h1
      className="mt-1.5 text-[26px] leading-[1.15] font-bold tracking-tight sm:text-[32px]"
      style={{
        color: 'var(--m20-ink)',
        opacity: dir === 'in' ? 1 : 0,
        transform: dir === 'in' ? 'translateY(0)' : 'translateY(-8px)',
        transition: `opacity ${TRANSITION_MS}ms ease, transform ${TRANSITION_MS}ms ease`,
      }}
      aria-live="polite"
    >
      {PHRASES[idx]}
    </h1>
  );
}