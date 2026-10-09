import { Logo } from './Logo';

export function Footer() {
  return (
    <footer
      className="mt-16 border-t"
      style={{ borderColor: 'var(--m20-line)', backgroundColor: 'var(--m20-panel)' }}
    >
      <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-3">
              <Logo size={64} />
              <div>
                <p
                  className="m20-mono text-[15px] font-bold tracking-[0.2em]"
                  style={{ color: 'var(--m20-ink)' }}
                >
                  M20
                </p>
                <p className="m20-label">Learning Index</p>
              </div>
            </div>
            <p className="m20-muted mt-3 text-[12.5px] leading-relaxed">
              A structured reference index of engineering project briefs, each
              expanded into a full build specification you can work through
              phase by phase.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <p className="m20-label mb-2">Index</p>
              <ul className="m20-muted space-y-1.5 text-[12.5px]">
                <li>Project database</li>
                <li>Filter & search</li>
                <li>Spec sheet export</li>
                <li>Field notes</li>
              </ul>
            </div>
            <div>
              <p className="m20-label mb-2">Participate</p>
              <ul className="m20-muted space-y-1.5 text-[12.5px]">
                <li>Request a project</li>
                <li>Share your build</li>
                <li>Community board</li>
                <li>Status tracking</li>
              </ul>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="m20-label mb-2">Data</p>
              <p className="m20-muted text-[12.5px] leading-relaxed">
                Notes, flags, requests and shared projects are stored locally in
                your browser.
              </p>
            </div>
          </div>
        </div>

        <div
          className="mt-8 border-t pt-5"
          style={{ borderColor: 'var(--m20-line-soft)' }}
        >
          <p className="m20-mono m20-muted text-[10.5px] tracking-wider">
            © {new Date().getFullYear()} M20 · REV 1.0
          </p>
        </div>
      </div>
    </footer>
  );
}
