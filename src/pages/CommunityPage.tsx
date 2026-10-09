import { useEffect, useMemo, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { loadCatalogue, branchOf, CATALOGUE_COUNT } from '../data/catalogue';
import { LevelBadge, StatusBadge } from '../components/StatusBadge';
import type { Status } from '../components/StatusBadge';
import type { TabName } from '../types';
import { formatDateTime, relativeTime } from '../utils/cn';
import { linkTypeIcon } from '../utils/linkType';

type FeedFilter = 'all' | 'requests' | 'shared';

export function CommunityPage({ onNavigate }: { onNavigate: (tab: TabName) => void }) {
  const { requests, sharedProjects, notes, flags, customProjects } = useData();
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');

  const approved = sharedProjects.filter((p) => p.status === 'approved');
  const pending = sharedProjects.filter((p) => p.status === 'pending');

  const stats = useMemo(
    () => [
      { label: 'Indexed Projects', value: CATALOGUE_COUNT + customProjects.length, sub: 'full specifications', tone: 'var(--m20-accent)' },
      { label: 'Shared Projects', value: sharedProjects.length, sub: `${approved.length} approved`, tone: 'var(--m20-ok)' },
      { label: 'Open Requests', value: requests.filter((r) => r.status === 'pending' || r.status === 'under-review').length, sub: `${requests.length} submitted`, tone: 'var(--m20-warn)' },
      { label: 'Your Notes', value: Object.keys(notes).length, sub: `${Object.keys(flags).length} saved`, tone: 'var(--m20-ink)' },
    ],
    [sharedProjects, requests, notes, flags, customProjects]
  );

  const visibleShared = sharedProjects.filter(
    (p) => statusFilter === 'all' || p.status === statusFilter
  );
  const visibleRequests = requests.filter(
    (r) => statusFilter === 'all' || r.status === statusFilter
  );

  const showShared = filter === 'all' || filter === 'shared';
  const showRequests = filter === 'all' || filter === 'requests';

  const [branchCoverage, setBranchCoverage] = useState<
    { branch: string; count: number; pct: number }[]
  >([]);

  useEffect(() => {
    let alive = true;
    loadCatalogue()
      .then((base) => {
        if (!alive) return;
        const entries = [...customProjects, ...base];
        const map = new Map<string, number>();
        entries.forEach((e) => {
          const b = branchOf(e) ?? 'Uncategorised';
          map.set(b, (map.get(b) ?? 0) + 1);
        });
        const max = Math.max(...map.values());
        setBranchCoverage(
          Array.from(map.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([branch, count]) => ({
              branch,
              count,
              pct: (count / max) * 100,
            }))
        );
      })
      .catch(() => {
        if (alive) setBranchCoverage([]);
      });
    return () => {
      alive = false;
    };
  }, [customProjects]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-7 sm:px-6 sm:py-9">
      <header className="m20-ticks m20-card p-5 sm:p-7">
        <p className="m20-label">Section 04 — Community Board</p>
        <h1
          className="mt-1.5 text-[26px] leading-tight font-bold sm:text-[32px]"
          style={{ color: 'var(--m20-ink)' }}
        >
          Community Dashboard
        </h1>
        <p className="m20-muted mt-2 max-w-2xl text-[14px] leading-relaxed">
          Everything submitted through the request and share portals, in one place, with
          status tracking and resource links. All data is stored locally in this browser.
        </p>
      </header>

      {/* stats */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="m20-card m20-ticks relative overflow-hidden p-4"
          >
            <span
              className="absolute top-0 left-0 h-full w-[3px]"
              style={{ backgroundColor: s.tone }}
            />
            <p className="m20-label">{s.label}</p>
            <p
              className="m20-mono mt-2 text-[30px] leading-none font-bold"
              style={{ color: s.tone }}
            >
              {s.value}
            </p>
            <p className="m20-muted mt-2 text-[11.5px]">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* feed */}
        <div>
          <div className="m20-card flex flex-wrap items-center gap-2 p-3">
            <div
              className="flex overflow-hidden rounded-[2px] border"
              style={{ borderColor: 'var(--m20-line)' }}
            >
              {(['all', 'shared', 'requests'] as FeedFilter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  aria-pressed={filter === f}
                  className="px-3 py-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase"
                  style={{
                    backgroundColor: filter === f ? 'var(--m20-accent)' : 'transparent',
                    color: filter === f ? '#fff' : 'var(--m20-muted)',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | Status)}
              className="m20-input ml-auto w-auto min-w-[140px] py-1.5 text-[12px]"
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="under-review">Under review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="mt-3 space-y-3">
            {showShared && visibleShared.length === 0 && showRequests && visibleRequests.length === 0 && (
              <div className="m20-card p-10 text-center">
                <p className="m20-mono text-[13px]" style={{ color: 'var(--m20-muted)' }}>
                  COMMUNITY BOARD IS EMPTY
                </p>
                <p className="m20-muted mx-auto mt-2 max-w-md text-[13px]">
                  Be the first to contribute. Submit a project you have built, or request
                  one you want guidance on.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('SHARE')}
                    className="m20-btn m20-btn-primary"
                  >
                    Share a project
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('REQUEST')}
                    className="m20-btn"
                  >
                    Request a project
                  </button>
                </div>
              </div>
            )}

            {showShared && visibleShared.map((p) => (
              <article key={p.id} className="m20-card m20-card-hover p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="m20-badge"
                        style={{
                          color: 'var(--m20-accent-ink)',
                          borderColor: 'var(--m20-accent)',
                        }}
                      >
                        Shared
                      </span>
                      <StatusBadge status={p.status} />
                    </div>
                    <h3
                      className="mt-2 text-[16px] leading-snug font-bold sm:text-[17px]"
                      style={{ color: 'var(--m20-ink)' }}
                    >
                      {p.title}
                    </h3>
                  </div>
                  <span className="m20-mono m20-muted shrink-0 text-[10.5px]">
                    {relativeTime(p.createdAt)}
                  </span>
                </div>

                <p className="m20-muted mt-2.5 text-[13.5px] leading-relaxed">
                  {p.description}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <LevelBadge level={p.difficulty} />
                  <span className="m20-badge" style={{ color: 'var(--m20-ink-soft)', borderColor: 'var(--m20-line)' }}>
                    {p.branch}
                  </span>
                  <span className="m20-badge" style={{ color: 'var(--m20-muted)', borderColor: 'var(--m20-line)' }}>
                    {p.category}
                  </span>
                  <span className="m20-badge" style={{ color: 'var(--m20-muted)', borderColor: 'var(--m20-line)' }}>
                    {p.duration}
                  </span>
                  <span className="m20-badge" style={{ color: 'var(--m20-muted)', borderColor: 'var(--m20-line)' }}>
                    {p.estimatedCost}
                  </span>
                </div>

                {p.techStack.length > 0 && (
                  <div className="mt-3">
                    <p className="m20-label mb-1.5">Tech Stack</p>
                    <div className="flex flex-wrap gap-1.5">
                      {p.techStack.map((t) => (
                        <span
                          key={t}
                          className="m20-mono rounded-[2px] px-1.5 py-0.5 text-[10.5px]"
                          style={{
                            color: 'var(--m20-accent-ink)',
                            backgroundColor: 'var(--m20-accent-soft)',
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {p.resourceLinks.length > 0 && (
                  <div className="mt-3.5">
                    <p className="m20-label mb-1.5">Resources</p>
                    <div className="flex flex-wrap gap-2">
                      {p.resourceLinks.map((l, i) => (
                        <a
                          key={i}
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="m20-btn m20-btn-sm"
                          title={l.url}
                        >
                          <span aria-hidden="true">{linkTypeIcon(l.type)}</span>
                          {l.label}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-3"
                  style={{ borderColor: 'var(--m20-line-soft)' }}
                >
                  <p className="text-[12.5px] font-semibold" style={{ color: 'var(--m20-ink-soft)' }}>
                    {p.authorName}
                  </p>
                  <p className="m20-muted text-[12px]">{p.authorEmail}</p>
                  {p.authorBio && (
                    <p className="m20-muted text-[12px] italic">{p.authorBio}</p>
                  )}
                  <p className="m20-mono m20-muted ml-auto text-[10.5px]">
                    posted {formatDateTime(p.createdAt)}
                  </p>
                </div>
              </article>
            ))}

            {showRequests && visibleRequests.map((r) => (
              <article
                key={r.id}
                className="m20-card p-4 sm:p-5"
                style={{ backgroundColor: 'var(--m20-panel-alt)' }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="m20-badge"
                        style={{
                          color: 'var(--m20-warn)',
                          borderColor: 'var(--m20-warn)',
                        }}
                      >
                        Request
                      </span>
                      <StatusBadge status={r.status} />
                    </div>
                    <h3
                      className="mt-2 text-[16px] leading-snug font-bold"
                      style={{ color: 'var(--m20-ink)' }}
                    >
                      {r.title}
                    </h3>
                  </div>
                  <span className="m20-mono m20-muted shrink-0 text-[10.5px]">
                    {relativeTime(r.createdAt)}
                  </span>
                </div>

                <p className="m20-muted mt-2.5 text-[13.5px] leading-relaxed">
                  {r.description}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="m20-badge" style={{ color: 'var(--m20-ink-soft)', borderColor: 'var(--m20-line)' }}>
                    {r.branch}
                  </span>
                  <span className="m20-badge" style={{ color: 'var(--m20-muted)', borderColor: 'var(--m20-line)' }}>
                    {r.category}
                  </span>
                  <span className="m20-badge" style={{ color: 'var(--m20-muted)', borderColor: 'var(--m20-line)' }}>
                    {r.experience}
                  </span>
                  <span className="m20-badge" style={{ color: 'var(--m20-muted)', borderColor: 'var(--m20-line)' }}>
                    {r.timeline}
                  </span>
                  <span className="m20-badge" style={{ color: 'var(--m20-muted)', borderColor: 'var(--m20-line)' }}>
                    {r.budget}
                  </span>
                </div>

                <div
                  className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-3"
                  style={{ borderColor: 'var(--m20-line)' }}
                >
                  <p className="text-[12.5px] font-semibold" style={{ color: 'var(--m20-ink-soft)' }}>
                    {r.name}
                  </p>
                  <p className="m20-muted text-[12px]">{r.email}</p>
                  <p className="m20-mono m20-muted ml-auto text-[10.5px]">
                    requested {formatDateTime(r.createdAt)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* sidebar */}
        <aside className="space-y-4">
          <div className="m20-card p-4">
            <p className="m20-label mb-3">Catalogue Coverage by Branch</p>
            <div className="space-y-2.5">
              {branchCoverage.map((b) => (
                <div key={b.branch}>
                  <div className="flex items-center justify-between">
                    <span className="text-[12.5px]" style={{ color: 'var(--m20-ink-soft)' }}>
                      {b.branch}
                    </span>
                    <span
                      className="m20-mono text-[11px]"
                      style={{ color: 'var(--m20-accent-ink)' }}
                    >
                      {b.count}
                    </span>
                  </div>
                  <div
                    className="mt-1 h-1.5 w-full overflow-hidden"
                    style={{ backgroundColor: 'var(--m20-panel-alt)' }}
                  >
                    <div
                      className="h-full"
                      style={{
                        width: `${b.pct}%`,
                        backgroundColor: 'var(--m20-accent)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="m20-card p-4">
            <p className="m20-label mb-3">Review Queue</p>
            <div className="space-y-2">
              <div
                className="flex items-center justify-between border-b pb-2"
                style={{ borderColor: 'var(--m20-line-soft)' }}
              >
                <span className="text-[12.5px]" style={{ color: 'var(--m20-ink-soft)' }}>
                  Requests awaiting review
                </span>
                <span
                  className="m20-mono text-[14px] font-bold"
                  style={{ color: 'var(--m20-warn)' }}
                >
                  {requests.filter((r) => r.status === 'pending').length}
                </span>
              </div>
              <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--m20-line-soft)' }}>
                <span className="text-[12.5px]" style={{ color: 'var(--m20-ink-soft)' }}>
                  Submissions pending
                </span>
                <span
                  className="m20-mono text-[14px] font-bold"
                  style={{ color: 'var(--m20-warn)' }}
                >
                  {pending.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12.5px]" style={{ color: 'var(--m20-ink-soft)' }}>
                  Approved for the board
                </span>
                <span
                  className="m20-mono text-[14px] font-bold"
                  style={{ color: 'var(--m20-ok)' }}
                >
                  {approved.length}
                </span>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => onNavigate('SHARE')}
                className="m20-btn m20-btn-primary w-full"
              >
                Share a project
              </button>
              <button
                type="button"
                onClick={() => onNavigate('REQUEST')}
                className="m20-btn w-full"
              >
                Request a project
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
