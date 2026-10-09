import { useData } from '../contexts/DataContext';
import { CATALOGUE_COUNT } from '../data/catalogue';
import { CatalogueView } from '../components/CatalogueView';
import { CarouselHeading } from '../components/CarouselHeading';

export function IndexPage() {
  const { flags, notes, customProjects } = useData();
  const projectCount = CATALOGUE_COUNT + customProjects.length;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-7 sm:px-6 sm:py-9">
      {/* masthead */}
      <header className="m20-ticks m20-card overflow-hidden">
        <div
          className="flex flex-col gap-5 p-5 sm:p-7 lg:flex-row lg:items-end lg:justify-between"
          style={{ backgroundColor: 'var(--m20-panel)' }}
        >
          <div>
            <p className="m20-label">Section 01 — Project Index</p>
            <CarouselHeading />
            <p className="m20-muted mt-2 max-w-2xl text-[14px] leading-relaxed">
              {projectCount.toLocaleString('en-TZ')} projects, one index. Each opens
              a complete build specification — objectives and architecture, a phased
              build plan, a bill of materials priced in TSh, validation gates, fault
              modes and safety notes.
            </p>
            <p className="m20-muted mt-2 max-w-2xl text-[14px] leading-relaxed">
              Export any of them as a PDF spec sheet, and keep your own field notes
              against the build as you go.
            </p>
          </div>

          <div className="grid shrink-0 grid-cols-3 gap-3">
            {[
              { l: 'Projects', v: projectCount },
              { l: 'Saved', v: Object.keys(flags).length },
              { l: 'Notes', v: Object.keys(notes).length },
            ].map((s) => (
              <div
                key={s.l}
                className="m20-panel-alt border px-3 py-2.5 text-center"
                style={{ borderColor: 'var(--m20-line)' }}
              >
                <p
                  className="m20-mono text-[19px] leading-none font-bold"
                  style={{ color: 'var(--m20-accent-ink)' }}
                >
                  {s.v.toLocaleString('en-TZ')}
                </p>
                <p className="m20-label mt-1.5">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="mt-4">
        <CatalogueView />
      </div>
    </div>
  );
}
